import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';

import { sampleWithNewData, sampleWithRequiredData } from '../shift-assignment.test-samples';

import { ShiftAssignmentFormService } from './shift-assignment-form.service';

describe('ShiftAssignment Form Service', () => {
  let service: ShiftAssignmentFormService;

  beforeEach(() => {
    service = TestBed.inject(ShiftAssignmentFormService);
  });

  describe('Service methods', () => {
    describe('createShiftAssignmentFormGroup', () => {
      it('should create a new form with FormControl', () => {
        const formGroup = service.createShiftAssignmentFormGroup();

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            dayIndex: expect.any(Object),
            shiftDate: expect.any(Object),
            shift: expect.any(Object),
            week: expect.any(Object),
            professional: expect.any(Object),
          }),
        );
      });

      it('passing IShiftAssignment should create a new form with FormGroup', () => {
        const formGroup = service.createShiftAssignmentFormGroup(sampleWithRequiredData);

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            dayIndex: expect.any(Object),
            shiftDate: expect.any(Object),
            shift: expect.any(Object),
            week: expect.any(Object),
            professional: expect.any(Object),
          }),
        );
      });
    });

    describe('getShiftAssignment', () => {
      it('should return NewShiftAssignment for default ShiftAssignment initial value', () => {
        const formGroup = service.createShiftAssignmentFormGroup(sampleWithNewData);

        const shiftAssignment = service.getShiftAssignment(formGroup);

        expect(shiftAssignment).toMatchObject(sampleWithNewData);
      });

      it('should return NewShiftAssignment for empty ShiftAssignment initial value', () => {
        const formGroup = service.createShiftAssignmentFormGroup();

        const shiftAssignment = service.getShiftAssignment(formGroup);

        expect(shiftAssignment).toMatchObject({});
      });

      it('should return IShiftAssignment', () => {
        const formGroup = service.createShiftAssignmentFormGroup(sampleWithRequiredData);

        const shiftAssignment = service.getShiftAssignment(formGroup);

        expect(shiftAssignment).toMatchObject(sampleWithRequiredData);
      });
    });

    describe('resetForm', () => {
      it('passing IShiftAssignment should not enable id FormControl', () => {
        const formGroup = service.createShiftAssignmentFormGroup();
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, sampleWithRequiredData);

        expect(formGroup.controls.id.disabled).toBe(true);
      });

      it('passing NewShiftAssignment should disable id FormControl', () => {
        const formGroup = service.createShiftAssignmentFormGroup(sampleWithRequiredData);
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, { id: null });

        expect(formGroup.controls.id.disabled).toBe(true);
      });
    });
  });
});
