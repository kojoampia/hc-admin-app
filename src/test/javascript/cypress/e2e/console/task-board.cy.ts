// e2e-fixture: mutating
// Moves a card to Done and creates a task. Nothing is restored, and the created task is counted by
// this file's own first case on any later run.
//
// EVERY COLUMN COUNT BELOW IS DERIVED FROM THE ENDPOINT THE BOARD READS. It was not, until
// 2026-09-06: the first case asserted 5 / 4 / 4 where the seeded board holds 5 / 4 / 25, and the
// move case asserted the first column dropped to 4 where it drops to one less than whatever it was.
// Both are the fabricated-literal shape item 15 exists to catch, and substituting today's figures
// would reintroduce it on the next fixture change — 34 tasks are seeded today and 22 were seeded in
// August. The rule is `dashboard.cy.ts`'s: read what the screen reads.
//
// The move case is the one worth reading twice. `4` was not merely stale, it was UNCONDITIONAL: a
// board that already held four TODO cards would have satisfied it without the click doing anything.
// The assertion is now a RELATIONSHIP — one fewer here, one more there, measured either side of the
// same click — which cannot be satisfied by a card that did not move, and which is also what makes
// the case survive a retry against the state its own first attempt left.

import { ADMIN_API } from '../../support/console';

/**
 * The page the board asks for.
 *
 * <p>`BOARD_PAGE_SIZE` in `app/console/task-board/task-board.ts`, duplicated for the reason
 * `support/console.ts` records: the cypress `tsconfig.json` resets `baseUrl`, so the `app/…` alias
 * does not resolve from here. It is a page size, not a fixture count — the board loads one page big
 * enough to be the whole collection so that a card can change columns without a refetch, and reads
 * `X-Total-Count` to know when that stopped being true.
 */
const BOARD_PAGE_SIZE = 200;

/** The columns, in `TASK_COLUMNS` order, which is the order the board renders them. */
const TASK_COLUMNS = ['TODO', 'DOING', 'DONE'] as const;

/** The fields of a task this file reads. */
interface BoardCard {
  id: string;
  title: string;
  state: string;
  owner: { id?: string; licenceNumber?: string } | null;
}

/** The board's own query, so an index here is a card index there. */
const boardTasks = (): Cypress.Chainable<{ total: number; tasks: BoardCard[] }> =>
  cy.window({ log: false }).then(win => {
    const key = Cypress.expose('jwtStorageName');
    const stored = win.sessionStorage.getItem(key) ?? win.localStorage.getItem(key);
    return cy
      .request<BoardCard[]>({
        url: `${ADMIN_API}/tasks?page=0&size=${BOARD_PAGE_SIZE}&sort=dueOn,asc`,
        headers: { Authorization: `Bearer ${JSON.parse(stored!) as string}` },
      })
      .then(response => ({ total: Number(response.headers['x-total-count']), tasks: response.body }));
  });

/** How many of the loaded tasks are in a column, by the same rule `TaskBoard.board` applies. */
const countIn = (tasks: BoardCard[], column: number): number => tasks.filter(task => task.state === TASK_COLUMNS[column]).length;

