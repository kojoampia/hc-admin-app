import { quickAddSelector, sidebarSelector } from '../../support/console';

describe('organisation profile', () => {
  beforeEach(() => {
    cy.signInAs('ops');
    cy.visit('/organisation-profile');
  });

  it('should show all five tabs', () => {
    cy.get('[role="tab"]').should('have.length', 5);
    cy.contains('[role="tab"]', 'About').should('have.attr', 'aria-selected', 'true');
  });

  it('should show the organisation record on the About tab', () => {
    cy.contains('Abofonsa BridgeCare Ltd.').should('be.visible');
    cy.contains('CS-2019-0884417').should('be.visible');
    cy.contains('operations@abofonsa.care').should('be.visible');
  });

  it('should show the registered digital address', () => {
    cy.contains('[role="tab"]', 'Address').click();
    cy.contains('GA-184-7723').should('be.visible');
  });

  it('should list the teams with a named supervisor', () => {
    cy.contains('[role="tab"]', 'Team & roles').click();
    cy.get('table tbody tr').should('have.length', 4);
    cy.contains('Clinical review').should('be.visible');
    cy.get('table tbody tr').first().should('not.contain.text', 'MDC/');
  });

  it('should show the seeded audit trail', () => {
    cy.contains('[role="tab"]', 'Audit trail').click();
    cy.get('table tbody tr').should('have.length', 7);
    cy.contains('rotated API credential').should('be.visible');
  });

  it('should re-render authority-gated controls when the role is switched', () => {
    cy.get(quickAddSelector).should('exist');

    cy.contains('[role="tab"]', 'Security').click();
    cy.contains('.opt', 'Supervisor (read only)').click();

    cy.get(sidebarSelector).contains('Supervisor');
    cy.get(quickAddSelector).should('not.exist');

    // And the change survives a reload, because the token really was reissued.
    cy.visit('/duty-roster');
    cy.get('.cell:not([disabled])').should('have.length', 0);
  });
});
