import { Injectable } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import { ICareActivity, NewCareActivity } from '../care-activity.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts ICareActivity for edit and NewCareActivityFormGroupInput for create.
 */
type CareActivityFormGroupInput = ICareActivity | PartialWithRequiredKeyOf<NewCareActivity>;

type CareActivityFormDefaults = Pick<NewCareActivity, 'id'>;

type CareActivityFormGroupContent = {
  id: FormControl<ICareActivity['id'] | NewCareActivity['id']>;
  name: FormControl<ICareActivity['name']>;
  description: FormControl<ICareActivity['description']>;
  occurredOn: FormControl<ICareActivity['occurredOn']>;
  patient: FormControl<ICareActivity['patient']>;
};

export type CareActivityFormGroup = FormGroup<CareActivityFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class CareActivityFormService {
  createCareActivityFormGroup(careActivity?: CareActivityFormGroupInput): CareActivityFormGroup {
    const careActivityRawValue = {
      ...this.getFormDefaults(),
      ...(careActivity ?? { id: null }),
    };

    return new FormGroup<CareActivityFormGroupContent>({
      id: new FormControl(
        { value: careActivityRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      name: new FormControl(careActivityRawValue.name, {
        validators: [Validators.required, Validators.maxLength(120)],
      }),
      description: new FormControl(careActivityRawValue.description, {
        validators: [Validators.maxLength(400)],
      }),
      occurredOn: new FormControl(careActivityRawValue.occurredOn, {
        validators: [Validators.required],
      }),
      patient: new FormControl(careActivityRawValue.patient, {
        validators: [Validators.required],
      }),
    });
  }

  getCareActivity(form: CareActivityFormGroup): ICareActivity | NewCareActivity {
    return form.getRawValue();
  }

  resetForm(form: CareActivityFormGroup, careActivity: CareActivityFormGroupInput): void {
    const careActivityRawValue = { ...this.getFormDefaults(), ...careActivity };
    form.reset({
      ...careActivityRawValue,
      id: { value: careActivityRawValue.id, disabled: true },
    });
  }

  private getFormDefaults(): CareActivityFormDefaults {
    return {
      id: null,
    };
  }
}
