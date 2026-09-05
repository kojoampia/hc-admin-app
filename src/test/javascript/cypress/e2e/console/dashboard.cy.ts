// e2e-fixture: read-only
// Reads the screen and the endpoint behind it; every click navigates.

/**
 * Read the figures the screen is supposed to be showing, straight from the endpoint it reads.
 *
 * <p>The two cases below asserted the literals `116`, `24` and `80%` until 2026-09-02. Those came
 * from the in-browser mock deleted on 2026-08-08 — this file was last touched the day before that —
 * and against a real backend the seeded network holds 12 patients, so both cases failed. They were
 * found on the quality stack rather than by CI, because Cypress runs in neither workflow.
 *
 * <p>**They are not fixed by substituting today's numbers.** A literal here is a copy of the seed
 * fixture, and the fixture moves — it went from 215 records to 1189 to 1199 over three weeks, and
 * nothing reports that a spec has drifted from it. Deriving the expectation from the endpoint is
 * what makes these cases survive the next fixture change, and it is the same rule the api applies to
 * `PaginationIT` (discover the paths, never enumerate them).
 *
 * <p>What is deliberately still asserted by hand is the *relationship* — `network` differing from
 * `loaded` — because that is the claim the second case's title makes and no fixture can supply it.
 */
import { ADMIN_API } from '../../support/console';

interface DashboardFigures {
  network: { patients: number; professionals: number; vendors: number };
  loaded: { patients: number; professionals: number; vendors: number };
  unreadMessages: number;
  roster: { coverPercent: number };
}

/** The fields of a message this file needs. `status` is the one that decides where it may click. */
interface DeskRow {
  id: string;
  status: string;
}

/**
 * A typed GET against the admin service, with the signed-in user's token.
 *
 * <p>`.request<T>()` rather than `cy.adminApi` or `.its('body')` — both are `any`, and an `any` here
 * would silently un-type every assertion below, which is the opposite of the point.
 */
const adminGet = <T>(path: string): Cypress.Chainable<T> =>
  cy.window().then(win => {
    const stored =
      win.sessionStorage.getItem(Cypress.expose('jwtStorageName')) ?? win.localStorage.getItem(Cypress.expose('jwtStorageName'));
    return cy
      .request<T>({ url: `${ADMIN_API}${path}`, headers: { Authorization: `Bearer ${JSON.parse(stored!) as string}` } })
      .then(response => response.body);
  });

const metrics = (): Cypress.Chainable<DashboardFigures> => adminGet<DashboardFigures>('/dashboard/metrics');

