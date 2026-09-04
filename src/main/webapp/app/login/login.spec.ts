import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { ElementRef, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Navigation, Router, provideRouter } from '@angular/router';

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
 * The sign-in field, **rendered**.
 *
 * <p>Every case above calls `comp.login()` on a patched `FormGroup` and never puts the template on
 * the page, so the input's own attributes were unasserted for as long as the screen has existed —
 * which is how it shipped as `type="email"` while the two logins that matter most are not emails.
 * `admin` is what `AdminBootstrapInitializer` creates for production's first administrator and what
 * the dev and quality seeds create; the gateway's `LOGIN_REGEX` admits a bare login by a dedicated
 * alternative, and `DomainUserDetailsService` branches on `login.contains("@")` and accepts either.
 *
 * <p><b>The field was never blocking submission and that is worth recording, because the obvious
 * mechanism is the wrong one.</b> `ReactiveFormsModule` exports `ɵNgNoValidate`, whose host binding
 * puts `novalidate` on any `<form>` carrying neither `ngNoForm` nor `ngNativeValidate` — so native
 * constraint validation was already off and the browser would not have refused `admin`. The type is
 * wrong for what it tells the person reading the label, the keyboard a phone offers and what an
 * autofill agent believes the field holds; it is not wrong because it broke sign-in. A fix argued
 * from "it blocks submission" would be reverted the first time someone checked.
 *
 * <p>This TestBed is its own rather than reusing the one above: rendering needs `provideRouter` for
 * the forgot-password `RouterLink`, and an `identity()` that returns something, which the stub above
 * deliberately does not have.
 */
describe('Login form', () => {
  let fixture: ComponentFixture<Login>;
  let loginService: LoginService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideTranslateService(),
        // `dashboard` is declared, not an empty route table: a successful sign-in navigates there,
        // and an unmatched URL rejects out of band as an unhandled error that no assertion sees.
        provideRouter([{ path: 'dashboard', children: [] }]),
        {
          provide: AccountService,
          useValue: {
            identity: vitest.fn(() => of(null)),
            isAuthenticated: vitest.fn(() => false),
          },
        },
        {
          provide: LoginService,
          useValue: { login: vitest.fn(() => of({})) },
        },
      ],
    });

    fixture = TestBed.createComponent(Login);
    loginService = TestBed.inject(LoginService);
    fixture.detectChanges();
  });

  it('does not declare the login field as an email address', () => {
    const username = fixture.nativeElement.querySelector('input#username');

    expect(username).toBeTruthy();
    // Asserted as "not email" as well as "is text", because the failure is the constraint, not the
    // particular replacement — `search` or `username` would be fine and `email` is what is not.
    expect(username.getAttribute('type')).not.toBe('email');
    expect(username.getAttribute('type')).toBe('text');
    // The autocomplete hint is the half that was right and has to stay: it is what makes a password
    // manager offer the saved credential for this site.
    expect(username.getAttribute('autocomplete')).toBe('username');
  });

  it('signs in with a bare login typed into the form', () => {
    const username = fixture.nativeElement.querySelector('input#username');
    const password = fixture.nativeElement.querySelector('input#password');

    username.value = 'admin';
    username.dispatchEvent(new Event('input'));
    password.value = 'Admin@01234';
    password.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));

    expect(loginService.login).toHaveBeenCalledWith({
      username: 'admin',
      password: 'Admin@01234',
      rememberMe: false,
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
   * A cheap tripwire for the one reintroduction that has actually happened. `login.ts` has the
   * reasoning; the short version is that a second request from this screen 401s and
   * `authExpiredInterceptor` bounces the caller to `/login`.
   *
   * <p><b>This is not the regression net, and it must not be mistaken for one</b> — it was, until
   * a review pointed out that it is a string blacklist: reintroduce the call through `HttpClient`
   * directly, or through any other service, and it stays green. The property that matters is "this
   * screen makes exactly one backend request, and it is `api/account`", which needs a browser and a
   * real interceptor chain to observe; `login.cy.ts`'s first case asserts it with `cy.intercept` and
   * fails on any import path at all. What this one adds is speed and a name: it goes red in
   * `npm test`, before anybody runs Cypress, and it says which service it was.
   *
   * <p>Read out of the source rather than through the TestBed, because the failure is a request
   * being made at all — a spec that stubs the service to observe it would be satisfied by the very
   * call that must not happen. The **import specifier** is asserted, not the class name: the class
   * name appears in `login.ts`'s own explanation of why the call went, and a check a historical note
   * cannot survive is a check that gets the note deleted instead.
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
