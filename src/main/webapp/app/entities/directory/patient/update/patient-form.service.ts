import { Injectable } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import { IPatient, NewPatient } from '../patient.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts IPatient for edit and NewPatientFormGroupInput for create.
 */
type PatientFormGroupInput = IPatient | PartialWithRequiredKeyOf<NewPatient>;

type PatientFormDefaults = Pick<NewPatient, 'id'>;

type PatientFormGroupContent = {
  id: FormControl<IPatient['id'] | NewPatient['id']>;
  accountId: FormControl<IPatient['accountId']>;
  status: FormControl<IPatient['status']>;
  joinedOn: FormControl<IPatient['joinedOn']>;
  lastActiveOn: FormControl<IPatient['lastActiveOn']>;
  caseCount: FormControl<IPatient['caseCount']>;
  profile: FormControl<IPatient['profile']>;
  angel: FormControl<IPatient['angel']>;
  plan: FormControl<IPatient['plan']>;
  clinicalLead: FormControl<IPatient['clinicalLead']>;
  hub: FormControl<IPatient['hub']>;
  isArchived: FormControl<IPatient['isArchived']>;
};

export type PatientFormGroup = FormGroup<PatientFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class PatientFormService {
  createPatientFormGroup(patient?: PatientFormGroupInput): PatientFormGroup {
    const patientRawValue = {
      ...this.getFormDefaults(),
      ...(patient ?? { id: null }),
    };

    return new FormGroup<PatientFormGroupContent>({
      id: new FormControl(
        { value: patientRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      /*
       * Carried through the form, never offered by it.
       *
       * `getRawValue()` includes disabled controls — which is precisely why the disabled
       * `id` above reaches the server on every edit — so declaring the control is what
       * makes `getPatient()` put `accountId` in the body. `PatientService.update` is a
       * `PUT` and the api replaces the whole document, so omitting it means telling the
       * server to forget the account this record belongs to; with `@NotNull` on the far
       * side that is a 400 refusal of every edit rather than a silent unlinking.
       *
       * Disabled rather than merely left out of the template: an unrendered but enabled
       * control is one template line away from being editable, and nothing anywhere
       * validates that an administrator has retyped the account of the person the record
       * actually describes. `DirectoryProjectionService.merge` refuses to let the event
       * stream re-key a record an administrator can see; letting the administrator do it
       * by hand would be strictly worse than the thing that rule exists to prevent.
       *
       * The validators mirror the api's `@NotNull @Size(max = 60)` so they are correct if
       * this is ever enabled. They do not fire today, because Angular excludes disabled
       * controls from a group's validity — and that exclusion is load-bearing rather than
       * incidental. Measured 2026-09-25 on this form: enabled with no value,
       * `editForm.invalid` is `true` and `errors` is `{ required: true }`, and
       * `patient-update.html` binds `[disabled]="editForm.invalid || isSaving()"`, so Save
       * is permanently dead with no field on screen to fix it. That is the state every
       * patient edit would be in against an api that does not carry this field — which is
       * every api until item 115's server half ships, and which is exactly the window this
       * change has to survive.
       *
       * ⚠ A record that carries an explicit `accountId: null` is a different case and is
       * NOT handled here: `JSON.stringify` keeps a null where it drops an `undefined`, so
       * the body says `"accountId":null` and the new api refuses it 400. That is the api's
       * own documented state for a row its backfill could not resolve — readable, never
       * again writable — so the refusal is correct. The cost is that `onSaveError()` is
       * empty and no i18n key names this field, so an administrator sees a save that does
       * nothing. Do not "fix" it by defaulting the value; the remedy is the api's backfill
       * or an operator setting the real account id.
       */
      accountId: new FormControl(
        { value: patientRawValue.accountId, disabled: true },
        {
          validators: [Validators.required, Validators.maxLength(60)],
        },
      ),
      status: new FormControl(patientRawValue.status, {
        validators: [Validators.required],
      }),
      joinedOn: new FormControl(patientRawValue.joinedOn, {
        validators: [Validators.required],
      }),
      lastActiveOn: new FormControl(patientRawValue.lastActiveOn),
      caseCount: new FormControl(patientRawValue.caseCount, {
        validators: [Validators.min(0)],
      }),
      profile: new FormControl(patientRawValue.profile, {
        validators: [Validators.required],
      }),
      angel: new FormControl(patientRawValue.angel),
      plan: new FormControl(patientRawValue.plan),
      clinicalLead: new FormControl(patientRawValue.clinicalLead),
      hub: new FormControl(patientRawValue.hub),
      /*
       * Carried through the form, never offered by it — the same shape as `accountId`
       * above, for an entirely different reason. `accountId` is disabled because a
       * record must never be re-keyed by hand. This field may be changed freely; what
       * it may not have is a second writer.
       *
       * **The field already has an owner and a narrower verb.** `PatientService.setArchived`
       * PATCHes `{ id, isArchived }` and nothing else, and its javadoc argues against
       * exactly the write this control would otherwise make: "sending it back would
       * quietly overwrite any change made in between with a stale copy". An enabled
       * control here gives one field two writers, and the wider of the two is a `PUT` of
       * a whole document the route resolver read when the screen opened.
       *
       * Two smaller reasons, each sufficient on its own to keep it off the screen. The
       * form is a three-step wizard grouped by subject — account, person, care
       * (`patient-update.ts:79-83`) — and archiving is none of those; it is a directory
       * action, which is where the button already is. And a `PUT` that happens to flip a
       * boolean is indistinguishable in `AuditLog` from any other edit of the record,
       * where the one-field PATCH reads as an archive action and nothing else.
       *
       * Declaring it at all is what closes the defect: `getRawValue()` includes disabled
       * controls, so the control is what puts `isArchived` in the body. Without it,
       * `getPatient()` omits the key, `PatientResource.save` writes the deserialised body
       * straight to Mongo, and the stored `true` becomes `null` — and because the active
       * list filters on `isArchived.notEquals=true`, which matches a null, the archived
       * patient silently returns to the directory. No constraint on the far side, so no
       * error: this is `accountId`'s defect without `accountId`'s 400.
       *
       * ⚠ **No validators, deliberately.** The api declares no constraint on this field,
       * so there is nothing to mirror — and a mirrored `required` is the precise wedge
       * item 115 measured on this form: Angular excludes a disabled control from a group's
       * validity, but the moment one is enabled an empty value makes `editForm.invalid`
       * true, and `patient-update.html` binds `[disabled]="editForm.invalid || isSaving()"`.
       * Save would be permanently dead with no field on screen to fix it.
       *
       * ⚠ **This does not make the write safe, and must not be read as though it did.**
       * Carrying the value still sends whatever the resolver read when the screen opened,
       * so an archive performed elsewhere while this form is open is still overwritten on
       * save. That stale-write window is not closed here — it is narrowed to the one every
       * other field on this form already has, which is item 115's accepted position. What
       * changes is that a field nobody touched stops being destroyed by an edit to a
       * different one.
       */
      isArchived: new FormControl({ value: patientRawValue.isArchived, disabled: true }),
    });
  }

  getPatient(form: PatientFormGroup): IPatient | NewPatient {
    return form.getRawValue();
  }

  resetForm(form: PatientFormGroup, patient: PatientFormGroupInput): void {
    const patientRawValue = { ...this.getFormDefaults(), ...patient };
    form.reset({
      ...patientRawValue,
      id: { value: patientRawValue.id, disabled: true },
      // Re-stated as a boxed value for the same reason `id` is: `reset` is the live path
      // — `PatientUpdate.updateForm` calls it for every record the screen loads — and a
      // control handed a bare value here would carry the record's account id while its
      // disabled state depended on nothing this method says.
      accountId: { value: patientRawValue.accountId, disabled: true },
      // Boxed for the same reason as the two above — `reset` is the live path, called for
      // every record the screen loads, and a bare value here would leave the control's
      // disabled state depending on nothing this method says.
      //
      // ⚠ Measured 2026-09-25 rather than assumed, because the obvious reading is wrong:
      // this line and the boxed value in `createPatientFormGroup` are **mutually
      // redundant**, not additive. `reset` preserves a control's existing disabled state
      // when handed a bare value, so removing this line alone changes no behaviour and
      // `archived-survives-an-edit.spec.ts` stays green — while removing the *other* one
      // alone is caught only on the create path, because this line re-disables the control
      // the moment a record is loaded. Each covers the other's absence. Keep both: the
      // guard cannot see a defect in either one individually, which is an argument for
      // defence in depth and not for trimming one away.
      isArchived: { value: patientRawValue.isArchived, disabled: true },
    });
  }

  private getFormDefaults(): PatientFormDefaults {
    return {
      id: null,
    };
  }
}
