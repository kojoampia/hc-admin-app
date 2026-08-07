import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnInit, inject, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { TranslatePipe } from '@ngx-translate/core';

import { AccountService } from 'app/core/auth/account.service';
import { LoginService } from 'app/login/login.service';
import { TranslateDirective } from 'app/shared/language';
import { CONSOLE_ROLES, roleByKey } from 'app/shared/auth/console-role';

import { ConsoleMetricsService } from 'app/console/shared/console-metrics.service';

/**
 * The console sign-in.
 *
 * The prototype's "Sign in as" select is kept, because choosing the role is
 * how the demo is meant to be explored. Here it is not cosmetic: picking a
 * role sets the username, and the username is what the token's authorities
 * are issued from, so the console really does come up read-only as a
 * supervisor.
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

  readonly roles = CONSOLE_ROLES;
  readonly authenticationError = signal(false);
  readonly networkTotals = signal<{ patients: number; professionals: number; vendors: number } | null>(null);
  readonly servicesLive = signal(0);

  loginForm = new FormGroup({
    username: new FormControl(CONSOLE_ROLES[0].login, { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('demopassword', { nonNullable: true, validators: [Validators.required] }),
    rememberMe: new FormControl(false, { nonNullable: true, validators: [Validators.required] }),
    roleKey: new FormControl(CONSOLE_ROLES[0].key, { nonNullable: true }),
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

  /** Choosing a role rewrites the username it will actually sign in with. */
  onRoleChange(key: string): void {
    const role = roleByKey(key);
    this.loginForm.patchValue({ roleKey: role.key, username: role.login });
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
