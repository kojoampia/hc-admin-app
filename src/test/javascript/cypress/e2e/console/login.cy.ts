import { quickAddSelector, sidebarSelector } from '../../support/console';

/**
 * Sign-in, and what the console derives from the token it gets back.
 *
 * <p>Note on cy.intercept: these specs do not use it. Every persona here is a real account on a
 * real gateway and the assertions are on what the application renders and stores, which is the only
 * evidence that the authority split reached the screen. (This note used to say `/api/**` could not
 * be intercepted because an in-browser mock resolved those calls inside Angular's HttpClient. That
 * mock was deleted on 2026-08-08 — the requests are ordinary network traffic now.)
 */
const decodeAuthorities = (token: string): string[] => {
  const payload = JSON.parse(atob(token.split('.')[1])) as { auth: string };
  return payload.auth.split(',');
};

describe('login', () => {
  it('should show the brand panel and an empty sign-in form', () => {
    cy.visit('/login');

    cy.contains('The console behind').should('be.visible');
    cy.contains('every bridge you build.').should('be.visible');

    // The form starts empty, and pinning that is the point of this case: it was prefilled with a
    // persona's username back when an in-browser mock accepted any password for a known login, and
    // `login.ts`'s header comment records why that had to go — against a real gateway those
    // accounts return 401, so the page was instructing people to do something that cannot work.
    // This spec asserted the prefill until 2026-09-01, one persona rename behind the component.
    cy.get('[data-cy="username"]').should('have.value', '');
    cy.get('[data-cy="password"]').should('have.value', '');
    // Both controls are `Validators.required`, so a disabled submit is what "empty" looks like from
    // outside. Without it the two assertions above also pass on a form that has not rendered yet.
    cy.get('[data-cy="submit"]').should('be.disabled');

    // The four figures in the brand panel are deliberately NOT asserted. They come from
    // GET /services/hcadminservice/api/dashboard/metrics, which the gateway gates on ROLE_ADMIN or
    // ROLE_OPERATOR — a signed-out visitor gets 401, `Login` swallows the error, and
    // `@if (networkTotals())` renders nothing at all. The previous version of this case asserted
    // the literals 116 / 24 / 9, which only the mock ever served.
  });

  it('should land the administrator on the dashboard with the full chrome', () => {
    cy.signInAs('ops');

    cy.get(sidebarSelector).should('be.visible');
    // The role the console DERIVES from the token, not copy in the page: `roleByAuthorities()` sees
    // ROLE_ADMIN and resolves `ops`, whose label the sidebar foot renders. Asserting the chip text
    // "Operations" alone would also be satisfied by the nav group heading of the same name.
    cy.get(sidebarSelector).contains('Operations administrator');
    cy.get(quickAddSelector).should('exist');
    cy.contains('Admin dashboard').should('be.visible');
  });

  it('should land the operator with no write chrome', () => {
    cy.signInAs('sup');

    // The quick-add is gated on QUICK_ADD_AUTHORITIES = [ROLE_ADMIN], which `operator` does not
    // hold. This is the assertion that actually distinguishes the persona.
    cy.get(quickAddSelector).should('not.exist');

    // And the sidebar still reads "Operations administrator", which is the console being honest
    // about what it knows rather than a mistake in this expectation. `roleByAuthorities()`
    // recognises only ROLE_ADMIN / ROLE_SUPERVISOR / ROLE_DESK — the mock's vocabulary — and falls
    // through to `ops` for anything else, so ROLE_OPERATOR renders as the administrator. This case
    // expected "Supervisor" while the personas were mock accounts that really did carry
    // ROLE_SUPERVISOR; the remap onto real logins preserved the privilege level and not the name.
    // Change this expectation when `console-role.ts` learns ROLE_OPERATOR, not before.
    cy.get(sidebarSelector).contains('Operations administrator');
  });

  it('should land the plain user on the dashboard but out of the directories', () => {
    cy.signInAs('desk');

    cy.get(quickAddSelector).should('not.exist');
    // ROLE_USER reaches nothing under `/api/**` and the console mirrors that: the entity routes
    // carry ENTITY_READ_AUTHORITIES = [ROLE_ADMIN, ROLE_OPERATOR], so UserRouteAccessService sends
    // this account to /accessdenied rather than to a screen whose every request would 403. The old
    // "Message desk" sidebar assertion here was the mock's ROLE_DESK label; see the case above.
    cy.visit('/patient');
    cy.location('pathname', { timeout: 20000 }).should('eq', '/accessdenied');
  });

  it('should issue a token carrying the authorities the gateway seeded', () => {
    cy.signInAs('sup');

    cy.window().then(win => {
      // The storage key is `cypress.config.ts`'s `jwtStorageName`, not a literal — it was
      // 'abf-authenticationToken' spelled out here, a fourth copy of a value the harness owns.
      const key = Cypress.expose('jwtStorageName');
      const stored = win.sessionStorage.getItem(key) ?? win.localStorage.getItem(key);
      expect(stored, 'a token was stored').to.be.a('string');

      const authorities = decodeAuthorities(JSON.parse(stored!) as string);
      // Exactly what `hc-admin-gw-data.json` seeds `operator` with, under `dev`.
      expect(authorities).to.include('ROLE_OPERATOR');
      expect(authorities).to.include('ROLE_USER');
      expect(authorities).to.not.include('ROLE_ADMIN');
      // This expected ROLE_SUPERVISOR until 2026-09-01. ROLE_SUPERVISOR and ROLE_DESK exist only in
      // the console's own `ConsoleAuthority`; no gateway mints either, so the assertion could only
      // have passed against a mock token. It is inverted rather than deleted because the mismatch
      // between the console's vocabulary and the gateway's is exactly what caught this file out.
      expect(authorities).to.not.include('ROLE_SUPERVISOR');
    });
  });

  // Removed 2026-09-01: "should set the username from the role picker". The picker was the mock's
  // `[data-cy="roleKey"]` select, deleted with the mock on 2026-08-08 — `login.html` carries only
  // `username`, `password`, `rememberMe` and `submit`, and `roleKey` appears nowhere in
  // `src/main/webapp`. There is nothing left to assert about it, so the case is gone rather than
  // rewritten, and `roleSelector` went with it.

  it('should send a signed-out visitor to the login screen', () => {
    cy.visit('/dashboard');
    cy.location('pathname', { timeout: 20000 }).should('eq', '/login');
  });
});
