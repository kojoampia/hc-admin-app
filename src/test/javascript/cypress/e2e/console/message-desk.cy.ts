describe('message desk', () => {
  beforeEach(() => {
    cy.signInAs('ops');
    cy.visit('/message-desk');
  });

  it('should list the whole queue with its status counts', () => {
    cy.get('[data-cy="messageTable"] tbody tr').should('have.length', 12);
    // 3 new, 3 read, 6 replied.
    cy.get('.stat').eq(0).should('contain.text', '3');
    cy.get('.stat').eq(2).should('contain.text', '6');
  });

  it('should mark unread rows with a dot and a tint, not the tint alone', () => {
    cy.get('tr.unread').should('have.length', 3);
    cy.get('tr.unread').first().find('.unread-dot').should('exist');
  });

  it('should filter by priority through a chip', () => {
    cy.contains('.chip', 'High').click();
    cy.get('[data-cy="messageTable"] tbody tr').should('have.length', 4);
    cy.get('.chip--applied').should('exist');
  });

  it('should clear an applied filter', () => {
    cy.contains('.chip', 'Low').click();
    cy.get('[data-cy="messageTable"] tbody tr').should('have.length', 2);

    cy.contains('button', 'Clear filters').click();
    cy.get('[data-cy="messageTable"] tbody tr').should('have.length', 12);
  });

  it('should search, debounced', () => {
    cy.get('input[type="search"]').type('roster');
    cy.get('[data-cy="messageTable"] tbody tr').should('have.length', 1);
    cy.get('[data-cy="messageTable"] tbody tr').should('contain.text', 'Duty roster clash');
  });

  // The mock database lives in the page, so a full reload reseeds it. These
  // two navigate in-app (Back to the desk / the Open link) rather than
  // cy.visit, which would throw the change away before asserting on it.
  it('should open a thread and mark it read', () => {
    cy.get('tr.unread').should('have.length', 3);
    cy.get('[data-cy="messageTable"] tbody tr').first().contains('Open').click();

    cy.location('pathname').should('match', /\/message-desk\/\d+$/);
    cy.contains('Home visit rescheduling request').should('be.visible');

    cy.contains('a', 'Back to the desk').click();
    cy.get('tr.unread').should('have.length', 2);
  });

  it('should flip a thread to replied when a reply is sent', () => {
    cy.contains('td', 'Service plan upgrade').parent().contains('Open').click();
    cy.get('#abf-reply').type('The difference is 360 cedis a month and it starts on the first.');
    cy.contains('button', 'Send reply').click();

    cy.location('pathname').should('eq', '/message-desk');
    cy.contains('td', 'Service plan upgrade').parent().find('.pill').should('contain.text', 'Replied');
  });

  it('should raise a linked task and route to the board', () => {
    cy.contains('td', 'Lab report not visible').parent().contains('Open').click();
    cy.contains('button', 'Raise a task').click();

    cy.location('pathname').should('eq', '/task-board');
    cy.contains('Follow up: Lab report not visible in my record').should('be.visible');
  });

  it('should mark the whole desk read', () => {
    cy.contains('button', 'Mark all read').click();
    cy.get('tr.unread').should('have.length', 0);
  });
});
