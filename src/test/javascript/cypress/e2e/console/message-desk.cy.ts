// e2e-fixture: mutating
// Marks threads read, sends a reply, marks the whole desk read, and raises a Task from a thread.
// Nothing is restored. The task is the one with reach beyond this file: `task-board.cy.ts` counts
// the cards on the board, and Cypress runs specs alphabetically, so a single pass over both files
// sees a board this file added to. `e2e.yml`'s mutating dispatch runs one spec per stack for that
// reason.
//
// EVERY FIGURE BELOW IS DERIVED FROM THE ENDPOINT THE SCREEN READS. It was not, until 2026-09-06:
// five of the nine cases asserted literals copied from a fixture that had since grown — 12 rows where
// the desk shows a page of 20, 4 high-priority where there are 14, 2 low where there are 12, one
// search hit where there are 5 — and failed on their first run against a real backend (backlog item
// 34(b)). They are not fixed by substituting today's numbers, which would be the same defect one
// turn later; the rule is `dashboard.cy.ts`'s and the api's `PaginationIT`'s: read what the screen
// reads, and assert the screen agrees with it.
//
// DERIVING ALSO MAKES THIS FILE SAFE UNDER `retries: 2`, WHICH IT WAS NOT. A self-mutating case that
// asserts a literal passes on attempt 1, mutates, then fails attempts 2 and 3 on the literal — and
// Mocha reports the LAST attempt, so the log names a count that was correct the first time it was
// checked. That is what made item 34(b)'s table say "3 unread, actually 2" about a case whose real
// defect was four lines further down. Each case here re-reads the endpoint after the previous ones
// have run, so a retry measures the state it actually starts from.

import { ADMIN_API } from '../../support/console';

/**
 * The page size the desk asks for.
 *
 * <p>`ITEMS_PER_PAGE` in `app/config/pagination.constants.ts`, duplicated because the cypress
 * `tsconfig.json` resets `baseUrl` and the `app/…` alias does not resolve from here — the same
 * forced duplication `support/console.ts` documents for `ConsoleRoleKey`. It is a page size and not
 * a fixture count: it changes only when that constant does, and every row count below is
 * `min(total, this)` rather than a number anybody typed.
 */
const DESK_PAGE_SIZE = 20;

/** The fields of a message this file reads. */
interface DeskRow {
  id: string;
  subject: string;
  status: string;
}

/**
 * The page of messages the desk is showing, and the size of the collection behind it.
 *
 * <p>Same query `MessageDesk.queryMessages()` builds — page 0, `DESK_PAGE_SIZE`, `sentAt,desc`, plus
 * whatever filter the case is about — so the rows come back in the order the table renders them and
 * an index here is a row index there. `X-Total-Count` is what the tiles and the pager read.
 */
const deskPage = (filter = ''): Cypress.Chainable<{ total: number; rows: DeskRow[] }> =>
  cy.window({ log: false }).then(win => {
    const key = Cypress.expose('jwtStorageName');
    const stored = win.sessionStorage.getItem(key) ?? win.localStorage.getItem(key);
    return cy
      .request<DeskRow[]>({
        url: `${ADMIN_API}/messages?page=0&size=${DESK_PAGE_SIZE}&sort=sentAt,desc${filter}`,
        headers: { Authorization: `Bearer ${JSON.parse(stored!) as string}` },
      })
      .then(response => ({ total: Number(response.headers['x-total-count']), rows: response.body }));
  });

/** The row a message occupies, addressed by the link the template builds from its id. */
const rowFor = (id: string): Cypress.Chainable<JQuery<HTMLElement>> =>
  cy.get(`[data-cy="messageTable"] tbody tr a[href="/message-desk/${id}"]`).closest('tr');

