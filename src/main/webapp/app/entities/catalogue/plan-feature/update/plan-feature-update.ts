import { HttpResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable, finalize, map } from 'rxjs';

import { RELATIONSHIP_OPTIONS_PAGE_SIZE } from 'app/config/pagination.constants';
import { ServicePlanService } from 'app/entities/catalogue/service-plan/service/service-plan.service';
import { IServicePlan } from 'app/entities/catalogue/service-plan/service-plan.model';
import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';
import { IPlanFeature } from '../plan-feature.model';
import { PlanFeatureService } from '../service/plan-feature.service';

import { PlanFeatureFormGroup, PlanFeatureFormService } from './plan-feature-form.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-plan-feature-update',
  templateUrl: './plan-feature-update.html',
  imports: [TranslateDirective, TranslatePipe, FontAwesomeModule, AlertError, ReactiveFormsModule],
})
export class PlanFeatureUpdate implements OnInit {
  readonly isSaving = signal(false);
  planFeature: IPlanFeature | null = null;

  servicePlansSharedCollection = signal<IServicePlan[]>([]);

  protected planFeatureService = inject(PlanFeatureService);
  protected planFeatureFormService = inject(PlanFeatureFormService);
  protected servicePlanService = inject(ServicePlanService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: PlanFeatureFormGroup = this.planFeatureFormService.createPlanFeatureFormGroup();

  compareServicePlan = (o1: IServicePlan | null, o2: IServicePlan | null): boolean => this.servicePlanService.compareServicePlan(o1, o2);

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ planFeature }) => {
      this.planFeature = planFeature;
      if (planFeature) {
        this.updateForm(planFeature);
      }

      this.loadRelationshipsOptions();
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const planFeature = this.planFeatureFormService.getPlanFeature(this.editForm);
    if (planFeature.id === null) {
      this.subscribeToSaveResponse(this.planFeatureService.create(planFeature));
    } else {
      this.subscribeToSaveResponse(this.planFeatureService.update(planFeature));
    }
  }

  protected subscribeToSaveResponse(result: Observable<IPlanFeature | null>): void {
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

  protected updateForm(planFeature: IPlanFeature): void {
    this.planFeature = planFeature;
    this.planFeatureFormService.resetForm(this.editForm, planFeature);

    this.servicePlansSharedCollection.update(servicePlans =>
      this.servicePlanService.addServicePlanToCollectionIfMissing<IServicePlan>(servicePlans, planFeature.plan),
    );
  }

  protected loadRelationshipsOptions(): void {
    this.servicePlanService
      .query({ size: RELATIONSHIP_OPTIONS_PAGE_SIZE })
      .pipe(map((res: HttpResponse<IServicePlan[]>) => res.body ?? []))
      .pipe(
        map((servicePlans: IServicePlan[]) =>
          this.servicePlanService.addServicePlanToCollectionIfMissing<IServicePlan>(servicePlans, this.planFeature?.plan),
        ),
      )
      .subscribe((servicePlans: IServicePlan[]) => this.servicePlansSharedCollection.set(servicePlans));
  }
}