describe('dashboard', () => {
  beforeEach(() => {
    cy.signInAs('ops');
    cy.visit('/dashboard');
  });

  it('should greet with the live figures rather than fixed copy', () => {
    cy.get('.hero').should('contain.text', 'Good morning Efua');

    // The hero interpolates `unreadMessages` and `roster.coverPercent` into one translated
    // sentence, so read both from the endpoint and require the rendered copy to carry them. The
    // old form asserted "3 messages" and "80%" — the second was the number the *mock* served, and
    // the real roster covers 100%.
    metrics().then(m => {
      cy.get('.hero').should('contain.text', `${m.unreadMessages}`);
      cy.get('.hero').should('contain.text', `${m.roster.coverPercent}%`);
    });
  });

  it('should report network totals, not the size of the loaded extract', () => {
    metrics().then(m => {
      // The claim in the title: these tiles show the whole network, not how many rows the
      // directories happen to hold. Assert the difference is real before asserting the values,
      // because if the fixture ever made them equal both tiles would pass while showing the wrong
      // figure — which is precisely the bug this case was written for.
      expect(m.network.patients, 'the fixture still distinguishes network from loaded').to.be.greaterThan(m.loaded.patients);

      cy.get('.stat').eq(0).should('contain.text', `${m.network.patients}`);
      cy.get('.stat').eq(1).should('contain.text', `${m.network.professionals}`);
    });
  });

  it('should give every KPI tile a sparkline', () => {
    cy.get('.stat').should('have.length', 4);
    cy.get('abf-sparkline canvas').should('have.length', 4);
  });

  it('should navigate from a KPI tile to its module', () => {
    cy.get('.stat').eq(2).click();
    cy.location('pathname').should('eq', '/message-desk');
  });

  it('should render three charts, each with a working table view', () => {
    cy.get('abf-chart-card').should('have.length', 3);

    cy.get('abf-chart-card').each($card => {
      cy.wrap($card).find('.viz-toggle button').contains('Table').click();
      cy.wrap($card).find('table.viz-tbl').should('be.visible');

      cy.wrap($card).find('.viz-toggle button').contains('Chart').click();
      cy.wrap($card).find('svg.viz-figure').should('exist');
    });
  });

  /**
   * **Two literals, kept on purpose, against this file's own header.**
   *
   * <p>The header says a literal here is a copy of the seed fixture and that the fixture moves. Both
   * of these are still literals, and the reason is that neither claim can be derived from the
   * endpoint without becoming a tautology:
   *
   * <ul>
   *   <li>`5` is the count the card is capped at (`APPROVAL_ROWS` in `dashboard.ts`) as well as the
   *       number of PENDING accounts the seed holds. Reading the count from the endpoint and
   *       asserting the screen shows it would pass against a card that renders every row it is given
   *       and against one that renders none, since an empty list matches an empty query. What is
   *       being pinned is that the cap and the fixture are on either side of each other — five rows
   *       with more behind them — which is a property of the pair, not of either.
   *   <li>`'Beatrice Sarsah'` proves the row renders a PERSON and not an id, which is the whole
   *       failure `record-label.pipe.ts` exists for. A derived expectation would read the same field
   *       the template reads and pass whatever it contained, including a UUID.
   * </ul>
   *
   * <p>So: if the seed's PENDING accounts change, this case is expected to go red and be updated. It
   * is a deliberate coupling to the fixture, which is a different thing from `116` — a number copied
   * from a mock that had been deleted, guarding nothing, that no change to the fixture could ever
   * have corrected.
   */
  it('should list the accounts waiting for approval', () => {
    // Two patients, two professionals and one vendor are PENDING.
    cy.get('[data-cy="approvals"]').find('.lrow').should('have.length', 5);
    cy.get('[data-cy="approvals"]').should('contain.text', 'Beatrice Sarsah');
  });

  /**
   * **Which row is clicked is derived, and it is what keeps this file in the `read-only` set.**
   *
   * <p>This clicked `.first()` until 2026-09-05, and `.first()` is a write. `message-thread.ts`
   * calls `setStatus('READ', false)` on load whenever the thread it opened is `NEW` — a PATCH the
   * api stamps `readAt` for in `MessageLifecycleCallback`. The card is loaded with
   * `size: 4, sort: sentAt,desc` and **no status filter** (`dashboard.ts`), and the three newest
   * seeded messages are the three that are `NEW`, so the first row was `m1` on every pristine
   * stack. The chain is fully determined rather than timing-dependent: every run of this
   * "read-only" spec dropped the seeded unread count from 3 to 2, permanently, for every later
   * reader of that database — the dashboard's own unread tile included, and quality's included.
   * Nothing here could see it, because every assertion in this file derives.
   *
   * <p>A literal `.eq(3)` would be correct today — `m4` is `READ` — and silently wrong the next
   * time the fixture moves, which is the exact failure this file's header is about. So the row is
   * chosen by asking the endpoint which of the four the console will not write to, and the case
   * fails rather than writes if none of them qualifies.
   *
   * <p>The status is re-read afterwards. That is not tidying: it is the inversion kept in place, so
   * that a future change which makes this file write again fails here instead of moving a tile on
   * somebody else's stack three weeks later.
   */
  it('should link a desk row through to its thread', () => {
    cy.get('[data-cy="latestMessages"]').find('.lrow').should('have.length', 4);

    // The same query the card is loaded with, so index N here is the Nth `.lrow` on the screen.
    adminGet<DeskRow[]>('/messages?page=0&size=4&sort=sentAt,desc').then(rows => {
      const index = rows.findIndex(row => row.status !== 'NEW');
      expect(index, 'one of the four newest messages has already been read, so opening it writes nothing').to.be.at.least(0);
      const row = rows[index];

      cy.get('[data-cy="latestMessages"]').find('.lrow').eq(index).click();
      cy.location('pathname').should('eq', `/message-desk/${row.id}`);
      // Wait for the thread to have LOADED, not merely for the URL to change. The write this guards
      // against is issued from the subscription that renders this, so reading the status back before
      // the screen exists would prove nothing and always pass.
      cy.get('.thread-grid').should('be.visible');

      adminGet<DeskRow>(`/messages/${row.id}`).then(after => {
        expect(after.status, 'opening the thread left its status alone — this file writes nothing').to.eq(row.status);
      });
    });
  });
});
