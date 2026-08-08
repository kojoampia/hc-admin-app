import { Injectable } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import { IProfessional, NewProfessional } from '../professional.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts IProfessional for edit and NewProfessionalFormGroupInput for create.
 */
type ProfessionalFormGroupInput = IProfessional | PartialWithRequiredKeyOf<NewProfessional>;

type ProfessionalFormDefaults = Pick<NewProfessional, 'id'>;

type ProfessionalFormGroupContent = {
  id: FormControl<IProfessional['id'] | NewProfessional['id']>;
  role: FormControl<IProfessional['role']>;
  speciality: FormControl<IProfessional['speciality']>;
  licenceNumber: FormControl<IProfessional['licenceNumber']>;
  verification: FormControl<IProfessional['verification']>;
  status: FormControl<IProfessional['status']>;
  patientCount: FormControl<IProfessional['patientCount']>;
  caseCount: FormControl<IProfessional['caseCount']>;
  visitCount: FormControl<IProfessional['visitCount']>;
  rating: FormControl<IProfessional['rating']>;
  joinedOn: FormControl<IProfessional['joinedOn']>;
  profile: FormControl<IProfessional['profile']>;
  team: FormControl<IProfessional['team']>;
  hub: FormControl<IProfessional['hub']>;
};

export type ProfessionalFormGroup = FormGroup<ProfessionalFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class ProfessionalFormService {
  createProfessionalFormGroup(professional?: ProfessionalFormGroupInput): ProfessionalFormGroup {
    const professionalRawValue = {
      ...this.getFormDefaults(),
      ...(professional ?? { id: null }),
    };

    return new FormGroup<ProfessionalFormGroupContent>({
      id: new FormControl(
        { value: professionalRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      role: new FormControl(professionalRawValue.role, {
        validators: [Validators.required],
      }),
      speciality: new FormControl(professionalRawValue.speciality, {
        validators: [Validators.maxLength(80)],
      }),
      licenceNumber: new FormControl(professionalRawValue.licenceNumber, {
        validators: [Validators.required, Validators.maxLength(40)],
      }),
      verification: new FormControl(professionalRawValue.verification, {
        validators: [Validators.required],
      }),
      status: new FormControl(professionalRawValue.status, {
        validators: [Validators.required],
      }),
      patientCount: new FormControl(professionalRawValue.patientCount, {
        validators: [Validators.min(0)],
      }),
      caseCount: new FormControl(professionalRawValue.caseCount, {
        validators: [Validators.min(0)],
      }),
      visitCount: new FormControl(professionalRawValue.visitCount, {
        validators: [Validators.min(0)],
      }),
      rating: new FormControl(professionalRawValue.rating, {
        validators: [Validators.min(0), Validators.max(5)],
      }),
      joinedOn: new FormControl(professionalRawValue.joinedOn, {
        validators: [Validators.required],
      }),
      profile: new FormControl(professionalRawValue.profile, {
        validators: [Validators.required],
      }),
      team: new FormControl(professionalRawValue.team),
      hub: new FormControl(professionalRawValue.hub),
    });
  }

  getProfessional(form: ProfessionalFormGroup): IProfessional | NewProfessional {
    return form.getRawValue();
  }

  resetForm(form: ProfessionalFormGroup, professional: ProfessionalFormGroupInput): void {
    const professionalRawValue = { ...this.getFormDefaults(), ...professional };
    form.reset({
      ...professionalRawValue,
      id: { value: professionalRawValue.id, disabled: true },
    });
  }

  private getFormDefaults(): ProfessionalFormDefaults {
    return {
      id: null,
    };
  }
}
