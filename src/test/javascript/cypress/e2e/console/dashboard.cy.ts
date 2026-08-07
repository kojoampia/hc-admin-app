describe('dashboard', () => {
  beforeEach(() => {
    cy.signInAs('ops');
    cy.visit('/dashboard');
  });

  it('should greet with the live figures rather than fixed copy', () => {
    cy.get('.hero').should('contain.text', 'Good morning Efua');
    cy.get('.hero').should('contain.text', '3 messages');
    cy.get('.hero').should('contain.text', '80%');
  });

  it('should report network totals, not the size of the loaded extract', () => {
    cy.get('.stat').eq(0).should('contain.text', '116');
    cy.get('.stat').eq(1).should('contain.text', '24');
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

  it('should list the accounts waiting for approval', () => {
    // Two patients, two professionals and one vendor are PENDING.
    cy.get('[data-cy="approvals"]').find('.lrow').should('have.length', 5);
    cy.get('[data-cy="approvals"]').should('contain.text', 'Beatrice Sarsah');
  });

  it('should link a desk row through to its thread', () => {
    cy.get('[data-cy="latestMessages"]').find('.lrow').should('have.length', 4);
    cy.get('[data-cy="latestMessages"]').find('.lrow').first().click();
    cy.location('pathname').should('match', /\/message-desk\/\d+$/);
  });
});
