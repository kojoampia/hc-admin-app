import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { VendorService } from './service/vendor.service';
import { VendorFormService } from './update/vendor-form.service';
import { sampleWithRequiredData } from './vendor.test-samples';

/**
 * **Editing an archived vendor must leave it archived — backlog item 139.**
 *
 * The same defect item 135 closed on `patient`, on a third entity, with the same silence.
 * `VendorUpdate` saves with `VendorService.update`, a `PUT`, and `VendorResource.updateVendor` writes
 * the deserialised body to Mongo: no DTO, no merge. So a field the form does not carry is a field the
 * server is told to forget. `isArchived` carries no constraint on the far side, so the write simply
 * succeeds. The active list filters `isArchived.notEquals=true`, which **matches a null**, so the
 * record reappears in the directory; and `list/vendor.html` puts an Edit button on every row of the
 * _Show archived_ table, which is one click from an operator looking at archived records precisely
 * because they are archived.
 *
 * ## ⚠ This entity's resource restores nothing, so the form is the only thing holding the field
 *
 * `ProfessionalResource.updateProfessional` re-reads the stored document and puts three fields back
 * before saving. `VendorResource.updateVendor` does not do this for any field: it normalises
 * `accountId`, rejects a duplicate, and saves. That is worth knowing before reading a green run here
 * as more than it is — **this control closes one instance of a wider hole rather than the hole.**
 * `documents` and `facilities` are `@DBRef` sets persisted on the vendor document and are likewise
 * absent from the `PUT` body, and the server-side `accountId` is not on the console model at all, so
 * a model-to-form sweep cannot even see it. None of those three wants a hidden form control — they
 * want the restore-from-stored rule the professional resource already applies. Filed rather than
 * fixed under item 139; this spec deliberately claims only what its name says.
 *
 * ## Why this file is not in `update/`
 *
 * `update/vendor-form.service.spec.ts` is **generator-owned** — `jhipster entity Vendor` rewrites it
 * in the same run that rewrites the service beside it, so a guard written there is destroyed by the
 * exact change it exists to catch. This is the move `patient/archived-survives-an-edit.spec.ts` makes
 * for the same field one entity over. **If you rename this file, rename it to something the generator
 * still does not emit.**
 *
 * ## Why the round trip is asserted on the wire
 *
 * The last case drives a real `VendorService.update` through `HttpTestingController` and reads the
 * outgoing request body. That is deliberately stronger than asserting `getVendor(form)` alone: what
 * the defect is about is the **bytes the server receives**, and between `getVendor` and the socket
 * sits `convertValueFromClient`, which rebuilds the object. A guard that stops at the form service
 * would still pass if something downstream dropped the key. (Backlog item 142 is the standing
 * instance of exactly that weaker assertion, on `accountId`.)
 *
 * ⚠ Assertions here are on the **control**, never on `form.invalid`. A whole-form assertion cannot
 * say which control is at fault, and on this form `name`, `category` and `status` are all `required`.
 */
describe('Vendor isArchived survives an edit', () => {
  /**
   * An archived record as the edit screen would hold one. No cast: `isArchived` is optional on
   * `IVendor`, so this is an `IVendor`. `sampleWithRequiredData` already supplies every `required`
   * control on this form, so nothing needs adding for the group's sake.
   */
  const archivedRecord = { ...sampleWithRequiredData, isArchived: true };

  const formService = (): VendorFormService => TestBed.inject(VendorFormService);

  it('is declared, and is disabled on a form built with no record', () => {
    const control = formService().createVendorFormGroup().get('isArchived');

    expect(control).not.toBeNull();
    expect(control!.disabled).toBe(true);
  });

  it('is still disabled after the screen loads an archived record', () => {
    const form = formService().createVendorFormGroup();
    formService().resetForm(form, archivedRecord);

    expect(form.get('isArchived')!.disabled).toBe(true);
    // Disabled, and carrying the record's own value — a disabled control that dropped the value would
    // send `null`, which is the defect wearing a different hat.
    expect(form.get('isArchived')!.value).toBe(true);
  });

  it('carries no validators, so it can never wedge Save', () => {
    // Item 115 measured this on `patient`: a mirrored `required` makes `editForm.invalid` true the
    // moment the control is enabled, and `vendor-update.html` binds
    // `[disabled]="editForm.invalid || isSaving()"`. Asserted enabled, because a disabled control is
    // excluded from validity and would report `null` errors whatever validators it carried — which
    // would make this case pass vacuously.
    const control = formService().createVendorFormGroup().get('isArchived')!;
    control.enable();

    expect(control.errors).toBeNull();
    expect(control.validator).toBeNull();
  });

  it('reaches getVendor, because getRawValue includes a disabled control', () => {
    const form = formService().createVendorFormGroup();
    formService().resetForm(form, archivedRecord);

    expect(formService().getVendor(form)).toEqual(expect.objectContaining({ isArchived: true }));
  });

  it('is bound to no input in the template', () => {
    // Repo-root-relative: this runner puts `process.cwd()` at the project root, which is what the path
    // resolves against. (`__dirname` would be this file's own directory.)
    const template = readFileSync(join('src/main/webapp/app/entities/directory/vendor/update', 'vendor-update.html'), 'utf8');

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
    let service: VendorService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [provideHttpClientTesting()],
      });
      service = TestBed.inject(VendorService);
      httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
      httpMock.verify();
    });

    it('the PUT body an edit sends carries isArchived, so the server is never told to forget it', () => {
      const form = formService().createVendorFormGroup();
      formService().resetForm(form, archivedRecord);

      service.update(formService().getVendor(form) as typeof archivedRecord).subscribe();

      const req = httpMock.expectOne(request => request.method === 'PUT');
      // The assertion this whole item is about. `VendorResource.updateVendor` persists this body
      // directly, so an absent key here is a stored `null` there, and a stored `null` is a vendor back
      // in the directory it was archived out of.
      expect(req.request.body.isArchived).toBe(true);
      expect(Object.keys(req.request.body)).toContain('isArchived');
      req.flush({ ...archivedRecord, contractRenewsOn: null });
    });
  });
});
