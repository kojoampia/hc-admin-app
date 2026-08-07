import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';

import { Alert } from 'app/shared/alert/alert';
import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';
import { IPlatformService } from '../platform-service.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-platform-service-detail',
  templateUrl: './platform-service-detail.html',
  imports: [FontAwesomeModule, Alert, AlertError, TranslateDirective, TranslatePipe, RouterLink],
})
export class PlatformServiceDetail {
  readonly platformService = input<IPlatformService | null>(null);

  previousState(): void {
    globalThis.history.back();
  }
}
