/* eslint-disable @typescript-eslint/no-namespace */

// ***********************************************
// This commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// ***********************************************
// Begin Specific Selector Attributes for Cypress
// ***********************************************

// Navbar
export const navbarSelector = '[data-cy="navbar"]';
export const adminMenuSelector = '[data-cy="adminMenu"]';
export const accountMenuSelector = '[data-cy="accountMenu"]';
export const registerItemSelector = '[data-cy="register"]';
export const settingsItemSelector = '[data-cy="settings"]';
export const passwordItemSelector = '[data-cy="passwordItem"]';
export const loginItemSelector = '[data-cy="login"]';
export const logoutItemSelector = '[data-cy="logout"]';
export const entityItemSelector = '[data-cy="entity"]';

// Login
export const titleLoginSelector = '[data-cy="loginTitle"]';
export const errorLoginSelector = '[data-cy="loginError"]';
export const usernameLoginSelector = '[data-cy="username"]';
export const passwordLoginSelector = '[data-cy="password"]';
// Generated as `[data-cy="forgetYourPasswordSelector"]` — the variable's own name, which matched
// nothing because this build had no such link until 2026-09-02. Pointed at the real one rather than
// deleted: the constant was already exported here, and a dead selector beside a live link is how the
// next spec ends up inventing a third spelling.
export const forgotPasswordSelector = '[data-cy="forgotPassword"]';
export const submitLoginSelector = '[data-cy="submit"]';

// Register
export const usernameRegisterSelector = '[data-cy="username"]';
export const emailRegisterSelector = '[data-cy="email"]';
export const firstPasswordRegisterSelector = '[data-cy="firstPassword"]';
export const secondPasswordRegisterSelector = '[data-cy="secondPassword"]';
export const submitRegisterSelector = '[data-cy="submit"]';

// Settings
export const firstNameSettingsSelector = '[data-cy="firstname"]';
export const lastNameSettingsSelector = '[data-cy="lastname"]';
export const emailSettingsSelector = '[data-cy="email"]';
export const submitSettingsSelector = '[data-cy="submit"]';

// Password
export const currentPasswordSelector = '[data-cy="currentPassword"]';
export const newPasswordSelector = '[data-cy="newPassword"]';
export const confirmPasswordSelector = '[data-cy="confirmPassword"]';
export const submitPasswordSelector = '[data-cy="submit"]';

// Reset Password — request half (/account/reset/request)
export const emailResetPasswordSelector = '[data-cy="emailResetPassword"]';
export const submitInitResetPasswordSelector = '[data-cy="submit"]';
export const resetRequestSuccessSelector = '[data-cy="resetRequestSuccess"]';

// Reset Password — finish half (/account/reset/finish?key=…), where every account-creation and
// password-reset email lands. There is no self-registration on this stack, so this screen is the
// only path from a new account to a working password.
export const resetPasswordSelector = '[data-cy="resetPassword"]';
export const confirmResetPasswordSelector = '[data-cy="confirmResetPassword"]';
export const resetFinishKeyMissingSelector = '[data-cy="resetFinishKeyMissing"]';
export const resetFinishMismatchSelector = '[data-cy="resetFinishMismatch"]';
export const resetFinishErrorSelector = '[data-cy="resetFinishError"]';
export const backToLoginSelector = '[data-cy="backToLogin"]';

// Administration
export const swaggerFrameSelector = 'iframe[data-cy="swagger-frame"]';
export const swaggerPageSelector = '[id="swagger-ui"]';
export const metricsPageHeadingSelector = '[data-cy="metricsPageHeading"]';
export const healthPageHeadingSelector = '[data-cy="healthPageHeading"]';
export const logsPageHeadingSelector = '[data-cy="logsPageHeading"]';
export const configurationPageHeadingSelector = '[data-cy="configurationPageHeading"]';

// ***********************************************
// End Specific Selector Attributes for Cypress
// ***********************************************

export const classInvalid = 'ng-invalid';

export const classValid = 'ng-valid';

Cypress.Commands.add('authenticatedRequest', data => {
  const jwtToken = sessionStorage.getItem(Cypress.expose('jwtStorageName'));
  const bearerToken = jwtToken && JSON.parse(jwtToken);
  if (bearerToken) {
    return cy.request({
      ...data,
      auth: {
        bearer: bearerToken,
      },
    });
  }
  return cy.request(data);
});

/**
 * Sign in through the form.
 *
 * The generated version obtained a token with `cy.request`, which issues HTTP
 * from the Cypress process rather than the browser and therefore never
 * reaches `mockApiInterceptor` — against this build it gets HTML back. The
 * API lives inside the page, so the only way in is through the page.
 */
Cypress.Commands.add('login', (username: string, password: string) => {
  cy.visit('/login');
  cy.get('[data-cy="username"]').clear();
  cy.get('[data-cy="username"]').type(username);
  cy.get('[data-cy="password"]').clear();
  cy.get('[data-cy="password"]').type(password, { log: false });
  cy.get('[data-cy="submit"]').click();
  return cy.location('pathname', { timeout: 20000 }).should('not.eq', '/login');
});

export interface Credentials {
  adminUsername: string;
  adminPassword: string;
  username: string;
  password: string;
}

Cypress.Commands.add('credentials', () => {
  return cy.env(['E2E_USERNAME', 'E2E_PASSWORD']).then(({ E2E_USERNAME, E2E_PASSWORD }) => {
    return {
      adminUsername: E2E_USERNAME ?? Cypress.expose('adminUsername'),
      adminPassword: E2E_PASSWORD ?? Cypress.expose('adminPassword'),
      username: E2E_USERNAME ?? Cypress.expose('username'),
      password: E2E_PASSWORD ?? Cypress.expose('password'),
    };
  });
});

declare global {
  namespace Cypress {
    interface Chainable {
      authenticatedRequest(data): Cypress.Chainable;
      login(username: string, password: string): Cypress.Chainable;
      credentials(): Cypress.Chainable<Credentials>;
    }
  }
}

// Convert this to a module instead of a script (allows import/export)
export {};
