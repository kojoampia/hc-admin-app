import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';

import { FormatMediumDatetimePipe } from 'app/shared/date';
import { TranslateDirective } from 'app/shared/language';

import { IUser } from '../user-management.model';

@Component({
  selector: 'abf-user-mgmt-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-management-detail.html',
  imports: [RouterLink, FontAwesomeModule, TranslateDirective, TranslatePipe, FormatMediumDatetimePipe],
})
export default class UserManagementDetail {
  /** Resolved by the route, bound through withComponentInputBinding(). */
  readonly user = input<IUser | null>(null);
}
