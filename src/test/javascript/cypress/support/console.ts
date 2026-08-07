/* eslint-disable @typescript-eslint/no-namespace */

/**
 * Console-specific Cypress helpers.
 *
 * The generated `navbar.ts` commands drive JHipster's top navbar with its
 * account and entity dropdowns. This build replaced that with a sidebar, so
 * the shell is navigated here instead. `navbar.ts` is left untouched for the
 * generated specs that still use it.
 */

export const sidebarSelector = '[data-cy="sidebar"]';
export const sidebarNavSelector = '[data-cy="sidebarNav"]';
export const tabbarSelector = '[data-cy="tabbar"]';
export const topbarSelector = '[data-cy="topbar"]';
export const menuToggleSelector = '[data-cy="menuToggle"]';
export const pageTitleSelector = '[data-cy="pageTitle"]';
export const breadcrumbSelector = '[data-cy="breadcrumb"]';
export const quickAddSelector = '#abf-quick-add';
export const roleSelector = '[data-cy="roleKey"]';

/** The three console roles, keyed as the login form's select keys them. */
export const CONSOLE_LOGINS = {
  ops: 'efua.mensah@abofonsa.care',
  sup: 'supervisor@abofonsa.care',
  desk: 'desk@abofonsa.care',
} as const;

export type ConsoleRoleKey = keyof typeof CONSOLE_LOGINS;

/**
 * Sign in through the real form.
 *
 * There is no seeding shortcut: the mock issues the token from the login, so
 * going through the form is both the fastest path and the one that actually
 * exercises what a user does.
 */
Cypress.Commands.add('signInAs', (role: ConsoleRoleKey) => {
  // Clear the stored token first. Visiting /login while still signed in makes
  // the login component redirect straight to the dashboard, and the form is
  // torn out from under cy.type() mid-command.
  cy.clearAllSessionStorage();
  cy.clearAllLocalStorage();

  cy.visit('/login');
  cy.location('pathname').should('eq', '/login');
  cy.get(roleSelector).select(role);
  cy.get('[data-cy="username"]').should('have.value', CONSOLE_LOGINS[role]);
  cy.get('[data-cy="submit"]').click();
  return cy.location('pathname', { timeout: 20000 }).should('eq', '/dashboard');
});

/** Follow a sidebar link by its route. */
Cypress.Commands.add('openConsoleRoute', (route: string) => cy.get(sidebarNavSelector).find(`a[href="/${route}"]`).click({ force: true }));

declare global {
  namespace Cypress {
    interface Chainable {
      signInAs(role: ConsoleRoleKey): Cypress.Chainable;
      openConsoleRoute(route: string): Cypress.Chainable;
    }
  }
}

export {};
