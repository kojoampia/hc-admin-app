import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';

import { sampleWithNewData, sampleWithRequiredData } from '../vendor.test-samples';

import { VendorFormService } from './vendor-form.service';

describe('Vendor Form Service', () => {
  let service: VendorFormService;

  beforeEach(() => {
    service = TestBed.inject(VendorFormService);
  });

  describe('Service methods', () => {
    describe('createVendorFormGroup', () => {
      it('should create a new form with FormControl', () => {
        const formGroup = service.createVendorFormGroup();

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            name: expect.any(Object),
            category: expect.any(Object),
            serviceSummary: expect.any(Object),
            contactName: expect.any(Object),
            phone: expect.any(Object),
            email: expect.any(Object),
            city: expect.any(Object),
            status: expect.any(Object),
            contractNote: expect.any(Object),
            contractRenewsOn: expect.any(Object),
            orderCount: expect.any(Object),
            spendToDate: expect.any(Object),
            rating: expect.any(Object),
          }),
        );
      });

      it('passing IVendor should create a new form with FormGroup', () => {
        const formGroup = service.createVendorFormGroup(sampleWithRequiredData);

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            name: expect.any(Object),
            category: expect.any(Object),
            serviceSummary: expect.any(Object),
            contactName: expect.any(Object),
            phone: expect.any(Object),
            email: expect.any(Object),
            city: expect.any(Object),
            status: expect.any(Object),
            contractNote: expect.any(Object),
            contractRenewsOn: expect.any(Object),
            orderCount: expect.any(Object),
            spendToDate: expect.any(Object),
            rating: expect.any(Object),
          }),
        );
      });
    });

    describe('getVendor', () => {
      it('should return NewVendor for default Vendor initial value', () => {
        const formGroup = service.createVendorFormGroup(sampleWithNewData);

        const vendor = service.getVendor(formGroup);

        expect(vendor).toMatchObject(sampleWithNewData);
      });

      it('should return NewVendor for empty Vendor initial value', () => {
        const formGroup = service.createVendorFormGroup();

        const vendor = service.getVendor(formGroup);

        expect(vendor).toMatchObject({});
      });

      it('should return IVendor', () => {
        const formGroup = service.createVendorFormGroup(sampleWithRequiredData);

        const vendor = service.getVendor(formGroup);

        expect(vendor).toMatchObject(sampleWithRequiredData);
      });
    });

    describe('resetForm', () => {
      it('passing IVendor should not enable id FormControl', () => {
        const formGroup = service.createVendorFormGroup();
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, sampleWithRequiredData);

        expect(formGroup.controls.id.disabled).toBe(true);
      });

      it('passing NewVendor should disable id FormControl', () => {
        const formGroup = service.createVendorFormGroup(sampleWithRequiredData);
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, { id: null });

        expect(formGroup.controls.id.disabled).toBe(true);
      });
    });
  });
});
