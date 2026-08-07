import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';

import { Alert } from 'app/shared/alert/alert';
import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';
import { IPlanFeature } from '../plan-feature.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-plan-feature-detail',
  templateUrl: './plan-feature-detail.html',
  imports: [FontAwesomeModule, Alert, AlertError, TranslateDirective, TranslatePipe, RouterLink],
})
export class PlanFeatureDetail {
  readonly planFeature = input<IPlanFeature | null>(null);

  previousState(): void {
    globalThis.history.back();
  }
}
