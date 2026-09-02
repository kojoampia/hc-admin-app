import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { ElementRef, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Navigation, Router } from '@angular/router';

import { provideTranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { AccountService } from 'app/core/auth/account.service';

import Login from './login';
import { LoginService } from './login.service';

describe('Login', () => {
  let comp: Login;
  let fixture: ComponentFixture<Login>;
  let mockRouter: Router;
  let mockAccountService: AccountService;
  let mockLoginService: LoginService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideTranslateService(),
        {
          provide: ActivatedRoute,
          useValue: {},
        },
        {
          provide: AccountService,
          useValue: {
            isAuthenticated: vitest.fn(),
          },
        },
        {
          provide: LoginService,
          useValue: {
            login: vitest.fn(() => of({})),
          },
        },
      ],
    });
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(Login);
    comp = fixture.componentInstance;
    mockRouter = TestBed.inject(Router);
    vitest.spyOn(mockRouter, 'navigate');
    mockLoginService = TestBed.inject(LoginService);
    mockAccountService = TestBed.inject(AccountService);
  });

  describe('ngOnInit', () => {
    it('should call accountService.identity on Init', () => {
      // GIVEN
      mockAccountService.identity = vitest.fn(() => of(null));

      // WHEN
      comp.ngOnInit();

      // THEN
      expect(mockAccountService.identity).toHaveBeenCalled();
    });

    it('should call accountService.isAuthenticated on Init', () => {
      // GIVEN
      mockAccountService.identity = vitest.fn(() => of(null));

      // WHEN
      comp.ngOnInit();

      // THEN
      expect(mockAccountService.isAuthenticated).toHaveBeenCalled();
    });

    it('should navigate to the dashboard on Init if authenticated=true', () => {
      // GIVEN
      mockAccountService.identity = vitest.fn(() => of(null));
      mockAccountService.isAuthenticated = () => true;

      // WHEN
      comp.ngOnInit();

      // THEN
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
    });
  });

  describe('ngAfterViewInit', () => {
    it('should set focus to username input after the view has been initialized', () => {
      // GIVEN
      const node = {
        focus: vitest.fn(),
      };
      comp.username = signal(new ElementRef(node));

      // WHEN
      comp.ngAfterViewInit();

      // THEN
      expect(node.focus).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should authenticate the user and navigate to the dashboard', () => {
      // GIVEN
      const credentials = {
        username: 'admin',
        password: 'admin',
        rememberMe: true,
      };

      comp.loginForm.patchValue({
        username: 'admin',
        password: 'admin',
        rememberMe: true,
      });

      // WHEN
      comp.login();

      // THEN
      expect(comp.authenticationError()).toEqual(false);
      expect(mockLoginService.login).toHaveBeenCalledWith(credentials);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
    });

    it('should authenticate the user but not navigate to the dashboard if authentication process is already routing to cached url from localstorage', () => {
      // GIVEN
      vitest.spyOn(mockRouter, 'currentNavigation').mockReturnValue({} as Navigation);

      // WHEN
      comp.login();

      // THEN
      expect(comp.authenticationError()).toEqual(false);
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should stay on login form and show error message on login error', () => {
      // GIVEN
      mockLoginService.login = vitest.fn(() => throwError(Error));

      // WHEN
      comp.login();

      // THEN
      expect(comp.authenticationError()).toEqual(true);
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });
});

/**
 * The forgot-password link, read out of the template.
 *
 * <p>Read rather than rendered because `RouterLink` needs a real router and this file's TestBed
 * deliberately stubs `ActivatedRoute` with `{}`; the same idiom as `patient.spec.ts`, which asserts
 * the absence of a button the same way.
 *
 * <p>It matters more than a link usually does. Accounts on this stack are created by an
 * administrator through `/api/admin/users` and there is no self-registration, so the reset mail is
 * the only route to a working password — and a reset key lives 24 hours. Without this link, an
 * administrator whose key has expired has no way to ask for another and no way to reach the console
 * again. `login.password.forgot` had been in the catalogue since the beginning with nothing
 * rendering it.
 */
describe('Login template', () => {
  const template = readFileSync('src/main/webapp/app/login/login.html', 'utf8');
  const component = readFileSync('src/main/webapp/app/login/login.ts', 'utf8');

  /**
   * The sign-in screen makes exactly one request, and it is the one `authExpiredInterceptor`
   * exempts.
   *
   * <p>It made two. The second asked `ConsoleMetricsService` for the brand panel's network figures,
   * over `/services/hcadminservice/api/dashboard/metrics` — gated on ROLE_ADMIN/ROLE_OPERATOR, so a
   * visitor to this screen always got 401 and the figures never rendered for anybody. The
   * interceptor sends a 401 outside `api/account` to `/login`, which was harmless while this screen
   * was a dead end and stopped being harmless the moment it gained a link out: clicking "Did you
   * forget your password?" before the 401 landed navigated to `/account/reset/request` and was
   * pulled straight back. Found on the quality stack by `password-reset.cy.ts`.
   *
   * <p>Read out of the source rather than asserted through the TestBed, because the failure is a
   * request that is made at all — a spec that stubs the service to observe it would be satisfied by
   * the very call that must not happen.
   *
   * <p>The **import specifier** is what is asserted, not the class name: the class name appears in
   * `login.ts`'s own explanation of why the call went, and a check that a historical note cannot
   * survive is a check that gets the note deleted instead.
   */
  it('injects nothing that would call an authenticated endpoint', () => {
    expect(component).not.toContain("from 'app/console/shared/console-metrics.service'");
    expect(template).not.toContain('auth-stats');
  });

  it('offers a way to ask for a password reset', () => {
    expect(template).toContain('login.password.forgot');
  });

  it('points it at the route that exists, not at the one the emails use', () => {
    // `/account/reset/finish` is where an emailed key lands and takes a `?key=`; the entry point
    // from here is the request half. Pointing at `finish` would render "the reset key is missing"
    // to somebody who had asked for the link in the first place.
    expect(template).toContain('routerLink="/account/reset/request"');
    expect(template).not.toContain('routerLink="/account/reset/finish"');
  });
});
