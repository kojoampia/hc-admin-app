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
    });
  }

  private getFormDefaults(): PatientFormDefaults {
    return {
      id: null,
    };
  }
}
