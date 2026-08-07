import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { TranslatePipe } from '@ngx-translate/core';

import { TranslateDirective } from 'app/shared/language';

import { UserManagementService } from '../service/user-management.service';
import { IUser } from '../user-management.model';

const LOGIN_PATTERN = /^[a-zA-Z0-9!$&*+=?^_`{|}~.-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$|^[_.@A-Za-z0-9-]+$/;

/**
 * Create or edit a gateway Account.
 *
 * Authorities are offered from `GET /api/authorities` rather than a constant:
 * the gateway decides which roles exist, and a console that offers one it
 * does not recognise produces a save that fails at the boundary.
 *
 * There is deliberately no password field. The gateway owns credentials; this
 * screen manages the account record and its authorities. Handing an
 * administrator a box that sets someone else's password is a different
 * feature with different consequences, and JHipster's stock module does not
 * do it either.
 */
@Component({
  selector: 'abf-user-mgmt-update',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-management-update.html',
  imports: [ReactiveFormsModule, TranslateDirective, TranslatePipe],
})
export default class UserManagementUpdate implements OnInit {
  /** Resolved by the route; null when creating. */
  readonly user = input<IUser | null>(null);

  readonly authorities = signal<string[]>([]);
  readonly isSaving = signal(false);

  editForm = new FormGroup({
    id: new FormControl<string | null>(null),
    login: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(1), Validators.maxLength(50), Validators.pattern(LOGIN_PATTERN)],
    }),
    firstName: new FormControl<string | null>(null, { validators: [Validators.maxLength(50)] }),
    lastName: new FormControl<string | null>(null, { validators: [Validators.maxLength(50)] }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(5), Validators.maxLength(254), Validators.email],
    }),
    activated: new FormControl(true, { nonNullable: true }),
    langKey: new FormControl('en', { nonNullable: true }),
    authorities: new FormControl<string[]>([], { nonNullable: true }),
  });

  private readonly userService = inject(UserManagementService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    const user = this.user();
    if (user) {
      this.editForm.reset({
        id: user.id,
        login: user.login ?? '',
        firstName: user.firstName ?? null,
        lastName: user.lastName ?? null,
        email: user.email ?? '',
        activated: user.activated ?? true,
        langKey: user.langKey ?? 'en',
        authorities: user.authorities ?? [],
      });
    }
    this.userService.authorities().subscribe(authorities => this.authorities.set(authorities));
  }

  previousState(): void {
    window.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const user = this.editForm.getRawValue();

    // An existing account is a PUT and keeps its id; a new one is a POST with
    // none. The gateway distinguishes them the same way.
    const request = user.id ? this.userService.update(user) : this.userService.create({ ...user, id: null });

    request.subscribe({
      next: () => this.onSaveSuccess(),
      error: () => this.isSaving.set(false),
    });
  }

  private onSaveSuccess(): void {
    this.isSaving.set(false);
    void this.router.navigate(['/admin/user-management']);
  }
}
