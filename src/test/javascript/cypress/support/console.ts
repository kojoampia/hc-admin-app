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
 * The three console personas, mapped onto the accounts the gateway actually seeds.
 *
 * <p><b>These were mock personas until 2026-09-01</b> — `efua.mensah@abofonsa.care` and friends,
 * chosen from a role dropdown the mock login rendered. When the mock went, so did the dropdown and
 * the accounts, and `signInAs` was left selecting an element that no longer exists: **every spec
 * under `e2e/console/` failed in its `beforeEach`** from that day, on
 * `Expected to find element: [data-cy="roleKey"]`.
 *
 * <p>They now name real logins, chosen to preserve each persona's privilege level, since that is
 * what the specs contrast:
 *
 * <ul>
 *   <li>{@code ops} → the administrator, ROLE_ADMIN — the only role that sees write controls;
 *   <li>{@code sup} → `operator`, ROLE_OPERATOR — GET across the entity surface and nothing else,
 *       which is the read-only contrast the specs assert against;
 *   <li>{@code desk} → `user`, ROLE_USER — deliberately reaches nothing under `/api/**`.
 * </ul>
 *
 * <p><b>The privilege level is all that carried over.</b> The console derives its own role name
 * from the token in `shared/auth/console-role.ts`, and that vocabulary — ROLE_SUPERVISOR, ROLE_DESK
 * — is the mock's, which no gateway mints. So `sup` and `desk` sign in with strictly less
 * authority than `ops` and are still *displayed* as the operations administrator. Assert authority
 * effects (a control that is not rendered, a route that redirects), not the role chip, unless the
 * chip is what you mean to pin.
 *
 * <p><b>This mirrors `ConsoleRoleKey` in `app/shared/auth/console-role.ts` and cannot import it.</b>
 * The cypress `tsconfig.json` resets `baseUrl` to `./`, so the `app/…` path alias the application
 * compiles against does not resolve from here — the duplication is forced, not lazy. Nothing links
 * the two, so a key renamed or added there drifts this copy with no compile error anywhere; change
 * both.
 */
export type ConsoleRoleKey = 'ops' | 'sup' | 'desk';

export interface ConsoleAccount {
  login: string;
  password: string;
}

/**
 * The two personas that exist only as seeded fixtures, from
 * `gateway/src/main/resources/hc-admin-gw-data.json`.
 *
 * <p>{@code ops} is deliberately absent. It is the same administrator the rest of the harness
 * already owns — `cypress.config.ts` exposes `adminUsername`/`adminPassword`, and `cy.credentials()`
 * lets `E2E_USERNAME`/`E2E_PASSWORD` override them — so a copy here would give one run two ideas of
 * the admin password. On a stack with a rotated password the generated specs would follow the
 * environment and every `e2e/console/` spec would keep typing the literal and 401. Resolve it
 * through {@link consoleAccount}, never from a constant.
 *
 * <p>These two passwords are public and that is contained rather than overlooked: `dev`/`test` seed
 * them, those profiles run on jacserver's quality stack and never on a server, and there is no
 * environment variable to override because there is no other stack for them to be right about.
 */
const SEEDED_ACCOUNTS: Record<Exclude<ConsoleRoleKey, 'ops'>, ConsoleAccount> = {
  sup: { login: 'operator', password: 'Operator@1234567' },
  desk: { login: 'user', password: 'User@0123' },
};

/** The credentials a persona signs in with. `ops` comes from the harness; the other two are seeded. */
export const consoleAccount = (role: ConsoleRoleKey): Cypress.Chainable<ConsoleAccount> =>
  role === 'ops'
    ? cy.credentials().then(({ adminUsername, adminPassword }) => ({ login: adminUsername, password: adminPassword }))
    : cy.wrap(SEEDED_ACCOUNTS[role], { log: false });

/**
 * Sign in through the real form, typing real credentials.
 *
 * <p>There is no seeding shortcut and no token to inject: the gateway issues the JWT from this
 * form, so going through it is both the fastest path and the one that exercises what a user does.
 * The typing itself is `cy.login()` from `commands.ts` — this used to reimplement it, which is how
 * it came to carry its own copy of the admin password.
 */
Cypress.Commands.add('signInAs', (role: ConsoleRoleKey) => {
  // Clear the stored token first. Visiting /login while still signed in makes
  // the login component redirect straight to the dashboard, and the form is
  // torn out from under cy.type() mid-command.
  cy.clearAllSessionStorage();
  cy.clearAllLocalStorage();

  return consoleAccount(role).then(({ login, password }) => {
    cy.login(login, password);
    // cy.login() only waits for the URL to leave /login, which a failed sign-in that redirected
    // anywhere would also satisfy. The console lands on the dashboard specifically.
    return cy.location('pathname', { timeout: 20000 }).should('eq', '/dashboard');
  });
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