describe('message desk', () => {
  beforeEach(() => {
    cy.signInAs('ops');
    cy.visit('/message-desk');
  });

  it('should list the whole queue with its status counts', () => {
    // The table is a PAGE and the tiles are TOTALS, and asserting both is the point of the case: a
    // screen that put `rows.length` in the tiles would look right on a small fixture and misreport
    // the desk on a large one.
    deskPage().then(({ total, rows }) => {
      expect(rows.length, 'the desk asks for one page').to.equal(Math.min(total, DESK_PAGE_SIZE));
      cy.get('[data-cy="messageTable"] tbody tr').should('have.length', rows.length);
    });

    // The order is `MessageDesk.STATUSES`, which is what the template iterates.
    ['NEW', 'READ', 'REPLIED'].forEach((status, index) => {
      deskPage(`&status.equals=${status}`).then(({ total }) => {
        cy.get('.stat').eq(index).find('b').should('have.text', String(total));
      });
    });
  });

  it('should mark unread rows with a dot and a tint, not the tint alone', () => {
    deskPage().then(({ rows }) => {
      const unread = rows.filter(row => row.status === 'NEW').length;
      // The claim needs something unread to be visible at all; without this a fixture with nothing
      // NEW would satisfy the assertion below by having no rows to check.
      expect(unread, 'the first page still holds something unread').to.be.greaterThan(0);

      cy.get('tr.unread').should('have.length', unread);
      cy.get('tr.unread').first().find('.unread-dot').should('exist');
    });
  });

  it('should filter by priority through a chip', () => {
    deskPage('&priority.equals=HIGH').then(({ rows }) => {
      cy.contains('.chip', 'High').click();
      cy.get('[data-cy="messageTable"] tbody tr').should('have.length', rows.length);
      cy.get('.chip--applied').should('exist');
    });
  });

  it('should clear an applied filter', () => {
    deskPage('&priority.equals=LOW').then(({ rows }) => {
      cy.contains('.chip', 'Low').click();
      cy.get('[data-cy="messageTable"] tbody tr').should('have.length', rows.length);
    });

    cy.contains('button', 'Clear filters').click();
    deskPage().then(({ rows }) => {
      cy.get('[data-cy="messageTable"] tbody tr').should('have.length', rows.length);
    });
  });

  it('should search, debounced', () => {
    // `roster` is a term, not a count: the desk sends it as `subject.contains` and the number of
    // hits comes back from the same call the screen makes.
    deskPage('&subject.contains=roster').then(({ rows }) => {
      expect(rows.length, 'the fixture still has something to find').to.be.greaterThan(0);

      cy.get('input[type="search"]').type('roster');
      cy.get('[data-cy="messageTable"] tbody tr').should('have.length', rows.length);
      cy.get('[data-cy="messageTable"] tbody tr').first().should('contain.text', rows[0].subject);
    });
  });

  it('should open a thread and mark it read', () => {
    deskPage().then(({ rows }) => {
      const unread = rows.filter(row => row.status === 'NEW').length;
      expect(unread, 'something on the first page is still unread').to.be.greaterThan(0);
      const target = rows.find(row => row.status === 'NEW')!;

      cy.get('tr.unread').should('have.length', unread);
      rowFor(target.id).contains('Open').click();

      cy.location('pathname').should('eq', `/message-desk/${target.id}`);
      cy.contains(target.subject).should('be.visible');

      // BACK IS THE TOPBAR LINK, NOT A LINK ON THIS SCREEN. This case clicked
      // `cy.contains('a', 'Back to the desk')`, and there has been no such link since 2026-08-22,
      // when `shared/navigation/back-link.ts` replaced forty-five hand-written back links with one
      // rendered in the topbar — `message-thread`'s being the only one that had ever existed. The
      // orphaned `messageDesk.thread.back` string outlived the element it labelled and has gone with
      // it. Addressing the link by `data-cy` rather than by its text also keeps this case out of the
      // business of knowing which sidebar label `parentOf()` interpolated into it.
      cy.get('[data-cy="backLink"]').click();
      cy.location('pathname').should('eq', '/message-desk');
      cy.get('tr.unread').should('have.length', unread - 1);
    });
  });

  it('should raise a linked task and route to the board', () => {
    deskPage().then(({ rows }) => {
      const target = rows[0];

      rowFor(target.id).contains('Open').click();
      cy.contains('button', 'Raise a task').click();

      cy.location('pathname').should('eq', '/task-board');
      // `MessageThread.raiseTask()` titles it `Follow up: <subject>`, so the expectation is the
      // subject the endpoint gave plus the prefix the component adds — neither is transcribed.
      cy.contains(`Follow up: ${target.subject}`).should('be.visible');
    });
  });

  it('should mark the whole desk read', () => {
    // Zero is a property of the action, not a copy of the fixture — but it is zero for the LOADED
    // PAGE only: `markAllRead()` patches `messages()`, which is one page, so an unread message on
    // page 2 survives it. Asserting the NEW tile instead would fail for that reason and would read
    // as a broken button.
    cy.contains('button', 'Mark all read').click();
    cy.get('tr.unread').should('have.length', 0);
  });

  it('should flip a thread to replied when a reply is sent', () => {
    // THIS ONE IS NOT A STALE LITERAL, AND THE ENTRY THAT SAID SO WAS WRONG. Item 34(b)'s table
    // recorded "a reply returns to /message-desk / the thread stays open / stale expectation". The
    // expectation is correct: the console does navigate. It took SIXTY SECONDS, because
    // `MessageService.send` publishes its event on the request thread and Spring Cloud Stream
    // provisions the dynamic destination's topic against a broker this stack deliberately does not
    // have — `KafkaTopicProvisioner` blocking on an AdminClient future bounded by
    // `default.api.timeout.ms`, 60000 by default. Measured 60.6s for the first send and 0.015s for
    // every one after it, so retrying could not see it either.
    //
    // Fixed where it belongs, in `deploy/e2e/compose.yml`: both applications now bound that client
    // at 2000ms, which makes the first send 2.57s. Nothing here waits longer than Cypress's default
    // four seconds, and the assertion is the one this case always made.
    deskPage().then(({ rows }) => {
      // Whichever thread is at the top. Which one that is depends on what the cases above did, and
      // the claim the case makes is about any of them.
      const target = rows[0];

      rowFor(target.id).contains('Open').click();
      cy.get('#abf-reply').type('The difference is 360 cedis a month and it starts on the first.');
      cy.contains('button', 'Send reply').click();

      cy.location('pathname').should('eq', '/message-desk');
      // Addressed by id, not by subject: the reply this just sent is `Re: <subject>` and sorts above
      // its parent, so a `contains` on the subject would match the reply's own row and would pass
      // whatever the parent's status is.
      rowFor(target.id).find('.pill').should('contain.text', 'Replied');
    });
  });
});
