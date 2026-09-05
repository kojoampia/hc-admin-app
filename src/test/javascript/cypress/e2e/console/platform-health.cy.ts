// e2e-fixture: read-only
// Reads the seeded service catalogue. It does not probe.

describe('platform health', () => {
  beforeEach(() => {
    cy.signInAs('ops');
    cy.visit('/platform-health');
  });

  it('should map all thirteen services with one degraded', () => {
    cy.contains('.stat', 'Services healthy').should('contain.text', '12/13');
    cy.contains('.stat', 'Degraded').should('contain.text', '1');
    cy.get('.svc').should('have.length', 13);
  });

  it('should group the services into planes', () => {
    cy.get('.plane-title').should('have.length.greaterThan', 3);
    cy.contains('.plane-title', 'Admin').should('exist');
    cy.contains('.plane-title', 'Patient').should('exist');
  });

  it('should show the port and host of each service', () => {
    cy.contains('.svc', 'Admin Gateway').should('contain.text', '5504').should('contain.text', 'hc-admin-gateway');
  });

  it('should name the degraded service in text, not by colour alone', () => {
    cy.contains('.svc', 'hc-vendor-gw').should('contain.text', 'Degraded');
  });

  it('should be readable by every role', () => {
    cy.signInAs('sup');
    cy.visit('/platform-health');
    cy.get('.svc').should('have.length', 13);
  });
});
