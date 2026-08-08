import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnInit, inject, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { TranslatePipe } from '@ngx-translate/core';

import { AccountService } from 'app/core/auth/account.service';
import { LoginService } from 'app/login/login.service';
import { TranslateDirective } from 'app/shared/language';

import { ConsoleMetricsService } from 'app/console/shared/console-metrics.service';

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
 */
@Component({
  selector: 'abf-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateDirective, TranslatePipe, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export default class Login implements OnInit, AfterViewInit {
  username = viewChild.required<ElementRef>('username');

  readonly authenticationError = signal(false);
  readonly networkTotals = signal<{ patients: number; professionals: number; vendors: number } | null>(null);
  readonly servicesLive = signal(0);

  loginForm = new FormGroup({
    username: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    rememberMe: new FormControl(false, { nonNullable: true, validators: [Validators.required] }),
  });

  private readonly accountService = inject(AccountService);
  private readonly loginService = inject(LoginService);
  private readonly metricsService = inject(ConsoleMetricsService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    // if already authenticated then navigate to the console
    this.accountService.identity().subscribe(() => {
      if (this.accountService.isAuthenticated()) {
        void this.router.navigate(['/dashboard']);
      }
    });

    // The brand panel's four figures are the real network totals, not copy.
    this.metricsService.metrics().subscribe({
      next: metrics => {
        this.networkTotals.set(metrics.network);
        this.servicesLive.set(metrics.platformServices.total);
      },
      error: () => undefined,
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
