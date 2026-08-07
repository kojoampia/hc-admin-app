import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';

import { Alert } from 'app/shared/alert/alert';
import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';
import { IServiceActivity } from '../service-activity.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-service-activity-detail',
  templateUrl: './service-activity-detail.html',
  imports: [FontAwesomeModule, Alert, AlertError, TranslateDirective, TranslatePipe, RouterLink],
})
export class ServiceActivityDetail {
  readonly serviceActivity = input<IServiceActivity | null>(null);

  previousState(): void {
    globalThis.history.back();
  }
}
