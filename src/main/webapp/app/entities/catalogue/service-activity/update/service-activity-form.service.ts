import { Injectable } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import { IServiceActivity, NewServiceActivity } from '../service-activity.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts IServiceActivity for edit and NewServiceActivityFormGroupInput for create.
 */
type ServiceActivityFormGroupInput = IServiceActivity | PartialWithRequiredKeyOf<NewServiceActivity>;

type ServiceActivityFormDefaults = Pick<NewServiceActivity, 'id' | 'published'>;

type ServiceActivityFormGroupContent = {
  id: FormControl<IServiceActivity['id'] | NewServiceActivity['id']>;
  name: FormControl<IServiceActivity['name']>;
  unit: FormControl<IServiceActivity['unit']>;
  unitPrice: FormControl<IServiceActivity['unitPrice']>;
  duration: FormControl<IServiceActivity['duration']>;
  published: FormControl<IServiceActivity['published']>;
  category: FormControl<IServiceActivity['category']>;
};

export type ServiceActivityFormGroup = FormGroup<ServiceActivityFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class ServiceActivityFormService {
  createServiceActivityFormGroup(serviceActivity?: ServiceActivityFormGroupInput): ServiceActivityFormGroup {
    const serviceActivityRawValue = {
      ...this.getFormDefaults(),
      ...(serviceActivity ?? { id: null }),
    };

    return new FormGroup<ServiceActivityFormGroupContent>({
      id: new FormControl(
        { value: serviceActivityRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      name: new FormControl(serviceActivityRawValue.name, {
        validators: [Validators.required, Validators.maxLength(100)],
      }),
      unit: new FormControl(serviceActivityRawValue.unit, {
        validators: [Validators.required, Validators.maxLength(40)],
      }),
      unitPrice: new FormControl(serviceActivityRawValue.unitPrice, {
        validators: [Validators.required, Validators.min(0)],
      }),
      duration: new FormControl(serviceActivityRawValue.duration, {
        validators: [Validators.maxLength(40)],
      }),
      published: new FormControl(serviceActivityRawValue.published, {
        validators: [Validators.required],
      }),
      category: new FormControl(serviceActivityRawValue.category, {
        validators: [Validators.required],
      }),
    });
  }

  getServiceActivity(form: ServiceActivityFormGroup): IServiceActivity | NewServiceActivity {
    return form.getRawValue();
  }

  resetForm(form: ServiceActivityFormGroup, serviceActivity: ServiceActivityFormGroupInput): void {
    const serviceActivityRawValue = { ...this.getFormDefaults(), ...serviceActivity };
    form.reset({
      ...serviceActivityRawValue,
      id: { value: serviceActivityRawValue.id, disabled: true },
    });
  }

  private getFormDefaults(): ServiceActivityFormDefaults {
    return {
      id: null,
      published: false,
    };
  }
}
