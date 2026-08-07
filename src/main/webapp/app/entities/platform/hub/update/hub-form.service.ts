import { Injectable } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import { IHub, NewHub } from '../hub.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts IHub for edit and NewHubFormGroupInput for create.
 */
type HubFormGroupInput = IHub | PartialWithRequiredKeyOf<NewHub>;

type HubFormDefaults = Pick<NewHub, 'id'>;

type HubFormGroupContent = {
  id: FormControl<IHub['id'] | NewHub['id']>;
  name: FormControl<IHub['name']>;
  staffCount: FormControl<IHub['staffCount']>;
  address: FormControl<IHub['address']>;
};

export type HubFormGroup = FormGroup<HubFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class HubFormService {
  createHubFormGroup(hub?: HubFormGroupInput): HubFormGroup {
    const hubRawValue = {
      ...this.getFormDefaults(),
      ...(hub ?? { id: null }),
    };

    return new FormGroup<HubFormGroupContent>({
      id: new FormControl(
        { value: hubRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      name: new FormControl(hubRawValue.name, {
        validators: [Validators.required, Validators.maxLength(60)],
      }),
      staffCount: new FormControl(hubRawValue.staffCount, {
        validators: [Validators.min(0)],
      }),
      address: new FormControl(hubRawValue.address),
    });
  }

  getHub(form: HubFormGroup): IHub | NewHub {
    return form.getRawValue();
  }

  resetForm(form: HubFormGroup, hub: HubFormGroupInput): void {
    const hubRawValue = { ...this.getFormDefaults(), ...hub };
    form.reset({
      ...hubRawValue,
      id: { value: hubRawValue.id, disabled: true },
    });
  }

  private getFormDefaults(): HubFormDefaults {
    return {
      id: null,
    };
  }
}
