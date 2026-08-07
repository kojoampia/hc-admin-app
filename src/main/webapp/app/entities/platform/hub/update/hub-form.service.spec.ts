import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';

import { sampleWithNewData, sampleWithRequiredData } from '../hub.test-samples';

import { HubFormService } from './hub-form.service';

describe('Hub Form Service', () => {
  let service: HubFormService;

  beforeEach(() => {
    service = TestBed.inject(HubFormService);
  });

  describe('Service methods', () => {
    describe('createHubFormGroup', () => {
      it('should create a new form with FormControl', () => {
        const formGroup = service.createHubFormGroup();

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            name: expect.any(Object),
            staffCount: expect.any(Object),
            address: expect.any(Object),
          }),
        );
      });

      it('passing IHub should create a new form with FormGroup', () => {
        const formGroup = service.createHubFormGroup(sampleWithRequiredData);

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            name: expect.any(Object),
            staffCount: expect.any(Object),
            address: expect.any(Object),
          }),
        );
      });
    });

    describe('getHub', () => {
      it('should return NewHub for default Hub initial value', () => {
        const formGroup = service.createHubFormGroup(sampleWithNewData);

        const hub = service.getHub(formGroup);

        expect(hub).toMatchObject(sampleWithNewData);
      });

      it('should return NewHub for empty Hub initial value', () => {
        const formGroup = service.createHubFormGroup();

        const hub = service.getHub(formGroup);

        expect(hub).toMatchObject({});
      });

      it('should return IHub', () => {
        const formGroup = service.createHubFormGroup(sampleWithRequiredData);

        const hub = service.getHub(formGroup);

        expect(hub).toMatchObject(sampleWithRequiredData);
      });
    });

    describe('resetForm', () => {
      it('passing IHub should not enable id FormControl', () => {
        const formGroup = service.createHubFormGroup();
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, sampleWithRequiredData);

        expect(formGroup.controls.id.disabled).toBe(true);
      });

      it('passing NewHub should disable id FormControl', () => {
        const formGroup = service.createHubFormGroup(sampleWithRequiredData);
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, { id: null });

        expect(formGroup.controls.id.disabled).toBe(true);
      });
    });
  });
});
