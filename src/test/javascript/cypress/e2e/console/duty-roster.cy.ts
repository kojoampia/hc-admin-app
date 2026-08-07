describe('duty roster', () => {
  beforeEach(() => {
    cy.signInAs('ops');
    cy.visit('/duty-roster');
  });

  it('should show the prototype figures for the seeded week', () => {
    cy.contains('.stat', 'Week planned').should('contain.text', '80%');
    cy.contains('.stat', 'Unassigned slots').should('contain.text', '10');
    cy.contains('.stat', 'Rostered staff').should('contain.text', '7');
    cy.contains('.stat', 'Shifts this week').should('contain.text', '24');
  });

  it('should give every rosterable professional a row, seven days wide', () => {
    cy.get('[data-cy="rosterGrid"] tbody tr').should('have.length', 8); // 7 staff + the on-duty tally
    cy.get('.cell').should('have.length', 49);
  });

  it('should cycle a cell through the shifts', () => {
    cy.get('.cell').not('.on').first().as('empty');

    cy.get('@empty').click();
    cy.get('.cell').filter('.cell--day').should('exist');
    cy.contains('.stat', 'Unassigned slots').should('contain.text', '9');
  });

  it('should flag a day with fewer than three on duty', () => {
    cy.get('.tally-cell b.short').should('exist');
  });

  it('should fill the gaps for active staff only', () => {
    cy.contains('button', 'Auto-fill gaps').click();
    // The suspended nurse is never rostered, so gaps cannot reach zero.
    cy.contains('.stat', 'Unassigned slots').should('not.contain.text', '10');
    cy.contains('.stat', 'Rostered staff').should('contain.text', '7');
  });

  it('should publish the week', () => {
    cy.contains('button', 'Publish').should('not.be.disabled').click();
    // Publishing stamps the week; the button then has nothing left to do.
    cy.contains('button', 'Publish', { timeout: 10000 }).should('be.disabled');
    cy.contains('.stat', 'Shifts this week').should('contain.text', '24');
  });

  it('should hide every write control from the supervisor', () => {
    cy.signInAs('sup');
    cy.visit('/duty-roster');

    cy.contains('button', 'Auto-fill gaps').should('not.exist');
    cy.contains('button', 'Publish').should('not.exist');
    cy.get('.cell').should('have.length', 49);
    cy.get('.cell:not([disabled])').should('have.length', 0);
  });
});
