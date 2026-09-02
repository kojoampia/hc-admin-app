import {
  backToLoginSelector,
  confirmResetPasswordSelector,
  emailResetPasswordSelector,
  forgotPasswordSelector,
  resetFinishErrorSelector,
  resetFinishKeyMissingSelector,
  resetFinishMismatchSelector,
  resetPasswordSelector,
  resetRequestSuccessSelector,
  submitResetPasswordSelector,
} from '../../support/commands';

/**
 * The password-reset screens, against a real gateway behind the quality stack's two nginx hops.
 *
 * <p><b>This is the defect this file exists for.</b> An account-creation email from production
 * linked to `/account/reset/finish?key=…` and the console rendered its 404 page. There is no
 * self-registration on this stack — `/api/register` and `/api/activate` were removed deliberately
 * and accounts are created by an admin through `/api/admin/users` — so that email is the only route
 * by which a new administrator ever reaches a working password, and no admin-created account could
 * be activated at all. Nothing failed to build and no spec went red: an absent route is invisible to
 * `tsc`, to `ng build` and to every component spec.
 *
 * <p><b>Read the body, never the status.</b> `curl -o /dev/null -w '%{http_code}'` on that URL
 * answered 200 while it was broken and answers 200 now — the SPA fallback serves `index.html` for
 * every path, so the status is the same whether the route exists, does not exist, or belongs to the
 * sibling patient site sharing this machine's nginx. Only what the browser renders can tell the
 * three apart, which is why every assertion below is on rendered text.
 *
 * <p><b>What a repeatable case can honestly assert, and what it cannot.</b> A reset key is
 * single-use and expires 24 hours after it is minted, so a *successful* reset cannot be a spec: the
 * key would be spent on the first run and the second run would assert the failure path instead —
 * and `cypress.config.ts` sets `retries: 2`, so the retry would hide it. Worse, the only account
 * whose mailbox is reachable here is the seeded `admin`, and resetting its password would break the
 * `beforeEach` of every other spec in this directory. So these cases assert the three things that
 * are true on every run: that the screens render at all, that they validate before they call
 * anything, and that the gateway's rejection of a key it has never seen reaches the screen as the
 * message written for it. The redemption path itself is covered by
 * `password-reset-finish.spec.ts`, where the service is a double.
 */
