import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { provideLocationMocks } from '@angular/common/testing';
import { TestBed } from '@angular/core/testing';
import { Route, Router, provideRouter, withComponentInputBinding } from '@angular/router';

import { of } from 'rxjs';

import { AccountService } from 'app/core/auth/account.service';

import routes from './app.routes';

/**
 * What the top-level route table has to be true of, asserted by navigating it rather than by reading
 * it.
 *
 * <p>The file exists because of one defect, and the defect had exactly the shape a route table
 * invites: `/account/reset/finish?key=…` — the URL in every account-creation and password-reset
 * email this system sends — matched no route at all and rendered the 404 page. Nothing failed to
 * build, no spec went red, and the console has no self-registration, so that link was the only way
 * an admin-created account could ever reach a working password. An absent route is invisible to
 * `tsc`, to `ng build` and to every component spec; the only thing that can see it is something that
 * asks the router.
 *
 * <p>The second half is the trap the fix could have fallen into. A password reset must work for
 * somebody who is signed out — that is what a password reset is — so these routes must not sit under
 * `account`, which carries `UserRouteAccessService`. Every case below runs with an account service
 * that reports nobody signed in, so a guard added to either route sends the navigation to `/login`
 * and the assertion goes red.
 */
describe('app.routes', () => {
  /** Signed out, always: that is the state both reset screens exist to serve. */
  const signedOut = {
    identity: vitest.fn(() => of(null)),
    isAuthenticated: vitest.fn(() => false),
    hasAnyAuthority: vitest.fn(() => false),
  };

  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        provideLocationMocks(),
        { provide: AccountService, useValue: signedOut },
      ],
    });
    router = TestBed.inject(Router);
  });

  describe('the password-reset pages an emailed link lands on', () => {
    it('resolves /account/reset/finish for a signed-out visitor, key and all', async () => {
      // The exact shape of `${baseUrl}/account/reset/finish?key=…` that the gateway's
      // creationEmail.html and passwordResetEmail.html build. Those links are in inboxes already and
      // cannot be reissued, so this is a fixed contract rather than a naming preference.
      const arrived = await router.navigateByUrl('/account/reset/finish?key=cy1yCud5CkXb4PHsv78G');

      expect(arrived).toBe(true);
      expect(router.url).toBe('/account/reset/finish?key=cy1yCud5CkXb4PHsv78G');
    });

    it('resolves /account/reset/request for a signed-out visitor', async () => {
      const arrived = await router.navigateByUrl('/account/reset/request');

      expect(arrived).toBe(true);
      expect(router.url).toBe('/account/reset/request');
    });

    it('does not send either of them through the 404 redirect', async () => {
      // The failure the original defect actually produced. `errorRoute`'s `**` entry redirects to
      // `/404`, so a missing route is not a failed navigation — it is a successful one to somewhere
      // else, which is why nothing anywhere reported this.
      await router.navigateByUrl('/account/reset/finish?key=abc');
      expect(router.url).not.toContain('/404');

      await router.navigateByUrl('/account/reset/request');
      expect(router.url).not.toContain('/404');
    });

    it('declares them at top level, with no canActivate', () => {
      // The navigations above are the real assertion; this one names the mistake, so that a guard
      // added to these routes fails with the reason rather than only with a wrong URL.
      const reset = routes.filter((route: Route) => route.path?.startsWith('account/reset'));

      expect(reset.map((route: Route) => route.path)).toEqual(['account/reset/request', 'account/reset/finish']);
      for (const route of reset) {
        expect(route.canActivate).toBeUndefined();
        expect(route.children).toBeUndefined();
      }
    });
  });

  describe('the account settings screen, which is the opposite case', () => {
    it('refuses a signed-out visitor', async () => {
      // The contrast that gives the cases above their meaning: `/account` is guarded and stays
      // guarded. If this ever passes for the same reason the reset routes do, the guard has been
      // lost rather than the reset routes having been placed correctly.
      //
      // The assertion is on the navigation being refused rather than on `router.url` reading
      // `/login`: `UserRouteAccessService` returns false and starts a *second* navigation, which has
      // not run by the time the first promise settles. Asserting the redirect would mean waiting on
      // a timer, and a spec that waits is a spec that eventually flakes.
      const arrived = await router.navigateByUrl('/account');

      expect(arrived).toBe(false);
      expect(router.url).not.toContain('/account');
    });
  });
});