describe('task board', () => {
  beforeEach(() => {
    cy.signInAs('ops');
    cy.visit('/task-board');
  });

  it('should show three columns holding the seeded work', () => {
    cy.get('[data-cy="taskColumn"]').should('have.length', TASK_COLUMNS.length);

    boardTasks().then(({ total, tasks }) => {
      // The board's own claim: one page holds everything, and the toolbar says so when it does not.
      // Without this the column counts below would agree with a truncated page and say nothing.
      expect(tasks.length, 'the board loads the whole collection in one page').to.equal(total);
      cy.get('[data-cy="boardTruncated"]').should('not.exist');

      TASK_COLUMNS.forEach((state, index) => {
        cy.get('[data-cy="taskColumn"]')
          .eq(index)
          .find('.kcard')
          .should('have.length', tasks.filter(task => task.state === state).length);
      });
    });
  });

  it('should show the owner by name, not by licence number', () => {
    // `Professional` has no name of its own — it lives on the related `Profile` — so the generated
    // relationship carries a licence number and `ProfessionalNamesService` resolves it. The negative
    // is what the case is named for and it is now derived: the licence number comes from the same
    // endpoint the board reads, rather than from the `NMC/` prefix one seeded professional happens
    // to use, which would pass against a board full of `CG/` and `AMB/` licences.
    boardTasks().then(({ tasks }) => {
      const first = tasks[0];
      expect(first.owner?.licenceNumber, 'the first card still has an owner with a licence').to.be.a('string');

      cy.get('.kcard')
        .first()
        .within(() => {
          cy.get('.mt .trunc')
            .should('not.contain.text', first.owner!.licenceNumber!)
            .invoke('text')
            .should(name => expect(name.trim(), 'and it is named by something').to.not.equal(''));
        });
    });
  });

  it('should filter by owner name', () => {
    // The term comes off the screen's own owner picker, which `TaskBoard.owners` builds from the
    // resolved names of the people actually holding a card — so this cannot be typing a name the
    // fixture no longer contains, and it is the same resolution path the cards render through.
    cy.get('[data-cy="ownerFilter"] option')
      .eq(1)
      .invoke('text')
      .then(fullName => {
        const surname = fullName.trim().split(/\s+/).pop()!;
        cy.get('input[type="search"]').type(surname);
        cy.get('.kcard').should('have.length.greaterThan', 0);
        cy.get('.kcard').each($card => {
          cy.wrap($card).should('contain.text', surname);
        });
      });
  });

  it('should open a card and move its state', () => {
    // Measured either side of the click rather than asserted against the fixture: the claim is that
    // ONE card moved from the first column to the last, and a literal on either end would be
    // satisfied by a board that was already in that shape.
    //
    // The before-counts come from the endpoint rather than from the DOM, and that is not a style
    // choice: a `.find('.kcard').length` taken the moment the route resolves reads ZERO, because the
    // board's query has not come back yet, and the case then asserts a column of -1 — which is how
    // the first draft of this failed. A count read from the same response the board renders cannot
    // be taken too early.
    boardTasks().then(({ tasks }) => {
      const todoBefore = countIn(tasks, 0);
      const doneBefore = countIn(tasks, 2);
      expect(todoBefore, 'there is a card in the first column to move').to.be.greaterThan(0);

      cy.get('[data-cy="taskColumn"]').eq(0).find('.kcard').should('have.length', todoBefore).first().click();
      cy.get('.modal-title').should('be.visible');

      cy.get('.seg button').contains('Done').click();
      cy.get('[data-cy="taskColumn"]')
        .eq(0)
        .find('.kcard')
        .should('have.length', todoBefore - 1);
      cy.get('[data-cy="taskColumn"]')
        .eq(2)
        .find('.kcard')
        .should('have.length', doneBefore + 1);
    });
  });

  it('should require a title on a new task', () => {
    cy.contains('button', 'New task').click();
    cy.contains('button', 'Save').click();
    cy.contains('A title is required').should('be.visible');
  });

  it('should create a task', () => {
    // A literal the case creates itself, which is the one kind that cannot go stale.
    cy.contains('button', 'New task').click();
    cy.get('#abf-task-title').type('Check the Kumasi delivery route');
    cy.get('#abf-task-tag').type('Vendors');
    cy.contains('button', 'Save').click();

    cy.contains('Check the Kumasi delivery route').should('be.visible');
  });

  it('should hide creation and state changes from the supervisor', () => {
    cy.signInAs('sup');
    cy.visit('/task-board');

    cy.contains('button', 'New task').should('not.exist');
    cy.get('.kcard').first().click();
    cy.get('.seg').should('not.exist');
  });
});
