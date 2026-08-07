import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';

import { sampleWithNewData, sampleWithRequiredData } from '../care-activity.test-samples';

import { CareActivityFormService } from './care-activity-form.service';

describe('CareActivity Form Service', () => {
  let service: CareActivityFormService;

  beforeEach(() => {
    service = TestBed.inject(CareActivityFormService);
  });

  describe('Service methods', () => {
    describe('createCareActivityFormGroup', () => {
      it('should create a new form with FormControl', () => {
        const formGroup = service.createCareActivityFormGroup();

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            name: expect.any(Object),
            description: expect.any(Object),
            occurredOn: expect.any(Object),
            patient: expect.any(Object),
          }),
        );
      });

      it('passing ICareActivity should create a new form with FormGroup', () => {
        const formGroup = service.createCareActivityFormGroup(sampleWithRequiredData);

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            name: expect.any(Object),
            description: expect.any(Object),
            occurredOn: expect.any(Object),
            patient: expect.any(Object),
          }),
        );
      });
    });

    describe('getCareActivity', () => {
      it('should return NewCareActivity for default CareActivity initial value', () => {
        const formGroup = service.createCareActivityFormGroup(sampleWithNewData);

        const careActivity = service.getCareActivity(formGroup);

        expect(careActivity).toMatchObject(sampleWithNewData);
      });

      it('should return NewCareActivity for empty CareActivity initial value', () => {
        const formGroup = service.createCareActivityFormGroup();

        const careActivity = service.getCareActivity(formGroup);

        expect(careActivity).toMatchObject({});
      });

      it('should return ICareActivity', () => {
        const formGroup = service.createCareActivityFormGroup(sampleWithRequiredData);

        const careActivity = service.getCareActivity(formGroup);

        expect(careActivity).toMatchObject(sampleWithRequiredData);
      });
    });

    describe('resetForm', () => {
      it('passing ICareActivity should not enable id FormControl', () => {
        const formGroup = service.createCareActivityFormGroup();
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, sampleWithRequiredData);

        expect(formGroup.controls.id.disabled).toBe(true);
      });

      it('passing NewCareActivity should disable id FormControl', () => {
        const formGroup = service.createCareActivityFormGroup(sampleWithRequiredData);
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, { id: null });

        expect(formGroup.controls.id.disabled).toBe(true);
      });
    });
  });
});
