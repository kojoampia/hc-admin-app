import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';

import { sampleWithNewData, sampleWithRequiredData } from '../credential.test-samples';

import { CredentialFormService } from './credential-form.service';

describe('Credential Form Service', () => {
  let service: CredentialFormService;

  beforeEach(() => {
    service = TestBed.inject(CredentialFormService);
  });

  describe('Service methods', () => {
    describe('createCredentialFormGroup', () => {
      it('should create a new form with FormControl', () => {
        const formGroup = service.createCredentialFormGroup();

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            email: expect.any(Object),
            phoneNumber: expect.any(Object),
            passwordHash: expect.any(Object),
            role: expect.any(Object),
            enabled: expect.any(Object),
            lastLoginAt: expect.any(Object),
          }),
        );
      });

      it('passing ICredential should create a new form with FormGroup', () => {
        const formGroup = service.createCredentialFormGroup(sampleWithRequiredData);

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            email: expect.any(Object),
            phoneNumber: expect.any(Object),
            passwordHash: expect.any(Object),
            role: expect.any(Object),
            enabled: expect.any(Object),
            lastLoginAt: expect.any(Object),
          }),
        );
      });
    });

    describe('getCredential', () => {
      it('should return NewCredential for default Credential initial value', () => {
        const formGroup = service.createCredentialFormGroup(sampleWithNewData);

        const credential = service.getCredential(formGroup);

        expect(credential).toMatchObject(sampleWithNewData);
      });

      it('should return NewCredential for empty Credential initial value', () => {
        const formGroup = service.createCredentialFormGroup();

        const credential = service.getCredential(formGroup);

        expect(credential).toMatchObject({});
      });

      it('should return ICredential', () => {
        const formGroup = service.createCredentialFormGroup(sampleWithRequiredData);

        const credential = service.getCredential(formGroup);

        expect(credential).toMatchObject(sampleWithRequiredData);
      });
    });

    describe('resetForm', () => {
      it('passing ICredential should not enable id FormControl', () => {
        const formGroup = service.createCredentialFormGroup();
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, sampleWithRequiredData);

        expect(formGroup.controls.id.disabled).toBe(true);
      });

      it('passing NewCredential should disable id FormControl', () => {
        const formGroup = service.createCredentialFormGroup(sampleWithRequiredData);
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, { id: null });

        expect(formGroup.controls.id.disabled).toBe(true);
      });
    });
  });
});
