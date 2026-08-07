import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';

import { Alert } from 'app/shared/alert/alert';
import { AlertError } from 'app/shared/alert/alert-error';
import { FormatMediumDatePipe } from 'app/shared/date';
import { TranslateDirective } from 'app/shared/language';
import { ICareActivity } from '../care-activity.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-care-activity-detail',
  templateUrl: './care-activity-detail.html',
  imports: [FontAwesomeModule, Alert, AlertError, TranslateDirective, TranslatePipe, RouterLink, FormatMediumDatePipe],
})
export class CareActivityDetail {
  readonly careActivity = input<ICareActivity | null>(null);

  previousState(): void {
    globalThis.history.back();
  }
}
