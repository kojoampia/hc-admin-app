// e2e-fixture: read-only
// Reads the seeded service catalogue. It does not probe.
//
// 13, 12/13 and 1 are seed literals, kept rather than derived, and this is the one screen in the
// folder where that is not even a trade. The screen IS the `platformServices` collection rendered —
// 13 documents, 12 `HEALTHY` and one `DEGRADED`, accurate as of 2026-09-05 — so deriving the numbers
// from that collection would assert the screen agrees with the thing it is a rendering of, which is
// true of a correct screen and equally true of an empty one. What the literals pin is that the
// catalogue reached the browser at all, and that the degraded service is stated in TEXT rather than
// by colour alone. Expect them to go red when the fixture changes; that is the coupling working, not
// the `116` failure, where a number from a deleted mock guarded nothing.

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
