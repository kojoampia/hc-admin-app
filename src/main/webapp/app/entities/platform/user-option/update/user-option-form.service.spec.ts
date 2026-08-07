import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';

import { sampleWithNewData, sampleWithRequiredData } from '../user-option.test-samples';

import { UserOptionFormService } from './user-option-form.service';

describe('UserOption Form Service', () => {
  let service: UserOptionFormService;

  beforeEach(() => {
    service = TestBed.inject(UserOptionFormService);
  });

  describe('Service methods', () => {
    describe('createUserOptionFormGroup', () => {
      it('should create a new form with FormControl', () => {
        const formGroup = service.createUserOptionFormGroup();

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            category: expect.any(Object),
            userRef: expect.any(Object),
            metadata: expect.any(Object),
          }),
        );
      });

      it('passing IUserOption should create a new form with FormGroup', () => {
        const formGroup = service.createUserOptionFormGroup(sampleWithRequiredData);

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            category: expect.any(Object),
            userRef: expect.any(Object),
            metadata: expect.any(Object),
          }),
        );
      });
    });

    describe('getUserOption', () => {
      it('should return NewUserOption for default UserOption initial value', () => {
        const formGroup = service.createUserOptionFormGroup(sampleWithNewData);

        const userOption = service.getUserOption(formGroup);

        expect(userOption).toMatchObject(sampleWithNewData);
      });

      it('should return NewUserOption for empty UserOption initial value', () => {
        const formGroup = service.createUserOptionFormGroup();

        const userOption = service.getUserOption(formGroup);

        expect(userOption).toMatchObject({});
      });

      it('should return IUserOption', () => {
        const formGroup = service.createUserOptionFormGroup(sampleWithRequiredData);

        const userOption = service.getUserOption(formGroup);

        expect(userOption).toMatchObject(sampleWithRequiredData);
      });
    });

    describe('resetForm', () => {
      it('passing IUserOption should not enable id FormControl', () => {
        const formGroup = service.createUserOptionFormGroup();
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, sampleWithRequiredData);

        expect(formGroup.controls.id.disabled).toBe(true);
      });

      it('passing NewUserOption should disable id FormControl', () => {
        const formGroup = service.createUserOptionFormGroup(sampleWithRequiredData);
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, { id: null });

        expect(formGroup.controls.id.disabled).toBe(true);
      });
    });
  });
});
