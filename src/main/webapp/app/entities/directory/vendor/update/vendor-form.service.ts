import { Injectable } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import { IVendor, NewVendor } from '../vendor.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts IVendor for edit and NewVendorFormGroupInput for create.
 */
type VendorFormGroupInput = IVendor | PartialWithRequiredKeyOf<NewVendor>;

type VendorFormDefaults = Pick<NewVendor, 'id'>;

type VendorFormGroupContent = {
  id: FormControl<IVendor['id'] | NewVendor['id']>;
  name: FormControl<IVendor['name']>;
  category: FormControl<IVendor['category']>;
  serviceSummary: FormControl<IVendor['serviceSummary']>;
  contactName: FormControl<IVendor['contactName']>;
  phone: FormControl<IVendor['phone']>;
  email: FormControl<IVendor['email']>;
  city: FormControl<IVendor['city']>;
  status: FormControl<IVendor['status']>;
  contractNote: FormControl<IVendor['contractNote']>;
  contractRenewsOn: FormControl<IVendor['contractRenewsOn']>;
  orderCount: FormControl<IVendor['orderCount']>;
  spendToDate: FormControl<IVendor['spendToDate']>;
  rating: FormControl<IVendor['rating']>;
};

export type VendorFormGroup = FormGroup<VendorFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class VendorFormService {
  createVendorFormGroup(vendor?: VendorFormGroupInput): VendorFormGroup {
    const vendorRawValue = {
      ...this.getFormDefaults(),
      ...(vendor ?? { id: null }),
    };

    return new FormGroup<VendorFormGroupContent>({
      id: new FormControl(
        { value: vendorRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      name: new FormControl(vendorRawValue.name, {
        validators: [Validators.required, Validators.maxLength(100)],
      }),
      category: new FormControl(vendorRawValue.category, {
        validators: [Validators.required, Validators.maxLength(40)],
      }),
      serviceSummary: new FormControl(vendorRawValue.serviceSummary, {
        validators: [Validators.maxLength(200)],
      }),
      contactName: new FormControl(vendorRawValue.contactName, {
        validators: [Validators.maxLength(80)],
      }),
      phone: new FormControl(vendorRawValue.phone, {
        validators: [Validators.maxLength(24)],
      }),
      email: new FormControl(vendorRawValue.email, {
        validators: [Validators.maxLength(120)],
      }),
      city: new FormControl(vendorRawValue.city, {
        validators: [Validators.maxLength(60)],
      }),
      status: new FormControl(vendorRawValue.status, {
        validators: [Validators.required],
      }),
      contractNote: new FormControl(vendorRawValue.contractNote, {
        validators: [Validators.maxLength(80)],
      }),
      contractRenewsOn: new FormControl(vendorRawValue.contractRenewsOn),
      orderCount: new FormControl(vendorRawValue.orderCount, {
        validators: [Validators.min(0)],
      }),
      spendToDate: new FormControl(vendorRawValue.spendToDate, {
        validators: [Validators.min(0)],
      }),
      rating: new FormControl(vendorRawValue.rating, {
        validators: [Validators.min(0), Validators.max(5)],
      }),
    });
  }

  getVendor(form: VendorFormGroup): IVendor | NewVendor {
    return form.getRawValue();
  }

  resetForm(form: VendorFormGroup, vendor: VendorFormGroupInput): void {
    const vendorRawValue = { ...this.getFormDefaults(), ...vendor };
    form.reset({
      ...vendorRawValue,
      id: { value: vendorRawValue.id, disabled: true },
    });
  }

  private getFormDefaults(): VendorFormDefaults {
    return {
      id: null,
    };
  }
}
