import { readFileSync } from 'node:fs';

import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { PatientFormService } from './update/patient-form.service';

/**
 * **Every field on `IPatient` is carried by the edit form — backlog item 135's third half.**
 *
 * `PatientUpdate` saves with a `PUT` and `PatientResource.save` persists the deserialised body
 * directly, with no DTO and no merge against the stored document. So for this entity **a field in the
 * model and not in the form is a field an edit destroys**, and the model is the only place that lists
 * them. Item 115 found `accountId` missing that way and item 135 found `isArchived` missing the same
 * way, one field along, three weeks apart — the second silent, because it carries no `@NotNull` to
 * turn the omission into a 400.
 *
 * **This is a standing guard and not a one-off sweep, and that is the decision rather than an
 * accident.** Item 135's "Done when" asked whether any other `IPatient` field was in the model and not
 * in the form. Asking that once is exactly how both instances arrived: the answer is only true until
 * the next field is added, and a field is added to `patient.model.ts` by generation, by a sibling
 * product's contract, or by hand, none of which consults this list. A question asked once is
 * documentation; asked on every run it is a gate.
 *
 * ⚠ **Scope is `Patient` only.** The same defect is live on the professional and vendor forms — both
 * `PUT`, both with a `setArchived` PATCH helper, both with more model fields than controls — and it is
 * a separate backlog item. Do not widen this file to cover them; write the equivalent beside each, or
 * generalise deliberately under that item.
 *
 * ## Why it reads the source rather than a type
 *
 * The property names are erased at runtime, so there is nothing to ask the framework for: a TypeScript
 * interface has no reflective form. The alternative — a hand-maintained list of expected fields — is
 * the thing this guard exists to replace, since it would need editing by the same change that
 * introduces the defect.
 *
 * ⚠ **A parse that silently finds nothing is a guard that silently passes**, which is this file's own
 * worst failure mode and the reason for the fail-closed block below: the comparison is not reached
 * until the parse has proved it found the three fields that must be there. `_a text-matching guard
 * with no positive control is indistinguishable from a clean sweep_` is recorded in this estate's
 * memory from a `grep` that matched nothing and was read as evidence of absence.
 */
describe('Patient form carries every model field', () => {
  const MODEL_PATH = 'src/main/webapp/app/entities/directory/patient/patient.model.ts';

  /**
   * Fields deliberately in the model and not on the form.
   *
   * **Empty, and that is the post-item-135 state rather than a placeholder.** An entry here is a
   * written decision that a `PUT` may destroy that field, so adding one needs the reason beside it —
   * and note that "the screen does not show it" is *not* such a reason: `id`, `accountId` and
   * `isArchived` are all carried disabled and shown nowhere. The question this guard asks is whether
   * the field is **sent**, not whether it is offered.
   */
  const DELIBERATELY_NOT_ON_THE_FORM: readonly string[] = [];

  /** The property names declared on `IPatient`, read from the source that declares them. */
  const declaredOnTheModel = (): string[] => {
    const source = readFileSync(MODEL_PATH, 'utf8');
    const opening = source.indexOf('export interface IPatient {');
    if (opening === -1) {
      return [];
    }
    // The interface ends at the first brace in column zero after it — the file is Prettier-formatted,
    // so a nested closing brace is always indented.
    const closing = source.indexOf('\n}', opening);
    const body = source.slice(opening, closing === -1 ? undefined : closing);

    // Comments first: this interface's jsdoc quotes field names and contains colons, so a property
    // pattern run over the raw text would invent fields out of prose.
    const withoutComments = body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

    return [...withoutComments.matchAll(/^\s+(\w+)\??\s*:/gm)].map(match => match[1]);
  };

  it('parses the model at all — the positive control this guard is worthless without', () => {
    const declared = declaredOnTheModel();

    // Three fields that must be found. `id` is the primary key and cannot go; `accountId` and
    // `isArchived` are the two this guard was written for. If the interface is renamed, moved or
    // reformatted past the parse, this case fails rather than the sweep passing vacuously.
    expect(declared).toContain('id');
    expect(declared).toContain('accountId');
    expect(declared).toContain('isArchived');
    // A floor rather than an equality: the point is that a plausible number of fields was found, and
    // an equality here would fail on every legitimate addition, which is the opposite of the intent.
    expect(declared.length).toBeGreaterThanOrEqual(10);
  });

  it('declares a control for every field the model declares', () => {
    const declared = declaredOnTheModel();
    // Fail closed: do not compare against a parse that found nothing. Without this, deleting the
    // interface would make the sweep pass.
    expect(declared).toContain('isArchived');

    const controls = Object.keys(TestBed.inject(PatientFormService).createPatientFormGroup().controls);
    const missing = declared.filter(field => !controls.includes(field) && !DELIBERATELY_NOT_ON_THE_FORM.includes(field));

    // Named in the message because the failure this guard exists to produce is read by someone who
    // has just added a field and does not yet know that `PUT` makes it load-bearing.
    expect(missing, `on IPatient and not on the edit form, so a PUT would destroy it: ${missing.join(', ')}`).toEqual([]);
  });

  it('keeps the allowlist honest — every exemption still names a real field', () => {
    // A stale exemption is worse than none: it silently covers whatever field later takes the name,
    // and it reads as a decision somebody took about a field that no longer exists.
    const declared = declaredOnTheModel();

    expect(DELIBERATELY_NOT_ON_THE_FORM.filter(field => !declared.includes(field))).toEqual([]);
  });

  it('declares no control for a field the model does not have', () => {
    // The mirror of the sweep above, and cheap. A control with no model field behind it puts a key in
    // the `PUT` body that the server deserialises into nothing — harmless today, but it is also the
    // signature of a field that was *renamed* on the model and not on the form, which the sweep above
    // reports as a missing field and this one localises to the stale name.
    const declared = declaredOnTheModel();
    expect(declared).toContain('isArchived');

    const controls = Object.keys(TestBed.inject(PatientFormService).createPatientFormGroup().controls);

    expect(controls.filter(control => !declared.includes(control))).toEqual([]);
  });
});
