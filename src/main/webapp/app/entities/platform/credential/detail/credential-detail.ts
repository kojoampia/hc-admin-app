import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';

import { Alert } from 'app/shared/alert/alert';
import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';
import { ICredential } from '../credential.model';
import { CredentialService } from '../service/credential.service';

/**
 * The signed-in account, read from the gateway.
 *
 * Loads its own record rather than taking a resolved input, because there is no id to resolve
 * against: `GET /api/account` answers with the caller's account and there is no other one to ask
 * for. That is also why this screen is read-only — the gateway owns these records, and the console
 * changing them would need `/api/admin/users`, which `admin/user-management/` already does.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-credential-detail',
  templateUrl: './credential-detail.html',
  imports: [FontAwesomeModule, Alert, AlertError, TranslateDirective, TranslatePipe],
})
export class CredentialDetail {
  readonly credential = signal<ICredential | null>(null);
  readonly isLoading = signal(true);

  private readonly credentialService = inject(CredentialService);

  constructor() {
    this.credentialService.find().subscribe({
      next: credential => {
        this.credential.set(credential);
        this.isLoading.set(false);
      },
      // The error interceptor raises the alert; this only stops the spinner.
      error: () => this.isLoading.set(false),
    });
  }

  previousState(): void {
    globalThis.history.back();
  }
}
