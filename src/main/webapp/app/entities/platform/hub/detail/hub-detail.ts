import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';

import { Alert } from 'app/shared/alert/alert';
import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';
import { IHub } from '../hub.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-hub-detail',
  templateUrl: './hub-detail.html',
  imports: [FontAwesomeModule, Alert, AlertError, TranslateDirective, TranslatePipe, RouterLink],
})
export class HubDetail {
  readonly hub = input<IHub | null>(null);

  previousState(): void {
    globalThis.history.back();
  }
}
