import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';

import { sampleWithNewData, sampleWithRequiredData } from '../roster-week.test-samples';

import { RosterWeekFormService } from './roster-week-form.service';

describe('RosterWeek Form Service', () => {
  let service: RosterWeekFormService;

  beforeEach(() => {
    service = TestBed.inject(RosterWeekFormService);
  });

  describe('Service methods', () => {
    describe('createRosterWeekFormGroup', () => {
      it('should create a new form with FormControl', () => {
        const formGroup = service.createRosterWeekFormGroup();

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            label: expect.any(Object),
            startDate: expect.any(Object),
            published: expect.any(Object),
            publishedAt: expect.any(Object),
          }),
        );
      });

      it('passing IRosterWeek should create a new form with FormGroup', () => {
        const formGroup = service.createRosterWeekFormGroup(sampleWithRequiredData);

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            label: expect.any(Object),
            startDate: expect.any(Object),
            published: expect.any(Object),
            publishedAt: expect.any(Object),
          }),
        );
      });
    });

    describe('getRosterWeek', () => {
      it('should return NewRosterWeek for default RosterWeek initial value', () => {
        const formGroup = service.createRosterWeekFormGroup(sampleWithNewData);

        const rosterWeek = service.getRosterWeek(formGroup);

        expect(rosterWeek).toMatchObject(sampleWithNewData);
      });

      it('should return NewRosterWeek for empty RosterWeek initial value', () => {
        const formGroup = service.createRosterWeekFormGroup();

        const rosterWeek = service.getRosterWeek(formGroup);

        expect(rosterWeek).toMatchObject({});
      });

      it('should return IRosterWeek', () => {
        const formGroup = service.createRosterWeekFormGroup(sampleWithRequiredData);

        const rosterWeek = service.getRosterWeek(formGroup);

        expect(rosterWeek).toMatchObject(sampleWithRequiredData);
      });
    });

    describe('resetForm', () => {
      it('passing IRosterWeek should not enable id FormControl', () => {
        const formGroup = service.createRosterWeekFormGroup();
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, sampleWithRequiredData);

        expect(formGroup.controls.id.disabled).toBe(true);
      });

      it('passing NewRosterWeek should disable id FormControl', () => {
        const formGroup = service.createRosterWeekFormGroup(sampleWithRequiredData);
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, { id: null });

        expect(formGroup.controls.id.disabled).toBe(true);
      });
    });
  });
});
