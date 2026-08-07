import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';

import { sampleWithNewData, sampleWithRequiredData } from '../organisation.test-samples';

import { OrganisationFormService } from './organisation-form.service';

describe('Organisation Form Service', () => {
  let service: OrganisationFormService;

  beforeEach(() => {
    service = TestBed.inject(OrganisationFormService);
  });

  describe('Service methods', () => {
    describe('createOrganisationFormGroup', () => {
      it('should create a new form with FormControl', () => {
        const formGroup = service.createOrganisationFormGroup();

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            name: expect.any(Object),
            legalName: expect.any(Object),
            description: expect.any(Object),
            registrationNumber: expect.any(Object),
            tin: expect.any(Object),
            foundedOn: expect.any(Object),
            switchboard: expect.any(Object),
            email: expect.any(Object),
            deskHours: expect.any(Object),
            address: expect.any(Object),
          }),
        );
      });

      it('passing IOrganisation should create a new form with FormGroup', () => {
        const formGroup = service.createOrganisationFormGroup(sampleWithRequiredData);

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            name: expect.any(Object),
            legalName: expect.any(Object),
            description: expect.any(Object),
            registrationNumber: expect.any(Object),
            tin: expect.any(Object),
            foundedOn: expect.any(Object),
            switchboard: expect.any(Object),
            email: expect.any(Object),
            deskHours: expect.any(Object),
            address: expect.any(Object),
          }),
        );
      });
    });

    describe('getOrganisation', () => {
      it('should return NewOrganisation for default Organisation initial value', () => {
        const formGroup = service.createOrganisationFormGroup(sampleWithNewData);

        const organisation = service.getOrganisation(formGroup);

        expect(organisation).toMatchObject(sampleWithNewData);
      });

      it('should return NewOrganisation for empty Organisation initial value', () => {
        const formGroup = service.createOrganisationFormGroup();

        const organisation = service.getOrganisation(formGroup);

        expect(organisation).toMatchObject({});
      });

      it('should return IOrganisation', () => {
        const formGroup = service.createOrganisationFormGroup(sampleWithRequiredData);

        const organisation = service.getOrganisation(formGroup);

        expect(organisation).toMatchObject(sampleWithRequiredData);
      });
    });

    describe('resetForm', () => {
      it('passing IOrganisation should not enable id FormControl', () => {
        const formGroup = service.createOrganisationFormGroup();
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, sampleWithRequiredData);

        expect(formGroup.controls.id.disabled).toBe(true);
      });

      it('passing NewOrganisation should disable id FormControl', () => {
        const formGroup = service.createOrganisationFormGroup(sampleWithRequiredData);
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, { id: null });

        expect(formGroup.controls.id.disabled).toBe(true);
      });
    });
  });
});
