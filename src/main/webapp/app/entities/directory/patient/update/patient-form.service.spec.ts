import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';

import { sampleWithFullData, sampleWithNewData, sampleWithRequiredData } from '../patient.test-samples';

import { PatientFormService } from './patient-form.service';

describe('Patient Form Service', () => {
  let service: PatientFormService;

  beforeEach(() => {
    service = TestBed.inject(PatientFormService);
  });

  describe('Service methods', () => {
    describe('createPatientFormGroup', () => {
      it('should create a new form with FormControl', () => {
        const formGroup = service.createPatientFormGroup();

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            accountId: expect.any(Object),
            status: expect.any(Object),
            joinedOn: expect.any(Object),
            lastActiveOn: expect.any(Object),
            caseCount: expect.any(Object),
            profile: expect.any(Object),
            angel: expect.any(Object),
            plan: expect.any(Object),
            clinicalLead: expect.any(Object),
            hub: expect.any(Object),
          }),
        );
      });

      it('passing IPatient should create a new form with FormGroup', () => {
        const formGroup = service.createPatientFormGroup(sampleWithRequiredData);

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            accountId: expect.any(Object),
            status: expect.any(Object),
            joinedOn: expect.any(Object),
            lastActiveOn: expect.any(Object),
            caseCount: expect.any(Object),
            profile: expect.any(Object),
            angel: expect.any(Object),
            plan: expect.any(Object),
            clinicalLead: expect.any(Object),
            hub: expect.any(Object),
          }),
        );
      });
    });

    describe('getPatient', () => {
      it('should return NewPatient for default Patient initial value', () => {
        const formGroup = service.createPatientFormGroup(sampleWithNewData);

        const patient = service.getPatient(formGroup);

        expect(patient).toMatchObject(sampleWithNewData);
      });

      it('should return NewPatient for empty Patient initial value', () => {
        const formGroup = service.createPatientFormGroup();

        const patient = service.getPatient(formGroup);

        expect(patient).toMatchObject({});
      });

      it('should return IPatient', () => {
        const formGroup = service.createPatientFormGroup(sampleWithRequiredData);

        const patient = service.getPatient(formGroup);

        expect(patient).toMatchObject(sampleWithRequiredData);
      });
    });

    describe('resetForm', () => {
      it('passing IPatient should not enable id FormControl', () => {
        const formGroup = service.createPatientFormGroup();
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, sampleWithRequiredData);

        expect(formGroup.controls.id.disabled).toBe(true);
      });

      it('passing NewPatient should disable id FormControl', () => {
        const formGroup = service.createPatientFormGroup(sampleWithRequiredData);
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, { id: null });

        expect(formGroup.controls.id.disabled).toBe(true);
      });
    });

    /*
     * `accountId` is the subject's hc-patient account and the api's `Patient.accountId`
     * is `@NotNull`. `PatientService.update` is a `PUT` and `PatientResource.updatePatient`
     * replaces the whole document, so these two cases are the difference between an edit
     * that works and a 400 on every save from this screen.
     *
     * Both assert the field by name. Never assert a count of controls here: a count goes
     * green on the wrong ten controls, and the failure this guards against is a field
     * quietly leaving the form.
     */
    describe('accountId — carried, not offered', () => {
      it('should reach the body a PUT sends, after the screen loads a record', () => {
        // Not vacuous: without this, both sides of the assertion below could be undefined.
        expect(sampleWithRequiredData.accountId).toBeTruthy();
        const formGroup = service.createPatientFormGroup();

        // resetForm is the live path — PatientUpdate.updateForm calls it for every record.
        service.resetForm(formGroup, sampleWithRequiredData);

        expect(service.getPatient(formGroup).accountId).toBe(sampleWithRequiredData.accountId);
      });

      it('should reach the body when the form is built from a record directly', () => {
        expect(sampleWithFullData.accountId).toBeTruthy();
        const formGroup = service.createPatientFormGroup(sampleWithFullData);

        expect(service.getPatient(formGroup).accountId).toBe(sampleWithFullData.accountId);
      });

      it('should never be editable, on an empty form or after loading a record', () => {
        const formGroup = service.createPatientFormGroup();
        expect(formGroup.controls.accountId.disabled).toBe(true);

        service.resetForm(formGroup, sampleWithRequiredData);

        expect(formGroup.controls.accountId.disabled).toBe(true);
      });

      it('should be out of the form value and in the raw value — the mechanism, asserted', () => {
        // This pair is the whole reason the field can be both required by the server and
        // untypeable here. Angular leaves a disabled control out of `value` — so the
        // mirrored `@NotNull` can never wedge the Save button on a record whose account
        // id has not loaded — and puts it back in `getRawValue()`, which is what
        // `getPatient` returns and what the PUT body is built from.
        const formGroup = service.createPatientFormGroup(sampleWithRequiredData);

        expect(formGroup.value).not.toHaveProperty('accountId');
        expect(formGroup.getRawValue()).toHaveProperty('accountId', sampleWithRequiredData.accountId);
      });
    });
  });
});
