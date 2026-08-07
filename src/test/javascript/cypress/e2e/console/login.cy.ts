import { CONSOLE_LOGINS, quickAddSelector, roleSelector, sidebarSelector } from '../../support/console';

/**
 * Note on cy.intercept: it cannot be used for `/api/**` here.
 *
 * The mock resolves those requests inside Angular's HttpClient, so nothing
 * reaches the network and there is no request for Cypress to observe. These
 * specs assert on what the app actually shows and stores instead.
 */
const decodeAuthorities = (token: string): string[] => {
  const payload = JSON.parse(atob(token.split('.')[1])) as { auth: string };
  return payload.auth.split(',');
};

describe('login', () => {
  it('should show the brand panel with the real network totals', () => {
    cy.visit('/login');
    // 116 / 24 / 9 come from the metrics endpoint, not from copy in the page.
    cy.contains('116').should('be.visible');
    cy.contains('24').should('be.visible');
    cy.contains('9').should('be.visible');
    cy.get('[data-cy="username"]').should('have.value', CONSOLE_LOGINS.ops);
  });

  it('should land the operations administrator on the dashboard with the full chrome', () => {
    cy.signInAs('ops');

    cy.get(sidebarSelector).should('be.visible');
    cy.get(sidebarSelector).contains('Operations');
    cy.get(quickAddSelector).should('exist');
    cy.contains('Admin dashboard').should('be.visible');
  });

  it('should land the supervisor read-only', () => {
    cy.signInAs('sup');

    cy.get(sidebarSelector).contains('Supervisor');
    // The quick-add is gated on ROLE_ADMIN.
    cy.get(quickAddSelector).should('not.exist');
  });

  it('should land the message desk officer', () => {
    cy.signInAs('desk');

    cy.get(sidebarSelector).contains('Message desk');
    cy.get(quickAddSelector).should('not.exist');
  });

  it('should issue a token whose authorities match the chosen role', () => {
    cy.signInAs('sup');

    cy.window().then(win => {
      const stored = win.sessionStorage.getItem('abf-authenticationToken') ?? win.localStorage.getItem('abf-authenticationToken');
      expect(stored, 'a token was stored').to.be.a('string');
      const authorities = decodeAuthorities(JSON.parse(stored!) as string);
      expect(authorities).to.include('ROLE_SUPERVISOR');
      expect(authorities).to.not.include('ROLE_ADMIN');
    });
  });

  it('should set the username from the role picker', () => {
    cy.visit('/login');
    cy.get(roleSelector).select('desk');
    cy.get('[data-cy="username"]').should('have.value', CONSOLE_LOGINS.desk);
  });

  it('should send a signed-out visitor to the login screen', () => {
    cy.visit('/dashboard');
    cy.location('pathname', { timeout: 20000 }).should('eq', '/login');
  });
});
