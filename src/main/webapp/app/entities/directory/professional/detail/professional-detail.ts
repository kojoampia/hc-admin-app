import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';

import { Alert } from 'app/shared/alert/alert';
import { AlertError } from 'app/shared/alert/alert-error';
import { FormatMediumDatePipe } from 'app/shared/date';
import { TranslateDirective } from 'app/shared/language';
import { IProfessional } from '../professional.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-professional-detail',
  templateUrl: './professional-detail.html',
  imports: [FontAwesomeModule, Alert, AlertError, TranslateDirective, TranslatePipe, RouterLink, FormatMediumDatePipe],
})
export class ProfessionalDetail {
  readonly professional = input<IProfessional | null>(null);

  previousState(): void {
    globalThis.history.back();
  }
}
