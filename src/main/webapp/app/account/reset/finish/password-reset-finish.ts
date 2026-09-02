import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { TranslatePipe } from '@ngx-translate/core';

import { PasswordResetService } from 'app/account/reset/password-reset.service';
import { TranslateDirective } from 'app/shared/language';

/**
 * Where an account-creation or password-reset email lands.
 *
 * <p><b>This screen is the product's only account activation path.</b> There is no
 * self-registration on this stack, so `creationEmail.html` and `passwordResetEmail.html` both build
 * `${baseUrl}/account/reset/finish?key=…` and that link is the only thing a new administrator is
 * ever sent. It 404ed from the console cutover until 2026-09-02, because `app/` was generated from
 * the same JDL as `api/` and never carried the account screens across — nothing failed to build and
 * nothing failed a test, which is why the URL in the emails is what this screen matches rather than
 * the other way round. Those links are in inboxes already; do not move the route.
 *
 * <p>Four states, and each is reachable in production:
 *
 * <ul>
 *   <li><b>No key.</b> Somebody typed the path, or a mail client mangled the query string. The form
 *       is not offered at all — a submit with an empty key can only be rejected, and a rejection
 *       reads as "your password is wrong" rather than "your link is wrong".</li>
 *   <li><b>Mismatch.</b> Checked here rather than by the server, which never sees the
 *       confirmation.</li>
 *   <li><b>Rejected.</b> A key is single-use and expires 24 hours after it is minted; the gateway
 *       reports both the same way, with no body to tell them apart, so `reset.finish.messages.error`
 *       names the 24 hours and offers the way to ask for a new one.</li>
 *   <li><b>Done.</b> The account now has a password, and the link out is the sign-in page.</li>
 * </ul>
 */
@Component({
  selector: 'abf-password-reset-finish',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, TranslateDirective, TranslatePipe],
  templateUrl: './password-reset-finish.html',
  styleUrl: './password-reset-finish.scss',
})
export default class PasswordResetFinish implements AfterViewInit {
  /**
   * The reset key, bound from `?key=` by `withComponentInputBinding()` — the same mechanism
   * `MessageThread` uses for its route parameter.
   *
   * <p><b>Declared optional, and the default may not be relied on.</b> Angular's router input binder
   * writes to every declared input on each navigation, and it writes `undefined` for one the route
   * carries no value for — so `input('')` does not survive a visit to `/account/reset/finish` with
   * no query string. It was written that way first, and the screen threw
   * `Cannot read properties of undefined (reading 'length')` out of the computed below, which
   * Angular reports to the browser console and nowhere else: the page rendered the brand panel, the
   * heading and an empty card, with neither the form nor the "key is missing" message.
   *
   * <p>This component's own spec did not catch it, because leaving an input alone exercises the
   * declared default and never the state the router produces. Found on the quality stack, which is
   * what that stack is for; `password-reset-finish.spec.ts` now sets the input explicitly.
   */
  readonly key = input<string | undefined>(undefined);

  readonly newPassword = viewChild<ElementRef>('newPassword');

  readonly success = signal(false);
  readonly failed = signal(false);
  readonly submitting = signal(false);

  /** No key means no form: see the class comment. Absent, empty and `undefined` are one state. */
  readonly keyMissing = computed(() => !this.key());

  // 4 and 100 are `ManagedUserVM.PASSWORD_MIN_LENGTH` / `PASSWORD_MAX_LENGTH` on the gateway, which
  // `AccountResource.finishPasswordReset` enforces before it even looks the key up. Outside that
  // range the server answers 400 exactly as it would for an expired key, so a password that is
  // merely too long or too short would be reported as "your link has expired" — which is why the
  // check is here as well as there.
  //
  // **The copy that reports these is shared and has to be read whenever they change.**
  // `global.messages.validate.newpassword.maxlength` said "50" against this 100 until 2026-09-02:
  // an 80-character generated password was accepted in silence and a 120-character one was refused
  // with a figure that was wrong in the other direction. Both keys now state the gateway's own
  // numbers, and this screen is their only reader. `password-reset-finish.spec.ts` covers both
  // bounds — the maximum was untested, so widening the validator to 1000 broke nothing and put the
  // very misreport this comment exists to prevent back on the screen.
  resetForm = new FormGroup({
    newPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(4), Validators.maxLength(100)],
    }),
    confirmPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(4), Validators.maxLength(100)],
    }),
  });

  private readonly passwordResetService = inject(PasswordResetService);

  ngAfterViewInit(): void {
    this.newPassword()?.nativeElement.focus();
  }

  /**
   * Whether the two boxes agree.
   *
   * <p>Deliberately not a cross-field validator on the group: the confirmation only becomes wrong
   * once somebody has typed in it, and a group-level error would disable the button while the second
   * box was still empty with nothing on screen to say why.
   */
  doesNotMatch(): boolean {
    const { newPassword, confirmPassword } = this.resetForm.getRawValue();
    return confirmPassword.length > 0 && newPassword !== confirmPassword;
  }

  finishReset(): void {
    const key = this.key();
    if (!key || this.resetForm.invalid || this.doesNotMatch()) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.failed.set(false);
    this.passwordResetService.finish(key, this.resetForm.getRawValue().newPassword).subscribe({
      next: () => {
        this.submitting.set(false);
        this.success.set(true);
      },
      error: () => {
        this.submitting.set(false);
        this.failed.set(true);
      },
    });
  }
}
