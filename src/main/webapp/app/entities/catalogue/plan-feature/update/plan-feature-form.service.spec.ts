import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';

import { sampleWithNewData, sampleWithRequiredData } from '../plan-feature.test-samples';

import { PlanFeatureFormService } from './plan-feature-form.service';

describe('PlanFeature Form Service', () => {
  let service: PlanFeatureFormService;

  beforeEach(() => {
    service = TestBed.inject(PlanFeatureFormService);
  });

  describe('Service methods', () => {
    describe('createPlanFeatureFormGroup', () => {
      it('should create a new form with FormControl', () => {
        const formGroup = service.createPlanFeatureFormGroup();

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            label: expect.any(Object),
            position: expect.any(Object),
            plan: expect.any(Object),
          }),
        );
      });

      it('passing IPlanFeature should create a new form with FormGroup', () => {
        const formGroup = service.createPlanFeatureFormGroup(sampleWithRequiredData);

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            label: expect.any(Object),
            position: expect.any(Object),
            plan: expect.any(Object),
          }),
        );
      });
    });

    describe('getPlanFeature', () => {
      it('should return NewPlanFeature for default PlanFeature initial value', () => {
        const formGroup = service.createPlanFeatureFormGroup(sampleWithNewData);

        const planFeature = service.getPlanFeature(formGroup);

        expect(planFeature).toMatchObject(sampleWithNewData);
      });

      it('should return NewPlanFeature for empty PlanFeature initial value', () => {
        const formGroup = service.createPlanFeatureFormGroup();

        const planFeature = service.getPlanFeature(formGroup);

        expect(planFeature).toMatchObject({});
      });

      it('should return IPlanFeature', () => {
        const formGroup = service.createPlanFeatureFormGroup(sampleWithRequiredData);

        const planFeature = service.getPlanFeature(formGroup);

        expect(planFeature).toMatchObject(sampleWithRequiredData);
      });
    });

    describe('resetForm', () => {
      it('passing IPlanFeature should not enable id FormControl', () => {
        const formGroup = service.createPlanFeatureFormGroup();
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, sampleWithRequiredData);

        expect(formGroup.controls.id.disabled).toBe(true);
      });

      it('passing NewPlanFeature should disable id FormControl', () => {
        const formGroup = service.createPlanFeatureFormGroup(sampleWithRequiredData);
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, { id: null });

        expect(formGroup.controls.id.disabled).toBe(true);
      });
    });
  });
});
