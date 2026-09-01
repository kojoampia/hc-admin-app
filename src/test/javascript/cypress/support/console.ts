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
/**
 * @deprecated The login screen has no role picker. It belonged to the in-browser mock, which was
 * deleted on 2026-08-08 — `login.html` carries only `username`, `password` and `submit`, and
 * `roleKey` appears nowhere in `src/main/webapp`. Kept solely because `login.cy.ts` still imports
 * it; any spec selecting it will fail.
 */
export const roleSelector = '[data-cy="roleKey"]';

/**
 * The three console personas, mapped onto the accounts the gateway actually seeds.
 *
 * <p><b>These were mock personas until 2026-09-01</b> — `efua.mensah@abofonsa.care` and friends,
 * chosen from a role dropdown the mock login rendered. When the mock went, so did the dropdown and
 * the accounts, and `signInAs` was left selecting an element that no longer exists: **every spec
 * under `e2e/console/` failed in its `beforeEach`** from that day, on
 * `Expected to find element: [data-cy="roleKey"]`.
 *
 * <p>They now name real logins from `gateway/src/main/resources/hc-admin-gw-data.json`, chosen to
 * preserve each persona's privilege level, since that is what the specs contrast:
 *
 * <ul>
 *   <li>{@code ops} → `admin`, ROLE_ADMIN — the only role for which `canEdit()` is true, so this is
 *       the one that sees write controls;
 *   <li>{@code sup} → `operator`, ROLE_OPERATOR — GET across the entity surface and nothing else,
 *       which is the read-only contrast the specs assert against;
 *   <li>{@code desk} → `user`, ROLE_USER — deliberately reaches nothing under `/api/**`.
 * </ul>
 *
 * <p>These passwords are public: they are seeded under `dev`/`test` only, which run on jacserver's
 * quality stack and never on a server. That is the whole containment story — see `CLAUDE.md`.
 */
export const CONSOLE_LOGINS = {
  ops: 'admin',
  sup: 'operator',
  desk: 'user',
} as const;

export type ConsoleRoleKey = keyof typeof CONSOLE_LOGINS;

const CONSOLE_PASSWORDS: Record<ConsoleRoleKey, string> = {
  ops: 'Admin@01234',
  sup: 'Operator@1234567',
  desk: 'User@0123',
};

/**
 * Sign in through the real form, typing real credentials.
 *
 * <p>There is no seeding shortcut and no token to inject: the gateway issues the JWT from this
 * form, so going through it is both the fastest path and the one that exercises what a user does.
 */
Cypress.Commands.add('signInAs', (role: ConsoleRoleKey) => {
  // Clear the stored token first. Visiting /login while still signed in makes
  // the login component redirect straight to the dashboard, and the form is
  // torn out from under cy.type() mid-command.
  cy.clearAllSessionStorage();
  cy.clearAllLocalStorage();

  cy.visit('/login');
  cy.location('pathname').should('eq', '/login');
  cy.get('[data-cy="username"]').clear();
  cy.get('[data-cy="username"]').type(CONSOLE_LOGINS[role]);
  // log: false — the password would otherwise appear in the Cypress command log and in CI output.
  cy.get('[data-cy="password"]').clear();
  cy.get('[data-cy="password"]').type(CONSOLE_PASSWORDS[role], { log: false });
  cy.get('[data-cy="submit"]').click();
  return cy.location('pathname', { timeout: 20000 }).should('eq', '/dashboard');
});

/** Follow a sidebar link by its route. */
Cypress.Commands.add('openConsoleRoute', (route: string) => cy.get(sidebarNavSelector).find(`a[href="/${route}"]`).click({ force: true }));

/** Where the console's entity calls go. Same prefix `ApplicationConfigService` builds. */
export const ADMIN_API = '/services/hcadminservice/api';

/**
 * Call the admin service directly, with the signed-in user's token.
 *
 * <p>This exists so a spec can arrange and — more importantly — <b>restore</b> state without going
 * through the screen under test. Cypress does not reseed between specs and the `dev`/`test` fixture
 * is only applied at application start, so a spec that writes and does not put the state back is a
 * spec that fails on its second run. The generated `cy.authenticatedRequest` reads the token from
 * the spec frame's own `sessionStorage`; this reads it from the application window, which is where
 * `StateStorageService` actually puts it.
 */
Cypress.Commands.add('adminApi', (method: string, path: string, body?: unknown) =>
  cy.window({ log: false }).then(win => {
    const key = Cypress.expose('jwtStorageName');
    const raw = win.sessionStorage.getItem(key) ?? win.localStorage.getItem(key);
    const token = raw ? (JSON.parse(raw) as string) : null;
    return cy.request({
      method,
      url: `${ADMIN_API}${path}`,
      body: body as Cypress.RequestBody,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        // JHipster's PATCH handlers only consume merge-patch.
        ...(method === 'PATCH' ? { 'Content-Type': 'application/merge-patch+json' } : {}),
      },
    });
  }),
);

declare global {
  namespace Cypress {
    interface Chainable {
      signInAs(role: ConsoleRoleKey): Cypress.Chainable;
      openConsoleRoute(route: string): Cypress.Chainable;
      adminApi(method: string, path: string, body?: unknown): Cypress.Chainable<Cypress.Response<any>>;
    }
  }
}

export {};
