import { Injectable } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import { IAddress, NewAddress } from '../address.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts IAddress for edit and NewAddressFormGroupInput for create.
 */
type AddressFormGroupInput = IAddress | PartialWithRequiredKeyOf<NewAddress>;

type AddressFormDefaults = Pick<NewAddress, 'id'>;

type AddressFormGroupContent = {
  id: FormControl<IAddress['id'] | NewAddress['id']>;
  digitalAddress: FormControl<IAddress['digitalAddress']>;
  streetAddress: FormControl<IAddress['streetAddress']>;
  townDistrict: FormControl<IAddress['townDistrict']>;
  cityState: FormControl<IAddress['cityState']>;
  region: FormControl<IAddress['region']>;
  country: FormControl<IAddress['country']>;
};

export type AddressFormGroup = FormGroup<AddressFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class AddressFormService {
  createAddressFormGroup(address?: AddressFormGroupInput): AddressFormGroup {
    const addressRawValue = {
      ...this.getFormDefaults(),
      ...(address ?? { id: null }),
    };

    return new FormGroup<AddressFormGroupContent>({
      id: new FormControl(
        { value: addressRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      digitalAddress: new FormControl(addressRawValue.digitalAddress, {
        validators: [
          Validators.required,
          Validators.maxLength(20),
          Validators.pattern('^[A-Z]{2}-[0-9]{3}-[0-9]{4}$'), // NOSONAR
        ],
      }),
      streetAddress: new FormControl(addressRawValue.streetAddress, {
        validators: [Validators.required, Validators.maxLength(120)],
      }),
      townDistrict: new FormControl(addressRawValue.townDistrict, {
        validators: [Validators.maxLength(60)],
      }),
      cityState: new FormControl(addressRawValue.cityState, {
        validators: [Validators.required, Validators.maxLength(60)],
      }),
      region: new FormControl(addressRawValue.region, {
        validators: [Validators.required, Validators.maxLength(60)],
      }),
      country: new FormControl(addressRawValue.country, {
        validators: [Validators.required, Validators.maxLength(60)],
      }),
    });
  }

  getAddress(form: AddressFormGroup): IAddress | NewAddress {
    return form.getRawValue();
  }

  resetForm(form: AddressFormGroup, address: AddressFormGroupInput): void {
    const addressRawValue = { ...this.getFormDefaults(), ...address };
    form.reset({
      ...addressRawValue,
      id: { value: addressRawValue.id, disabled: true },
    });
  }

  private getFormDefaults(): AddressFormDefaults {
    return {
      id: null,
    };
  }
}
