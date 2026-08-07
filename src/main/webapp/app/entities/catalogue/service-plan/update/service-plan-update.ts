import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable, finalize } from 'rxjs';

import { PlanTier } from 'app/entities/enumerations/plan-tier.model';
import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';
import { ServicePlanService } from '../service/service-plan.service';
import { IServicePlan } from '../service-plan.model';

import { ServicePlanFormGroup, ServicePlanFormService } from './service-plan-form.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-service-plan-update',
  templateUrl: './service-plan-update.html',
  imports: [TranslateDirective, TranslatePipe, FontAwesomeModule, AlertError, ReactiveFormsModule],
})
export class ServicePlanUpdate implements OnInit {
  readonly isSaving = signal(false);
  servicePlan: IServicePlan | null = null;
  planTierValues = Object.keys(PlanTier);

  protected servicePlanService = inject(ServicePlanService);
  protected servicePlanFormService = inject(ServicePlanFormService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: ServicePlanFormGroup = this.servicePlanFormService.createServicePlanFormGroup();

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ servicePlan }) => {
      this.servicePlan = servicePlan;
      if (servicePlan) {
        this.updateForm(servicePlan);
      }
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const servicePlan = this.servicePlanFormService.getServicePlan(this.editForm);
    if (servicePlan.id === null) {
      this.subscribeToSaveResponse(this.servicePlanService.create(servicePlan));
    } else {
      this.subscribeToSaveResponse(this.servicePlanService.update(servicePlan));
    }
  }

  protected subscribeToSaveResponse(result: Observable<IServicePlan | null>): void {
    result.pipe(finalize(() => this.onSaveFinalize())).subscribe({
      next: () => this.onSaveSuccess(),
      error: () => this.onSaveError(),
    });
  }

  protected onSaveSuccess(): void {
    this.previousState();
  }

  protected onSaveError(): void {
    // Api for inheritance.
  }

  protected onSaveFinalize(): void {
    this.isSaving.set(false);
  }

  protected updateForm(servicePlan: IServicePlan): void {
    this.servicePlan = servicePlan;
    this.servicePlanFormService.resetForm(this.editForm, servicePlan);
  }
}
