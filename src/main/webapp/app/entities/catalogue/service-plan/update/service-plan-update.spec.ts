import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { provideTranslateService } from '@ngx-translate/core';
import { Subject, from, of } from 'rxjs';

import { ServicePlanService } from '../service/service-plan.service';
import { IServicePlan } from '../service-plan.model';

import { ServicePlanFormService } from './service-plan-form.service';
import { ServicePlanUpdate } from './service-plan-update';

describe('ServicePlan Management Update Component', () => {
  let comp: ServicePlanUpdate;
  let fixture: ComponentFixture<ServicePlanUpdate>;
  let activatedRoute: ActivatedRoute;
  let servicePlanFormService: ServicePlanFormService;
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

    fixture = TestBed.createComponent(ServicePlanUpdate);
    activatedRoute = TestBed.inject(ActivatedRoute);
    servicePlanFormService = TestBed.inject(ServicePlanFormService);
    servicePlanService = TestBed.inject(ServicePlanService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should update editForm', () => {
      const servicePlan: IServicePlan = { id: '674a82c7-e597-42ce-8bcb-558e5170756f' };

      activatedRoute.data = of({ servicePlan });
      comp.ngOnInit();

      expect(comp.servicePlan).toEqual(servicePlan);
    });
  });

  describe('save', () => {
    it('should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<IServicePlan>();
      const servicePlan = { id: 'b5e0e540-7a57-41f1-8c7d-7faaae191154' };
      vitest.spyOn(servicePlanFormService, 'getServicePlan').mockReturnValue(servicePlan);
      vitest.spyOn(servicePlanService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ servicePlan });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(servicePlan);
      saveSubject.complete();

      // THEN
      expect(servicePlanFormService.getServicePlan).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(servicePlanService.update).toHaveBeenCalledWith(expect.objectContaining(servicePlan));
      expect(comp.isSaving()).toEqual(false);
    });

    it('should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<IServicePlan>();
      const servicePlan = { id: 'b5e0e540-7a57-41f1-8c7d-7faaae191154' };
      vitest.spyOn(servicePlanFormService, 'getServicePlan').mockReturnValue({ id: null });
      vitest.spyOn(servicePlanService, 'create').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ servicePlan: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(servicePlan);
      saveSubject.complete();

      // THEN
      expect(servicePlanFormService.getServicePlan).toHaveBeenCalled();
      expect(servicePlanService.create).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<IServicePlan>();
      const servicePlan = { id: 'b5e0e540-7a57-41f1-8c7d-7faaae191154' };
      vitest.spyOn(servicePlanService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ servicePlan });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(servicePlanService.update).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });
});
