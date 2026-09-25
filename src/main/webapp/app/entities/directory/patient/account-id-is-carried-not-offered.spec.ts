import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { sampleWithRequiredData } from './patient.test-samples';
import { PatientFormService } from './update/patient-form.service';

/**
 * **`Patient.accountId` is carried through the edit form and never offered by it — and this file
 * exists because the file that would normally assert that is one a regeneration destroys.**
 *
 * The assertions here duplicate cases in `update/patient-form.service.spec.ts` on purpose. That is
 * not redundancy, it is the whole point: **`patient-form.service.spec.ts` is generated**, from
 * `generators/angular/templates/…/update/_entityFile_-form.service.spec.ts.ejs` in the pinned
 * generator, and `jhipster entity Patient` rewrites it in the same run that rewrites the service
 * beside it. So the hand-written cases guarding this field are destroyed by the exact change they
 * exist to catch.
 *
 * Measured against the pinned generator (9.2.0, matching `.yo-rc.json`) on 2026-09-25, a
 * regeneration would:
 *
 * - re-create `accountId` as a **bare, enabled** control — `_entityFile_-form.service.ts.ejs:107-110`
 *   boxes a value with `disabled: true` only `if (field.id)`, and every other field gets
 *   `new FormControl(raw.field, { validators: … })`;
 * - re-create the spec asserting `disabled` for the **primary key only**, with its surviving cases
 *   passing, because `should return IPatient` compares `getRawValue()`, which includes enabled
 *   controls just as happily as disabled ones.
 *
 * ⚠ **And the result would be worse than an editable field.** The validators mirror the api's
 * `@NotNull @Size(max = 60)`; Angular excludes a *disabled* control from a group's validity but not
 * an enabled one, so against any api that does not carry this field — which is every api until item
 * 115's server half ships — `editForm.invalid` is `true`, and `patient-update.html` binds
 * `[disabled]="editForm.invalid || isSaving()"`. **Save is permanently dead, with no field on screen
 * to fix it.** Measured, not reasoned: enabled and empty, `errors` is `{ required: true }`.
 *
 * The commit that added this field claimed the generated spec was that guard. It was not. This file
 * is, and its name is chosen so the generator never owns it — the same move
 * `entities/directory/record-identity.spec.ts` makes for the id-as-initials rule one directory up.
 * **If you rename this file, rename it to something the generator still does not emit.**
 *
 * ## Why the assertions are behavioural rather than a read of the source
 *
 * A regex over `patient-form.service.ts` looking for `disabled: true` would be defeated by a
 * Prettier line break, which has happened in this estate before — `LogPseudonymTest`'s discriminator
 * and the `grep -v` that hid a two-symbol line are both recorded in `docs/backlog.md`. A control's
 * `disabled` flag is a property the framework will answer for; ask it. The one thing behaviour
 * cannot see is the template, so that single check reads the file.
 */
describe('Patient accountId is carried, never offered', () => {
  const service = (): PatientFormService => TestBed.inject(PatientFormService);

  it('is declared, and is disabled on a form built with no record', () => {
    const control = service().createPatientFormGroup().get('accountId');

    expect(control).not.toBeNull();
    expect(control!.disabled).toBe(true);
  });

  it('is still disabled after the screen loads a record', () => {
    const form = service().createPatientFormGroup();
    service().resetForm(form, sampleWithRequiredData);

    expect(form.get('accountId')!.disabled).toBe(true);
  });

  it('reaches the body a PUT sends, because getRawValue includes a disabled control', () => {
    const form = service().createPatientFormGroup();
    service().resetForm(form, sampleWithRequiredData);

    expect(service().getPatient(form)).toEqual(expect.objectContaining({ accountId: sampleWithRequiredData.accountId }));
  });

  it('cannot wedge Save on a record that carries no accountId', () => {
    // The merge-order window this change exists to survive: today's api does not carry the field,
    // so the control holds undefined.
    //
    // ⚠ This asserts on the CONTROL, not on `form.invalid`. The first version of this case asserted
    // `form.invalid === false` and went red — correctly, and for a reason that has nothing to do with
    // this field: `profile` is `required` on this form and `sampleWithRequiredData` carries none, so
    // the group is invalid whatever `accountId` does. A whole-form assertion cannot say which control
    // made it invalid, which makes it both wrong here and useless as a guard.
    const form = service().createPatientFormGroup();
    const { accountId, ...withoutAccountId } = sampleWithRequiredData;
    // `profile` is `required` on this form and `sampleWithRequiredData` carries none, so it is
    // supplied here — otherwise `form.invalid` is true because of *that* control and this case
    // measures the wrong thing. No cast: `accountId` is optional on IPatient, so a record without
    // it is still an IPatient, which is the type-level statement of this same merge-order window.
    service().resetForm(form, { ...withoutAccountId, profile: { id: 'p1' } });
    const control = form.get('accountId')!;

    expect(accountId).toBeDefined();
    expect(control.disabled).toBe(true);
    expect(control.errors).toBeNull();
    expect(form.value).not.toHaveProperty('accountId');
    // The thing `patient-update.html` actually binds — `[disabled]="editForm.invalid || isSaving()"`.
    expect(form.invalid).toBe(false);

    // And the same control, enabled, is the state a regeneration produces: the mirrored `required`
    // fires on an empty value and the group follows it, so Save is dead with no field on screen to
    // fix it. Asserted on both the control and the group, because the control alone is a proxy for
    // what the template binds and the group alone cannot say which control made it invalid.
    control.enable();
    expect(control.errors).toEqual({ required: true });
    expect(form.invalid).toBe(true);
  });

  it('is on no input in the template', () => {
    // Repo-root-relative, the idiom `record-identity.spec.ts:123` and `patient.spec.ts:893` both
    // use: this runner puts `process.cwd()` at the project root, which is what the path resolves
    // against. (`__dirname` is this file's own directory — an earlier version of this comment said
    // the opposite, and would have misdirected a reader whichever way they acted on it.)
    const template = readFileSync(join('src/main/webapp/app/entities/directory/patient/update', 'patient-update.html'), 'utf8');

    expect(template).not.toContain('accountId');
  });
});