describe('password reset', () => {
  /**
   * A key the gateway cannot have minted, so this spec never consumes a real one. Rejected the same
   * way an expired key is — `completePasswordReset` finds no user and `AccountResource` turns the
   * empty result into an error with no body — which is precisely why the screen can offer only the
   * one message.
   */
  const bogusKey = 'cypress-key-that-was-never-minted';

  describe('the link an emailed key lands on', () => {
    it('renders the set-password screen rather than the 404 page', () => {
      cy.visit(`/account/reset/finish?key=${bogusKey}`);

      // The three assertions that separate "the route exists" from "something answered 200".
      cy.contains('Reset password').should('be.visible');
      cy.contains('Choose a new password').should('be.visible');
      cy.get(resetPasswordSelector).should('be.visible');

      // And what it must NOT be. `error.route.ts` redirects an unmatched path to `/404`, so the old
      // failure was a successful navigation to somewhere else — the URL is the evidence.
      cy.location('pathname').should('eq', '/account/reset/finish');
      cy.contains('The page does not exist').should('not.exist');
    });

    it('serves it to a signed-out visitor, with no console chrome', () => {
      // The whole point: somebody redeeming a reset key cannot sign in. If these routes were ever
      // moved under `account`, `UserRouteAccessService` would send this visit to `/login`.
      cy.clearLocalStorage();
      cy.visit(`/account/reset/finish?key=${bogusKey}`);

      // The form first, and the order is the assertion. Run against the released image — the one
      // that still had the defect — this case PASSED with the pathname check leading: the redirect
      // to `/404` is a client-side navigation that has not happened yet when the assertion first
      // runs, and the 404 page renders without chrome either, so both of the checks below are
      // satisfied by the failure they were meant to catch. Anchoring on something only this screen
      // renders is what makes the rest mean anything.
      cy.get(resetPasswordSelector).should('be.visible');
      cy.location('pathname').should('eq', '/account/reset/finish');
      // `main.html` renders the shell only when authenticated, so the auth pages are full-bleed.
      cy.get('[data-cy="sidebar"]').should('not.exist');
      cy.get('[data-cy="topbar"]').should('not.exist');
    });

    it('says the key is missing, and withholds the form, when there is no key', () => {
      cy.visit('/account/reset/finish');

      cy.get(resetFinishKeyMissingSelector).should('be.visible');
      cy.contains('The reset key is missing.').should('be.visible');
      // Withheld rather than shown-and-rejected: a submit with no key comes back as the same 400 an
      // expired key does, so offering the form would report a broken link as a bad password.
      cy.get(resetPasswordSelector).should('not.exist');
    });

    it('refuses a confirmation that does not match, before calling anything', () => {
      cy.visit(`/account/reset/finish?key=${bogusKey}`);

      cy.get(resetPasswordSelector).type('Admin@01234', { log: false });
      cy.get(confirmResetPasswordSelector).type('Admin@0123', { log: false });

      cy.get(resetFinishMismatchSelector).should('be.visible');
      cy.get(submitResetPasswordSelector).should('be.disabled');
    });

    it('reports the gateway rejecting a key it has never seen', () => {
      // A real round trip to a real gateway: POST /api/account/reset-password/finish, `permitAll`,
      // no token. The response is the one an expired key produces, and this is the only way to
      // exercise that branch repeatably — a key that was never minted cannot be spent.
      cy.visit(`/account/reset/finish?key=${bogusKey}`);

      cy.get(resetPasswordSelector).type('Admin@01234', { log: false });
      cy.get(confirmResetPasswordSelector).type('Admin@01234', { log: false });
      cy.get(submitResetPasswordSelector).click();

      cy.get(resetFinishErrorSelector, { timeout: 20000 }).should('be.visible');
      cy.contains('only valid for 24 hours').should('be.visible');
      // And a way onwards rather than a dead end, which is the difference between this and the 404.
      cy.get('[data-cy="requestNewKey"]').should('be.visible');
    });
  });

  describe('asking for a new key', () => {
    it('is reachable from the sign-in screen', () => {
      // The other half of the original gap: `login.password.forgot` had been in the catalogue since
      // the beginning with nothing rendering it, so an administrator whose 24-hour key had expired
      // had nowhere to ask for another.
      //
      // **It clicks rather than visiting the URL**, and that is what found the sign-in screen's
      // stray authenticated request on this case's first live run — the 401 bounced the click back
      // to `/login`. See `login.ts` for what that was and why it went.
      //
      // Keep the click. But do not read this case as the net for that defect: it only sees the
      // bounce if the click lands inside the few hundred milliseconds before the 401 arrives, and
      // `retries: 2` above would absorb the miss as flake. `login.cy.ts`'s first case pins the
      // property deterministically; this one is here to prove the link works, which is a different
      // thing worth proving.
      cy.visit('/login');

      cy.get(forgotPasswordSelector).should('be.visible').click();

      cy.location('pathname', { timeout: 20000 }).should('eq', '/account/reset/request');
      cy.contains('Reset your password').should('be.visible');
    });

    it('validates the address before it calls the gateway', () => {
      cy.visit('/account/reset/request');

      cy.get(emailResetPasswordSelector).type('not-an-address');

      cy.get(submitResetPasswordSelector).should('be.disabled');
    });

    it('accepts an address and reports that a mail is on its way', () => {
      // Deliberately an address no account holds. `requestPasswordReset` answers 200 either way — it
      // says so in a comment — so that this form cannot be used to find out which addresses have
      // accounts, and that is exactly what makes the case repeatable: nothing is sent, no key is
      // minted, and no real account's outstanding key is replaced. Using the seeded `admin` address
      // here would invalidate whatever key that account was last issued, on every run.
      cy.visit('/account/reset/request');

      cy.get(emailResetPasswordSelector).type('nobody-cypress@abofonsa.invalid');
      cy.get(submitResetPasswordSelector).click();

      cy.get(resetRequestSuccessSelector, { timeout: 20000 }).should('be.visible');
      cy.contains('Check your email').should('be.visible');
      // The wording is asserted rather than only the panel: a success message that named the account
      // would undo the gateway's deliberate silence about which addresses exist.
      cy.contains('nobody-cypress@abofonsa.invalid').should('not.exist');
    });

    it('offers a way back to the sign-in screen', () => {
      cy.visit('/account/reset/request');

      cy.get(backToLoginSelector).click();

      cy.location('pathname', { timeout: 20000 }).should('eq', '/login');
    });
  });
});
