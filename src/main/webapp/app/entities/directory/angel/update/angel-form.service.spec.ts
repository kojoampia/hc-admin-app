import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';

import { sampleWithNewData, sampleWithRequiredData } from '../angel.test-samples';

import { AngelFormService } from './angel-form.service';

describe('Angel Form Service', () => {
  let service: AngelFormService;

  beforeEach(() => {
    service = TestBed.inject(AngelFormService);
  });

  describe('Service methods', () => {
    describe('createAngelFormGroup', () => {
      it('should create a new form with FormControl', () => {
        const formGroup = service.createAngelFormGroup();

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            name: expect.any(Object),
            relationship: expect.any(Object),
            phone: expect.any(Object),
            email: expect.any(Object),
            country: expect.any(Object),
          }),
        );
      });

      it('passing IAngel should create a new form with FormGroup', () => {
        const formGroup = service.createAngelFormGroup(sampleWithRequiredData);

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            name: expect.any(Object),
            relationship: expect.any(Object),
            phone: expect.any(Object),
            email: expect.any(Object),
            country: expect.any(Object),
          }),
        );
      });
    });

    describe('getAngel', () => {
      it('should return NewAngel for default Angel initial value', () => {
        const formGroup = service.createAngelFormGroup(sampleWithNewData);

        const angel = service.getAngel(formGroup);

        expect(angel).toMatchObject(sampleWithNewData);
      });

      it('should return NewAngel for empty Angel initial value', () => {
        const formGroup = service.createAngelFormGroup();

        const angel = service.getAngel(formGroup);

        expect(angel).toMatchObject({});
      });

      it('should return IAngel', () => {
        const formGroup = service.createAngelFormGroup(sampleWithRequiredData);

        const angel = service.getAngel(formGroup);

        expect(angel).toMatchObject(sampleWithRequiredData);
      });
    });

    describe('resetForm', () => {
      it('passing IAngel should not enable id FormControl', () => {
        const formGroup = service.createAngelFormGroup();
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, sampleWithRequiredData);

        expect(formGroup.controls.id.disabled).toBe(true);
      });

      it('passing NewAngel should disable id FormControl', () => {
        const formGroup = service.createAngelFormGroup(sampleWithRequiredData);
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, { id: null });

        expect(formGroup.controls.id.disabled).toBe(true);
      });
    });
  });
});
