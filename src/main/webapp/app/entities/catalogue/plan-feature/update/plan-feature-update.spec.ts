import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { HttpResponse } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { provideTranslateService } from '@ngx-translate/core';
import { Subject, from, of } from 'rxjs';

import { ServicePlanService } from 'app/entities/catalogue/service-plan/service/service-plan.service';
import { IServicePlan } from 'app/entities/catalogue/service-plan/service-plan.model';
import { IPlanFeature } from '../plan-feature.model';
import { PlanFeatureService } from '../service/plan-feature.service';

import { PlanFeatureFormService } from './plan-feature-form.service';
import { PlanFeatureUpdate } from './plan-feature-update';

describe('PlanFeature Management Update Component', () => {
  let comp: PlanFeatureUpdate;
  let fixture: ComponentFixture<PlanFeatureUpdate>;
  let activatedRoute: ActivatedRoute;
  let planFeatureFormService: PlanFeatureFormService;
  let planFeatureService: PlanFeatureService;
  let servicePlanService: ServicePlanService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideTranslateService(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            params: from([{}]),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(PlanFeatureUpdate);
    activatedRoute = TestBed.inject(ActivatedRoute);
    planFeatureFormService = TestBed.inject(PlanFeatureFormService);
    planFeatureService = TestBed.inject(PlanFeatureService);
    servicePlanService = TestBed.inject(ServicePlanService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should call ServicePlan query and add missing value', () => {
      const planFeature: IPlanFeature = { id: 16120 };
      const plan: IServicePlan = { id: 23672 };
      planFeature.plan = plan;

      const servicePlanCollection: IServicePlan[] = [{ id: 23672 }];
      vitest.spyOn(servicePlanService, 'query').mockReturnValue(of(new HttpResponse({ body: servicePlanCollection })));
      const additionalServicePlans = [plan];
      const expectedCollection: IServicePlan[] = [...additionalServicePlans, ...servicePlanCollection];
      vitest.spyOn(servicePlanService, 'addServicePlanToCollectionIfMissing').mockReturnValue(expectedCollection);

      activatedRoute.data = of({ planFeature });
      comp.ngOnInit();

      expect(servicePlanService.query).toHaveBeenCalled();
      expect(servicePlanService.addServicePlanToCollectionIfMissing).toHaveBeenCalledWith(
        servicePlanCollection,
        ...additionalServicePlans.map(i => expect.objectContaining(i) as typeof i),
      );
      expect(comp.servicePlansSharedCollection()).toEqual(expectedCollection);
    });

    it('should update editForm', () => {
      const planFeature: IPlanFeature = { id: 16120 };
      const plan: IServicePlan = { id: 23672 };
      planFeature.plan = plan;

      activatedRoute.data = of({ planFeature });
      comp.ngOnInit();

      expect(comp.servicePlansSharedCollection()).toContainEqual(plan);
      expect(comp.planFeature).toEqual(planFeature);
    });
  });

  describe('save', () => {
    it('should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<IPlanFeature>();
      const planFeature = { id: 22331 };
      vitest.spyOn(planFeatureFormService, 'getPlanFeature').mockReturnValue(planFeature);
      vitest.spyOn(planFeatureService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ planFeature });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(planFeature);
      saveSubject.complete();

      // THEN
      expect(planFeatureFormService.getPlanFeature).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(planFeatureService.update).toHaveBeenCalledWith(expect.objectContaining(planFeature));
      expect(comp.isSaving()).toEqual(false);
    });

    it('should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<IPlanFeature>();
      const planFeature = { id: 22331 };
      vitest.spyOn(planFeatureFormService, 'getPlanFeature').mockReturnValue({ id: null });
      vitest.spyOn(planFeatureService, 'create').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ planFeature: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(planFeature);
      saveSubject.complete();

      // THEN
      expect(planFeatureFormService.getPlanFeature).toHaveBeenCalled();
      expect(planFeatureService.create).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<IPlanFeature>();
      const planFeature = { id: 22331 };
      vitest.spyOn(planFeatureService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ planFeature });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(planFeatureService.update).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });

  describe('Compare relationships', () => {
    describe('compareServicePlan', () => {
      it('should forward to servicePlanService', () => {
        const entity = { id: 23672 };
        const entity2 = { id: 11825 };
        vitest.spyOn(servicePlanService, 'compareServicePlan');
        comp.compareServicePlan(entity, entity2);
        expect(servicePlanService.compareServicePlan).toHaveBeenCalledWith(entity, entity2);
      });
    });
  });
});
