// e2e-fixture: mutating
// Moves a card to Done and creates a task. Nothing is restored, and the created task is counted by
// this file's own first case on any later run.
//
// ⚠ THIS FILE IS CURRENTLY RED, AND NOT BECAUSE OF THE ABOVE — backlog item 32. Its first run against
// a real backend, on 2026-09-05, failed two of seven cases: the columns hold 5/4/25 rather than the
// 5/4/4 asserted below (34 tasks are seeded), and moving a card leaves the first column at 2 rather
// than 4. The literals are a copy of a fixture that moved and nothing could see it, which is item
// 15's whole subject; deriving them from the endpoint is filed rather than done here.

describe('task board', () => {
  beforeEach(() => {
    cy.signInAs('ops');
    cy.visit('/task-board');
  });

  it('should show three columns holding the seeded work', () => {
    cy.get('[data-cy="taskColumn"]').should('have.length', 3);
    cy.get('[data-cy="taskColumn"]').eq(0).find('.kcard').should('have.length', 5);
    cy.get('[data-cy="taskColumn"]').eq(1).find('.kcard').should('have.length', 4);
    cy.get('[data-cy="taskColumn"]').eq(2).find('.kcard').should('have.length', 4);
  });

  it('should show the owner by name, not by licence number', () => {
    cy.get('.kcard').first().should('contain.text', 'Owusu');
    cy.get('.kcard').first().should('not.contain.text', 'NMC/');
  });

  it('should filter by owner name', () => {
    cy.get('input[type="search"]').type('Boateng');
    cy.get('.kcard').should('have.length.greaterThan', 0);
    cy.get('.kcard').each($card => {
      cy.wrap($card).should('contain.text', 'Boateng');
    });
  });

  it('should open a card and move its state', () => {
    cy.get('[data-cy="taskColumn"]').eq(0).find('.kcard').first().click();
    cy.get('.modal-title').should('be.visible');

    cy.get('.seg button').contains('Done').click();
    cy.get('[data-cy="taskColumn"]').eq(0).find('.kcard').should('have.length', 4);
    cy.get('[data-cy="taskColumn"]').eq(2).find('.kcard').should('have.length', 5);
  });

  it('should require a title on a new task', () => {
    cy.contains('button', 'New task').click();
    cy.contains('button', 'Save').click();
    cy.contains('A title is required').should('be.visible');
  });

  it('should create a task', () => {
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
