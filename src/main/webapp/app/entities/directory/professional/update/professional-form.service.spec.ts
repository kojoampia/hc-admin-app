import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';

import { sampleWithNewData, sampleWithRequiredData } from '../professional.test-samples';

import { ProfessionalFormService } from './professional-form.service';

describe('Professional Form Service', () => {
  let service: ProfessionalFormService;

  beforeEach(() => {
    service = TestBed.inject(ProfessionalFormService);
  });

  describe('Service methods', () => {
    describe('createProfessionalFormGroup', () => {
      it('should create a new form with FormControl', () => {
        const formGroup = service.createProfessionalFormGroup();

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            role: expect.any(Object),
            speciality: expect.any(Object),
            licenceNumber: expect.any(Object),
            verification: expect.any(Object),
            status: expect.any(Object),
            patientCount: expect.any(Object),
            caseCount: expect.any(Object),
            visitCount: expect.any(Object),
            rating: expect.any(Object),
            joinedOn: expect.any(Object),
            profile: expect.any(Object),
            credential: expect.any(Object),
            team: expect.any(Object),
            hub: expect.any(Object),
          }),
        );
      });

      it('passing IProfessional should create a new form with FormGroup', () => {
        const formGroup = service.createProfessionalFormGroup(sampleWithRequiredData);

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            role: expect.any(Object),
            speciality: expect.any(Object),
            licenceNumber: expect.any(Object),
            verification: expect.any(Object),
            status: expect.any(Object),
            patientCount: expect.any(Object),
            caseCount: expect.any(Object),
            visitCount: expect.any(Object),
            rating: expect.any(Object),
            joinedOn: expect.any(Object),
            profile: expect.any(Object),
            credential: expect.any(Object),
            team: expect.any(Object),
            hub: expect.any(Object),
          }),
        );
      });
    });

    describe('getProfessional', () => {
      it('should return NewProfessional for default Professional initial value', () => {
        const formGroup = service.createProfessionalFormGroup(sampleWithNewData);

        const professional = service.getProfessional(formGroup);

        expect(professional).toMatchObject(sampleWithNewData);
      });

      it('should return NewProfessional for empty Professional initial value', () => {
        const formGroup = service.createProfessionalFormGroup();

        const professional = service.getProfessional(formGroup);

        expect(professional).toMatchObject({});
      });

      it('should return IProfessional', () => {
        const formGroup = service.createProfessionalFormGroup(sampleWithRequiredData);

        const professional = service.getProfessional(formGroup);

        expect(professional).toMatchObject(sampleWithRequiredData);
      });
    });

    describe('resetForm', () => {
      it('passing IProfessional should not enable id FormControl', () => {
        const formGroup = service.createProfessionalFormGroup();
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, sampleWithRequiredData);

        expect(formGroup.controls.id.disabled).toBe(true);
      });

      it('passing NewProfessional should disable id FormControl', () => {
        const formGroup = service.createProfessionalFormGroup(sampleWithRequiredData);
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, { id: null });

        expect(formGroup.controls.id.disabled).toBe(true);
      });
    });
  });
});
