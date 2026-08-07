import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';

import { sampleWithNewData, sampleWithRequiredData } from '../service-activity.test-samples';

import { ServiceActivityFormService } from './service-activity-form.service';

describe('ServiceActivity Form Service', () => {
  let service: ServiceActivityFormService;

  beforeEach(() => {
    service = TestBed.inject(ServiceActivityFormService);
  });

  describe('Service methods', () => {
    describe('createServiceActivityFormGroup', () => {
      it('should create a new form with FormControl', () => {
        const formGroup = service.createServiceActivityFormGroup();

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            name: expect.any(Object),
            unit: expect.any(Object),
            unitPrice: expect.any(Object),
            duration: expect.any(Object),
            published: expect.any(Object),
            category: expect.any(Object),
          }),
        );
      });

      it('passing IServiceActivity should create a new form with FormGroup', () => {
        const formGroup = service.createServiceActivityFormGroup(sampleWithRequiredData);

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            name: expect.any(Object),
            unit: expect.any(Object),
            unitPrice: expect.any(Object),
            duration: expect.any(Object),
            published: expect.any(Object),
            category: expect.any(Object),
          }),
        );
      });
    });

    describe('getServiceActivity', () => {
      it('should return NewServiceActivity for default ServiceActivity initial value', () => {
        const formGroup = service.createServiceActivityFormGroup(sampleWithNewData);

        const serviceActivity = service.getServiceActivity(formGroup);

        expect(serviceActivity).toMatchObject(sampleWithNewData);
      });

      it('should return NewServiceActivity for empty ServiceActivity initial value', () => {
        const formGroup = service.createServiceActivityFormGroup();

        const serviceActivity = service.getServiceActivity(formGroup);

        expect(serviceActivity).toMatchObject({});
      });

      it('should return IServiceActivity', () => {
        const formGroup = service.createServiceActivityFormGroup(sampleWithRequiredData);

        const serviceActivity = service.getServiceActivity(formGroup);

        expect(serviceActivity).toMatchObject(sampleWithRequiredData);
      });
    });

    describe('resetForm', () => {
      it('passing IServiceActivity should not enable id FormControl', () => {
        const formGroup = service.createServiceActivityFormGroup();
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, sampleWithRequiredData);

        expect(formGroup.controls.id.disabled).toBe(true);
      });

      it('passing NewServiceActivity should disable id FormControl', () => {
        const formGroup = service.createServiceActivityFormGroup(sampleWithRequiredData);
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, { id: null });

        expect(formGroup.controls.id.disabled).toBe(true);
      });
    });
  });
});
