import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';

import { Alert } from 'app/shared/alert/alert';
import { AlertError } from 'app/shared/alert/alert-error';
import { FormatMediumDatetimePipe } from 'app/shared/date';
import { TranslateDirective } from 'app/shared/language';
import { ICredential } from '../credential.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-credential-detail',
  templateUrl: './credential-detail.html',
  imports: [FontAwesomeModule, Alert, AlertError, TranslateDirective, TranslatePipe, RouterLink, FormatMediumDatetimePipe],
})
export class CredentialDetail {
  readonly credential = input<ICredential | null>(null);

  previousState(): void {
    globalThis.history.back();
  }
}
