import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';

import { FormatMediumDatePipe } from 'app/shared/date';
import { TranslateDirective } from 'app/shared/language';
import { IProfessionalProfile } from '../professional.model';
import { AlertError } from 'app/shared/alert/alert-error';
import { Alert } from 'app/shared/alert/alert';

@Component({
  selector: 'abf-professional-profile-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './detail.html',
  styleUrls: ['./professional-profile.scss'],
  imports: [RouterLink, FontAwesomeModule, TranslateDirective, TranslatePipe, FormatMediumDatePipe, Alert, AlertError],
})
export class ProfessionalProfileDetail {
  /** Resolved by the route, bound through withComponentInputBinding(). */
  readonly professional = input<IProfessionalProfile | null>(null);

  previousState(): void {
    globalThis.history.back();
  }
}
