import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';

import { sampleWithNewData, sampleWithRequiredData } from '../service-plan.test-samples';

import { ServicePlanFormService } from './service-plan-form.service';

describe('ServicePlan Form Service', () => {
  let service: ServicePlanFormService;

  beforeEach(() => {
    service = TestBed.inject(ServicePlanFormService);
  });

  describe('Service methods', () => {
    describe('createServicePlanFormGroup', () => {
      it('should create a new form with FormControl', () => {
        const formGroup = service.createServicePlanFormGroup();

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            name: expect.any(Object),
            tier: expect.any(Object),
            tierLabel: expect.any(Object),
            monthlyPrice: expect.any(Object),
            currency: expect.any(Object),
            summary: expect.any(Object),
            featured: expect.any(Object),
          }),
        );
      });

      it('passing IServicePlan should create a new form with FormGroup', () => {
        const formGroup = service.createServicePlanFormGroup(sampleWithRequiredData);

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            name: expect.any(Object),
            tier: expect.any(Object),
            tierLabel: expect.any(Object),
            monthlyPrice: expect.any(Object),
            currency: expect.any(Object),
            summary: expect.any(Object),
            featured: expect.any(Object),
          }),
        );
      });
    });

    describe('getServicePlan', () => {
      it('should return NewServicePlan for default ServicePlan initial value', () => {
        const formGroup = service.createServicePlanFormGroup(sampleWithNewData);

        const servicePlan = service.getServicePlan(formGroup);

        expect(servicePlan).toMatchObject(sampleWithNewData);
      });

      it('should return NewServicePlan for empty ServicePlan initial value', () => {
        const formGroup = service.createServicePlanFormGroup();

        const servicePlan = service.getServicePlan(formGroup);

        expect(servicePlan).toMatchObject({});
      });

      it('should return IServicePlan', () => {
        const formGroup = service.createServicePlanFormGroup(sampleWithRequiredData);

        const servicePlan = service.getServicePlan(formGroup);

        expect(servicePlan).toMatchObject(sampleWithRequiredData);
      });
    });

    describe('resetForm', () => {
      it('passing IServicePlan should not enable id FormControl', () => {
        const formGroup = service.createServicePlanFormGroup();
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, sampleWithRequiredData);

        expect(formGroup.controls.id.disabled).toBe(true);
      });

      it('passing NewServicePlan should disable id FormControl', () => {
        const formGroup = service.createServicePlanFormGroup(sampleWithRequiredData);
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, { id: null });

        expect(formGroup.controls.id.disabled).toBe(true);
      });
    });
  });
});
