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
          }),
        );
      });
    });

    /**
     * `publishedAt` is the server's, so the form must not offer a control for it.
     *
     * <p>Asserted with an explicit absence rather than by leaving it out of the
     * `objectContaining` above — that matcher tolerates extra properties, so dropping the line
     * there proves nothing at all. `RosterWeekLifecycleCallback` derives the field from
     * `published`, `RosterWeekResource.stripServerOwnedFields` nulls whatever arrives, and the
     * generator's control let an administrator set a value that was accepted and discarded.
     */
    describe('publishedAt is not a control', () => {
      it.each([
        ['a new roster week', undefined],
        ['an existing roster week', sampleWithRequiredData],
      ])('offers no publishedAt control for %s', (_label, input) => {
        const formGroup = service.createRosterWeekFormGroup(input);

        expect(formGroup.controls).not.toHaveProperty('publishedAt');
      });

      /** And nothing is read back out of it either, so no PUT can carry a value. */
      it('reads no publishedAt back out of the form', () => {
        const formGroup = service.createRosterWeekFormGroup(sampleWithRequiredData);

        expect(service.getRosterWeek(formGroup)).not.toHaveProperty('publishedAt');
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
