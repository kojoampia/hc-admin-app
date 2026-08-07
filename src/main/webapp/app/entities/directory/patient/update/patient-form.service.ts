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
    });
  }

  private getFormDefaults(): PatientFormDefaults {
    return {
      id: null,
    };
  }
}
