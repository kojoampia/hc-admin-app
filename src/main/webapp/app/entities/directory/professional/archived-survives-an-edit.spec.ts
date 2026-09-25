import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { sampleWithRequiredData } from './professional.test-samples';
import { ProfessionalService } from './service/professional.service';
import { ProfessionalFormService } from './update/professional-form.service';

/**
 * **Editing an archived professional must leave it archived — backlog item 139.**
 *
 * The same defect item 135 closed on `patient`, on the entity beside it, with the same silence.
 * `ProfessionalUpdate` saves with `ProfessionalService.update`, a `PUT`, and
 * `ProfessionalResource.updateProfessional` writes the deserialised body to Mongo: no DTO, no merge.
 * So a field the form does not carry is a field the server is told to forget. `isArchived` carries no
 * constraint on the far side, so the write simply succeeds. The active list filters
 * `isArchived.notEquals=true`, which **matches a null**, so the record reappears in the directory; and
 * `list/professional.html` puts an Edit button on every row of the _Show archived_ table, which is one
 * click from an operator looking at archived records precisely because they are archived.
 *
 * ## ⚠ The server already knows this rule and applies it to two other fields
 *
 * `ProfessionalResource.updateProfessional` re-reads the stored document and restores `verification`,
 * `homeSpaceId` and `unavailabilityPeriods` before saving — each with a comment explaining that a
 * `PUT` the console builds from a partial model would otherwise erase them. `isArchived` is not in
 * that list. So this is not a rule nobody had thought of on this entity; it is a rule applied three
 * times in one method and not to the fourth field that needed it, which is the same shape as
 * `setArchived`'s javadoc arguing against a write the edit screen beside it was making.
 *
 * ## Why this file is not in `update/`
 *
 * `update/professional-form.service.spec.ts` is **generator-owned** — `jhipster entity Professional`
 * rewrites it in the same run that rewrites the service beside it, so a guard written there is
 * destroyed by the exact change it exists to catch. This is the move
 * `patient/archived-survives-an-edit.spec.ts` makes for the same field one entity over. **If you
 * rename this file, rename it to something the generator still does not emit.**
 *
 * ## Why the round trip is asserted on the wire
 *
 * The last case drives a real `ProfessionalService.update` through `HttpTestingController` and reads
 * the outgoing request body. That is deliberately stronger than asserting `getProfessional(form)`
 * alone: what the defect is about is the **bytes the server receives**, and between `getProfessional`
 * and the socket sits `convertValueFromClient`, which rebuilds the object. A guard that stops at the
 * form service would still pass if something downstream dropped the key. (Backlog item 142 is the
 * standing instance of exactly that weaker assertion, on `accountId`.)
 *
 * ⚠ Assertions here are on the **control**, never on `form.invalid`. `profile` is `required` on this
 * form and `sampleWithRequiredData` carries none, so the group is invalid whatever this field does —
 * which is why the record below supplies `profile` explicitly, and why a whole-form assertion could
 * not say which control was at fault even when it went red.
 */
describe('Professional isArchived survives an edit', () => {
  /**
   * An archived record as the edit screen would hold one. `profile` is supplied for the reason in the
   * class comment — it is `required`, and without it the form is invalid for a reason unrelated to
   * this field. No cast: `isArchived` is optional on `IProfessional`, so this is an `IProfessional`.
   */
  const archivedRecord = { ...sampleWithRequiredData, isArchived: true, profile: { id: 'p1' } };

  const formService = (): ProfessionalFormService => TestBed.inject(ProfessionalFormService);

  it('is declared, and is disabled on a form built with no record', () => {
    const control = formService().createProfessionalFormGroup().get('isArchived');

    expect(control).not.toBeNull();
    expect(control!.disabled).toBe(true);
  });

  it('is still disabled after the screen loads an archived record', () => {
    const form = formService().createProfessionalFormGroup();
    formService().resetForm(form, archivedRecord);

    expect(form.get('isArchived')!.disabled).toBe(true);
    // Disabled, and carrying the record's own value — a disabled control that dropped the value would
    // send `null`, which is the defect wearing a different hat.
    expect(form.get('isArchived')!.value).toBe(true);
  });

  it('carries no validators, so it can never wedge Save', () => {
    // Item 115 measured this on `patient`: a mirrored `required` makes `editForm.invalid` true the
    // moment the control is enabled, and `professional-update.html` binds
    // `[disabled]="editForm.invalid || isSaving()"`. Asserted enabled, because a disabled control is
    // excluded from validity and would report `null` errors whatever validators it carried — which
    // would make this case pass vacuously.
    const control = formService().createProfessionalFormGroup().get('isArchived')!;
    control.enable();

    expect(control.errors).toBeNull();
    expect(control.validator).toBeNull();
  });

  it('reaches getProfessional, because getRawValue includes a disabled control', () => {
    const form = formService().createProfessionalFormGroup();
    formService().resetForm(form, archivedRecord);

    expect(formService().getProfessional(form)).toEqual(expect.objectContaining({ isArchived: true }));
  });

  it('is bound to no input in the template', () => {
    // Repo-root-relative: this runner puts `process.cwd()` at the project root, which is what the path
    // resolves against. (`__dirname` would be this file's own directory.)
    const template = readFileSync(join('src/main/webapp/app/entities/directory/professional/update', 'professional-update.html'), 'utf8');

    // ⚠ Asserted on the BINDING, not on the bare identifier, and the narrower string is the point.
    // `not.toContain('isArchived')` would also fire on a comment — and a comment is exactly what
    // someone closes this loop with, since explanatory comments in templates are house practice here
    // and `list/patient.spec.ts:899` asserts that a template *contains* one. So the bare form turns
    // red for a reader doing the right thing, which trains people to delete the guard. What must not
    // exist is a control bound to this field; `formControlName` is how this template binds every one
    // of them, and it is the string a regeneration would emit. Measured in both directions on
    // `patient` before being copied here.
    expect(template).not.toContain('formControlName="isArchived"');
  });

  describe('on the wire', () => {
    let service: ProfessionalService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [provideHttpClientTesting()],
      });
      service = TestBed.inject(ProfessionalService);
      httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
      httpMock.verify();
    });

    it('the PUT body an edit sends carries isArchived, so the server is never told to forget it', () => {
      const form = formService().createProfessionalFormGroup();
      formService().resetForm(form, archivedRecord);

      service.update(formService().getProfessional(form) as typeof archivedRecord).subscribe();

      const req = httpMock.expectOne(request => request.method === 'PUT');
      // The assertion this whole item is about. `ProfessionalResource.updateProfessional` persists
      // this body directly, so an absent key here is a stored `null` there, and a stored `null` is a
      // clinician back in the directory they were archived out of.
      expect(req.request.body.isArchived).toBe(true);
      expect(Object.keys(req.request.body)).toContain('isArchived');
      req.flush({ ...archivedRecord, joinedOn: '2023-12-11' });
    });
  });
});
