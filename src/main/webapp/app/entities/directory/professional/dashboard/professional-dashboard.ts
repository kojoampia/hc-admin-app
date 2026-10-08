import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import { TranslateDirective } from 'app/shared/language';

import { ProfessionalAccountComponent } from '../account/list';
import { ProfessionalProfileComponent } from '../profile/professional-profile';

/**
 * The professionals screen: the gateway's accounts above, the service's profiles below.
 *
 * It owns no data and holds no state. Both halves are the components that serve
 * `/professional/account` and `/professional/profile` in their own right, embedded here so the two
 * sides of a clinician — the account that signs in and the profile that describes them — read as
 * one page. Each fetches, sorts and pages itself.
 *
 * ⚠ THERE IS NO `CUSTOM_ELEMENTS_SCHEMA` HERE, AND ADDING ONE BACK WOULD SHIP THIS SCREEN BLANK
 * AGAIN. That is not a hypothetical: `imports` held `[RouterLink]` alone while the template used
 * six declarables, so `<abf-professional-account>` and `<abf-professional-profile>` were unknown
 * elements — and the schema turns "not a known element" from a compile error into an inert tag.
 * The result was two empty cards, a green `ng build`, a passing spec and nothing in any log. A
 * missing import must be a build failure on this component.
 *
 * ⚠ Both children read and write the SAME `sort` and `page` query params, because nested here they
 * share this route's `ActivatedRoute`. Sorting the profiles writes `?sort=…` without `page`, which
 * resets the account pager to page 1; sorting the accounts by `login` asks the profile list to sort
 * on a field a profile has not got. Nothing fails — the two tables visibly disturb each other.
 * Namespacing the params per child is the fix and is deliberately not done here, because it changes
 * two components that also serve their own routes.
 */
@Component({
  selector: 'abf-professional-dashboard',
  imports: [RouterLink, FontAwesomeModule, TranslateDirective, ProfessionalAccountComponent, ProfessionalProfileComponent],
  templateUrl: './professional-dashboard.html',
  styleUrls: ['./professional-dashboard.scss'],
  standalone: true,
})
export class ProfessionalDashboardComponent {}
