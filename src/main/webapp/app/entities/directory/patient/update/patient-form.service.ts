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
       * this is ever enabled. They do not fire today: Angular excludes disabled controls
       * from a group's validity, which is also why an event-created patient whose id has
       * not loaded yet cannot wedge the Save button.
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
