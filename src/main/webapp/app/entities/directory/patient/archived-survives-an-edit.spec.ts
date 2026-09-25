import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { sampleWithRequiredData } from './patient.test-samples';
import { PatientService } from './service/patient.service';
import { PatientFormService } from './update/patient-form.service';

/**
 * **Editing an archived patient must leave it archived — backlog item 135.**
 *
 * `PatientUpdate` saves with `PatientService.update`, a `PUT`, and `PatientResource.save` writes the
 * deserialised body to Mongo directly: no DTO, no merge with the stored document. So a field the form
 * does not carry is a field the server is told to forget. `isArchived` was such a field, and its
 * omission was silent where `accountId`'s was loud — `accountId` is `@NotNull`, so leaving it out
 * produced a 400 nobody could miss, while `isArchived` has no constraint at all and the write simply
 * succeeded. The active list filters `isArchived.notEquals=true`, which **matches a null**, so the
 * record reappeared in the directory; and the _Show archived_ table puts an Edit button on every row,
 * which is one click from an operator looking at archived records precisely because they are archived.
 *
 * ## Why this file is not in `update/`
 *
 * `update/patient-form.service.spec.ts` is **generator-owned** — `jhipster entity Patient` rewrites it
 * in the same run that rewrites the service beside it, so a guard written there is destroyed by the
 * exact change it exists to catch. This is the move `account-id-is-carried-not-offered.spec.ts` makes
 * for the field one along, and `entities/directory/record-identity.spec.ts` makes for the
 * id-as-initials rule one directory up. **If you rename this file, rename it to something the
 * generator still does not emit.**
 *
 * ## Why the round trip is asserted on the wire
 *
 * The last case drives a real `PatientService.update` through `HttpTestingController` and reads the
 * outgoing request body. That is deliberately stronger than asserting `getPatient(form)` alone: what
 * the defect was about is the **bytes the server receives**, and between `getPatient` and the socket
 * sits `convertValueFromClient`, which rebuilds the object. A guard that stops at the form service
 * would still pass if something downstream dropped the key.
 *
 * ⚠ Assertions here are on the **control**, never on `form.invalid`. `profile` is `required` on this
 * form and `sampleWithRequiredData` carries none, so the group is invalid whatever this field does —
 * which is why every record below supplies `profile` explicitly, and why the wedge that fact caused in
 * item 115 is not repeated here: this control carries **no validators**, because the api declares no
 * constraint to mirror.
 */
describe('Patient isArchived survives an edit', () => {
  /**
   * An archived record as the edit screen would hold one. `profile` is supplied for the reason in the
   * class comment — it is `required`, and without it the form is invalid for a reason unrelated to
   * this field. No cast: `isArchived` is optional on `IPatient`, so this is an `IPatient`.
   */
  const archivedRecord = { ...sampleWithRequiredData, isArchived: true, profile: { id: 'p1' } };

  const formService = (): PatientFormService => TestBed.inject(PatientFormService);

  it('is declared, and is disabled on a form built with no record', () => {
    const control = formService().createPatientFormGroup().get('isArchived');

    expect(control).not.toBeNull();
    expect(control!.disabled).toBe(true);
  });

  it('is still disabled after the screen loads an archived record', () => {
    const form = formService().createPatientFormGroup();
    formService().resetForm(form, archivedRecord);

    expect(form.get('isArchived')!.disabled).toBe(true);
    // Disabled, and carrying the record's own value — a disabled control that dropped the value would
    // send `null`, which is the defect wearing a different hat.
    expect(form.get('isArchived')!.value).toBe(true);
  });

  it('carries no validators, so it can never wedge Save', () => {
    // Item 115 measured this on the field beside it: a mirrored `required` makes `editForm.invalid`
    // true the moment the control is enabled, and `patient-update.html` binds
    // `[disabled]="editForm.invalid || isSaving()"`. Asserted enabled, because a disabled control is
    // excluded from validity and would report `null` errors whatever validators it carried — which
    // would make this case pass vacuously.
    const control = formService().createPatientFormGroup().get('isArchived')!;
    control.enable();

    expect(control.errors).toBeNull();
    expect(control.validator).toBeNull();
  });

  it('reaches getPatient, because getRawValue includes a disabled control', () => {
    const form = formService().createPatientFormGroup();
    formService().resetForm(form, archivedRecord);

    expect(formService().getPatient(form)).toEqual(expect.objectContaining({ isArchived: true }));
  });

  it('is bound to no input in the template', () => {
    // Repo-root-relative: this runner puts `process.cwd()` at the project root, which is what the path
    // resolves against. (`__dirname` would be this file's own directory.)
    const template = readFileSync(join('src/main/webapp/app/entities/directory/patient/update', 'patient-update.html'), 'utf8');

    // ⚠ Asserted on the BINDING, not on the bare identifier, and the narrower string is the point.
    // `not.toContain('isArchived')` would also fire on a comment — and a comment is exactly what
    // someone closes this loop with, since explanatory comments in templates are house practice here
    // and `list/patient.spec.ts:899` asserts that a template *contains* one. So the bare form turns
    // red for a reader doing the right thing, which trains people to delete the guard. What must not
    // exist is a control bound to this field; `formControlName` is how this template binds every one
    // of them, and it is the string a regeneration would emit.
    //
    // (`account-id-is-carried-not-offered.spec.ts` still asserts the bare identifier for the field
    // beside this one. Same brittleness, not touched here — it belongs to item 115's file and is
    // noted rather than fixed in passing.)
    expect(template).not.toContain('formControlName="isArchived"');
  });

  describe('on the wire', () => {
    let service: PatientService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [provideHttpClientTesting()],
      });
      service = TestBed.inject(PatientService);
      httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
      httpMock.verify();
    });

    it('the PUT body an edit sends carries isArchived, so the server is never told to forget it', () => {
      const form = formService().createPatientFormGroup();
      formService().resetForm(form, archivedRecord);

      service.update(formService().getPatient(form) as typeof archivedRecord).subscribe();

      const req = httpMock.expectOne(request => request.method === 'PUT');
      // The assertion this whole item is about. `PatientResource.save` persists this body directly,
      // so an absent key here is a stored `null` there, and a stored `null` is a record back in the
      // directory it was archived out of.
      expect(req.request.body.isArchived).toBe(true);
      expect(Object.keys(req.request.body)).toContain('isArchived');
      req.flush({ ...archivedRecord, joinedOn: '2023-12-10', lastActiveOn: null });
    });
  });
});
