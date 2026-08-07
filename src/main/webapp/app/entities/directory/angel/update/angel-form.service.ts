import { Injectable } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import { IAngel, NewAngel } from '../angel.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts IAngel for edit and NewAngelFormGroupInput for create.
 */
type AngelFormGroupInput = IAngel | PartialWithRequiredKeyOf<NewAngel>;

type AngelFormDefaults = Pick<NewAngel, 'id'>;

type AngelFormGroupContent = {
  id: FormControl<IAngel['id'] | NewAngel['id']>;
  name: FormControl<IAngel['name']>;
  relationship: FormControl<IAngel['relationship']>;
  phone: FormControl<IAngel['phone']>;
  email: FormControl<IAngel['email']>;
  country: FormControl<IAngel['country']>;
};

export type AngelFormGroup = FormGroup<AngelFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class AngelFormService {
  createAngelFormGroup(angel?: AngelFormGroupInput): AngelFormGroup {
    const angelRawValue = {
      ...this.getFormDefaults(),
      ...(angel ?? { id: null }),
    };

    return new FormGroup<AngelFormGroupContent>({
      id: new FormControl(
        { value: angelRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      name: new FormControl(angelRawValue.name, {
        validators: [Validators.required, Validators.maxLength(80)],
      }),
      relationship: new FormControl(angelRawValue.relationship, {
        validators: [Validators.required, Validators.maxLength(60)],
      }),
      phone: new FormControl(angelRawValue.phone, {
        validators: [Validators.required, Validators.maxLength(24)],
      }),
      email: new FormControl(angelRawValue.email, {
        validators: [Validators.maxLength(120)],
      }),
      country: new FormControl(angelRawValue.country, {
        validators: [Validators.maxLength(60)],
      }),
    });
  }

  getAngel(form: AngelFormGroup): IAngel | NewAngel {
    return form.getRawValue();
  }

  resetForm(form: AngelFormGroup, angel: AngelFormGroupInput): void {
    const angelRawValue = { ...this.getFormDefaults(), ...angel };
    form.reset({
      ...angelRawValue,
      id: { value: angelRawValue.id, disabled: true },
    });
  }

  private getFormDefaults(): AngelFormDefaults {
    return {
      id: null,
    };
  }
}
