import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';

import { FormatMediumDatetimePipe } from 'app/shared/date';
import { TranslateDirective } from 'app/shared/language';
import { IProfessionalUser } from '../professional.model';

@Component({
  selector: 'abf-professional-account-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './detail.html',
  styleUrls: ['./design.scss'],
  imports: [RouterLink, FontAwesomeModule, TranslateDirective, TranslatePipe, FormatMediumDatetimePipe],
})
export class ProfessionalAccountDetail {
  /** Resolved by the route, bound through withComponentInputBinding(). */
  readonly professional = input<IProfessionalUser | null>(null);
}
