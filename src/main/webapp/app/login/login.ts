import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnInit, inject, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { TranslatePipe } from '@ngx-translate/core';

import { AccountService } from 'app/core/auth/account.service';
import { LoginService } from 'app/login/login.service';
import { TranslateDirective } from 'app/shared/language';

/**
 * The console sign-in.
 *
 * The form starts empty. It carried a prefilled username and password, and a
 * "Sign in as" select that rewrote the username, back when an in-browser mock
 * accepted any password for a known login. Against a real gateway those
 * accounts do not exist and every one of them returns 401, so the page was
 * instructing people to do something that could not work.
 *
 * CONSOLE_ROLES still drives role-aware behaviour elsewhere in the console;
 * what it must not do is decide who is signing in.
 *
 * <p><b>The brand panel's four figures are gone, as of 2026-09-02, and the request behind them with
 * them.</b> `ngOnInit` asked `ConsoleMetricsService` for the network totals, which reach
 * `/services/hcadminservice/api/dashboard/metrics` — a path the gateway gates on ROLE_ADMIN or
 * ROLE_OPERATOR. A visitor on this screen is by definition signed out and gets 401, and one who is
 * signed in is redirected to the dashboard three lines above, so the call **could not succeed for
 * anybody** and `@if (networkTotals())` rendered nothing for anybody. `login.cy.ts` had already
 * written that down as the reason it does not assert the figures.
 *
 * <p>It was not merely useless. `authExpiredInterceptor` sends any 401 whose URL is not
 * `api/account` to `/login` — correct in general, and unnoticeable here for as long as this screen
 * was a dead end. The moment it gained a link out, that 401 landing a few hundred milliseconds after
 * the page did would drag the visitor back: clicking "Did you forget your password?" quickly enough
 * navigated to `/account/reset/request` and then bounced straight to `/login`. Caught on the
 * quality stack by `password-reset.cy.ts`, and invisible to every unit spec, because it needs a real
 * gateway to answer 401 and a real interceptor chain to act on it.
 *
 * <p>So the fix is to stop making a request that cannot work, rather than to teach the interceptor
 * an exception. If the figures are ever wanted here, they need an endpoint an anonymous caller may
 * read — not a carve-out in the 401 handling.
 */
@Component({
  selector: 'abf-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateDirective, TranslatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export default class Login implements OnInit, AfterViewInit {
  username = viewChild.required<ElementRef>('username');

  readonly authenticationError = signal(false);

  loginForm = new FormGroup({
    username: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    rememberMe: new FormControl(false, { nonNullable: true, validators: [Validators.required] }),
  });

  private readonly accountService = inject(AccountService);
  private readonly loginService = inject(LoginService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    // if already authenticated then navigate to the console
    //
    // This is the only request this screen makes, and it is the one `authExpiredInterceptor`
    // deliberately exempts: its URL is `api/account`, so its 401 does not bounce the caller to
    // `/login`. See the class comment for the request that used to sit beside it and did.
    this.accountService.identity().subscribe(() => {
      if (this.accountService.isAuthenticated()) {
        void this.router.navigate(['/dashboard']);
      }
    });
  }

  ngAfterViewInit(): void {
    this.username().nativeElement.focus();
  }

  login(): void {
    const { username, password, rememberMe } = this.loginForm.getRawValue();
    this.loginService.login({ username, password, rememberMe }).subscribe({
      next: () => {
        this.authenticationError.set(false);
        if (!this.router.currentNavigation()) {
          void this.router.navigate(['/dashboard']);
        }
      },
      error: () => this.authenticationError.set(true),
    });
  }
}
