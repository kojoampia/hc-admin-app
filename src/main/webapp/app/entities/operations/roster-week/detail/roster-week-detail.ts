import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';

import { Alert } from 'app/shared/alert/alert';
import { AlertError } from 'app/shared/alert/alert-error';
import { FormatMediumDatePipe, FormatMediumDatetimePipe } from 'app/shared/date';
import { TranslateDirective } from 'app/shared/language';
import { IRosterWeek } from '../roster-week.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-roster-week-detail',
  templateUrl: './roster-week-detail.html',
  imports: [
    FontAwesomeModule,
    Alert,
    AlertError,
    TranslateDirective,
    TranslatePipe,
    RouterLink,
    FormatMediumDatetimePipe,
    FormatMediumDatePipe,
  ],
})
export class RosterWeekDetail {
  readonly rosterWeek = input<IRosterWeek | null>(null);

  previousState(): void {
    globalThis.history.back();
  }
}
