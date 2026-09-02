import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { TranslatePipe } from '@ngx-translate/core';

import { PasswordResetService } from 'app/account/reset/password-reset.service';
import { TranslateDirective } from 'app/shared/language';

/**
 * "I forgot my password" — the entry point to `POST /api/account/reset-password/init`.
 *
 * <p>Signed out and full-bleed, like the sign-in page it links back to, and routed at top level for
 * the same reason: `/account` carries `UserRouteAccessService`, and somebody who cannot sign in
 * cannot pass an authentication guard. See the routes for the rest of that argument.
 *
 * <p><b>Success here does not mean the address is registered.</b> The gateway answers 200 either
 * way — deliberately, so that this form cannot be used to enumerate accounts — and this screen must
 * not undo that by reporting anything narrower than "if that address is ours, a mail is on its way".
 * `reset.request.messages.success` is already worded that way ("Check your email for details…") and
 * should stay so.
 *
 * <p>The error branch therefore covers transport failures only, and it deliberately shows the same
 * message as success would not: a 500 that renders as "check your email" would leave somebody
 * waiting for a mail that was never sent.
 */
@Component({
  selector: 'abf-password-reset-request',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, TranslateDirective, TranslatePipe],
  templateUrl: './password-reset-request.html',
  styleUrl: './password-reset-request.scss',
})
export default class PasswordResetRequest implements AfterViewInit {
  readonly email = viewChild.required<ElementRef>('email');

  readonly success = signal(false);
  readonly failed = signal(false);
  readonly submitting = signal(false);

  // 5 and 254 mirror `global.messages.validate.email.{minlength,maxlength}`, which already carry the
  // matching copy. The gateway does not constrain the address here at all — it looks it up and says
  // nothing — so these are the client's own guard against an obvious typo, not a contract.
  requestForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(5), Validators.maxLength(254), Validators.email],
    }),
  });

  private readonly passwordResetService = inject(PasswordResetService);

  ngAfterViewInit(): void {
    this.email().nativeElement.focus();
  }

  requestReset(): void {
    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.failed.set(false);
    this.passwordResetService.init(this.requestForm.getRawValue().email).subscribe({
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
