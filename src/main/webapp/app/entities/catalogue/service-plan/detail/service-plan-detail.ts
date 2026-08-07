import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';

import { Alert } from 'app/shared/alert/alert';
import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';
import { IServicePlan } from '../service-plan.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-service-plan-detail',
  templateUrl: './service-plan-detail.html',
  imports: [FontAwesomeModule, Alert, AlertError, TranslateDirective, TranslatePipe, RouterLink],
})
export class ServicePlanDetail {
  readonly servicePlan = input<IServicePlan | null>(null);

  previousState(): void {
    globalThis.history.back();
  }
}
