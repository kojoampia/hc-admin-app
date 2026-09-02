import { quickAddSelector, sidebarSelector, topbarSelector } from '../../support/console';

/**
 * Sign-in, and what the console derives from the token it gets back.
 *
 * <p>Note on cy.intercept: these specs do not use it. Every persona here is a real account on a
 * real gateway and the assertions are on what the application renders and stores, which is the only
 * evidence that the authority split reached the screen. (This note used to say `/api/**` could not
 * be intercepted because an in-browser mock resolved those calls inside Angular's HttpClient. That
 * mock was deleted on 2026-08-08 — the requests are ordinary network traffic now.)
 */
/**
 * The authorities a JWT carries, read out of its payload segment.
 *
 * <p><b>The two replacements are the whole point of this helper.</b> A JWT payload is
 * base64<b>url</b>, which spells the last two alphabet entries `-` and `_` where standard base64
 * spells them `+` and `/`, and `atob` throws `InvalidCharacterError` on either — naming neither
 * JWTs nor encodings, so the failure reads as a broken sign-in. Whether either character appears at
 * all depends on the byte alignment of a payload carrying per-run `iat`/`exp` values, so the
 * unnormalised version threw on some runs and decoded on others. That is worse than ordinary flake
 * here: `cypress.config.ts` sets `retries: 2`, and a retry re-runs `signInAs` and mints a *fresh*
 * token that usually decodes, so the defect would have been absorbed as noise rather than reported.
 *
 * <p>Missing `=` padding is deliberately not restored. WHATWG forgiving-base64 accepts a segment
 * without it, which is how JWTs are written, so padding logic here would be code no failure asks
 * for.
 */
const decodeAuthorities = (token: string): string[] => {
  const segment = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const payload = JSON.parse(atob(segment)) as { auth: string };
  // Space, not comma. `AuthenticateController:86` builds the claim with `Collectors.joining(" ")`,
  // and `SecurityJwtConfiguration:75` hands it to Spring's converter, which splits on whitespace —
  // so a real token reads "ROLE_ADMIN ROLE_USER". Splitting on ',' returned that whole string as a
  // single element, which fails an `include` assertion and, worse, satisfies every `not.include`
  // one: the two negative assertions below passed vacuously for as long as this was wrong.
  //
  // It was wrong from the day this file was written and nothing caught it, because the mock this
  // spec used to run against minted its own comma-joined claim. Pointing the spec at a real gateway
  // is what exposed it — found on the quality stack 2026-09-02, not by a review of the change that
  // fixed the base64url decoding one line above.
  return payload.auth.split(' ');
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
    // The one line pinning `Validators.required` on both controls: `login.ts:40-41` is what makes
    // an empty form invalid and `login.html:83` is what binds that to `[disabled]`. Drop either
    // validator and only this assertion goes red — the two above still pass, because a form with no
    // validators is a form whose controls are still empty.
    // (This said the assertion stopped the two above passing "on a form that has not rendered yet",
    // which is not how Cypress works: `cy.get()` retries until the element exists and fails the test
    // if it never does, so `have.value ''` cannot pass against an unrendered form.)
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
    // The sidebar foot renders a role label at all, and it is the `ops` one. This does NOT pin what
    // the console derives from ROLE_ADMIN specifically — `roleByAuthorities()` falls through to
    // `ops` for any input at all (`console-role.ts:74`), which is exactly what the case below says
    // about ROLE_OPERATOR. What it can still catch is the foot being dropped, the i18n key breaking,
    // and the derivation being inverted so that an administrator resolves to one of the narrower
    // roles. The ROLE_ADMIN-specific pin in this case is the quick-add on the next line.
    // Asserting the chip text "Operations" alone would also be satisfied by the nav group heading of
    // the same name, so the full label is the one to read.
    cy.get(sidebarSelector).contains('Operations administrator');
    cy.get(quickAddSelector).should('exist');
    cy.contains('Admin dashboard').should('be.visible');
  });

  it('should land the operator with no write chrome', () => {
    cy.signInAs('sup');

    // The topbar first, and specifically the row the quick-add would be in. `#abf-quick-add` is
    // `topbar.html:86-87`, behind `*abfHasAnyAuthority`, and that directive renders nothing until
    // the account signal is populated — so a `should('not.exist')` on it is satisfied by the topbar
    // not having rendered yet and passes for an administrator too. Same rule as
    // `duty-roster.cy.ts:157-160`. The bell is the anchor because it sits in
    // `.abf-topbar__actions` beside the quick-add and is behind no authority directive at all, so
    // it renders for every role; the sidebar below is a different component (`navbar.html`) and
    // cannot vouch for this one.
    cy.get(topbarSelector).find('[data-cy="notificationsBell"]').should('be.visible');

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

    // The topbar anchor again, for the reason given in the case above: without it this case has no
    // rendered-chrome assertion at all before its negative, and would stay green if the topbar
    // stopped rendering for authenticated users entirely.
    cy.get(topbarSelector).find('[data-cy="notificationsBell"]').should('be.visible');
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
