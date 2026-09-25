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
  isArchived: FormControl<IVendor['isArchived']>;
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
      /*
       * Carried through the form, never offered by it — backlog item 139, which is item 135's
       * finding on this entity. `patient` took this shape first and the reasoning transfers whole.
       *
       * **The field already has an owner and a narrower verb.** `VendorService.setArchived` PATCHes
       * `{ id, isArchived }` and nothing else, and its javadoc argues against exactly the write this
       * control would otherwise make: "sending it back would quietly overwrite any change made in
       * between with a stale copy". An enabled control here gives one field two writers, and the wider
       * of the two is a `PUT` of a whole document the route resolver read when the screen opened.
       *
       * Two smaller reasons, each sufficient on its own to keep it off the screen. The form is a
       * three-step wizard grouped by subject — business, contract, trading (`vendor-update.ts:46-52`)
       * — and archiving is none of those; it is a directory action, which is where the button already
       * is. And a `PUT` that happens to flip a boolean is indistinguishable in `AuditLog` from any
       * other edit of the record, where the one-field PATCH reads as an archive action and nothing
       * else.
       *
       * Declaring it at all is what closes the defect: `getRawValue()` includes disabled controls, so
       * the control is what puts `isArchived` in the body. Without it, `getVendor()` omits the key and
       * `VendorResource.updateVendor` saves the deserialised body, so the stored `true` becomes `null`
       * over `@Field("is_archived")` — and because the active list filters on `isArchived.notEquals=true`,
       * which matches a null, the archived vendor silently returns to the directory.
       *
       * ⚠ **`VendorResource.updateVendor` restores nothing at all from the stored document**, unlike
       * its professional counterpart, which re-reads three fields before saving. So on this entity the
       * form is the only thing standing between an edit and the field. That also means this control
       * closes one instance of a wider hole rather than the hole: `documents`, `facilities` and the
       * server-side `accountId` are likewise absent from the `PUT` body and likewise overwritten, and
       * none of the three is a field a hidden control should carry — they want the restore-from-stored
       * rule that `ProfessionalResource` already applies to `homeSpaceId`. Filed rather than fixed
       * here; see backlog item 139's report.
       *
       * ⚠ **No validators, deliberately.** The api declares no constraint on this field, so there is
       * nothing to mirror — and a mirrored `required` is the precise wedge item 115 measured on
       * `patient`'s form: Angular excludes a disabled control from a group's validity, but the moment
       * one is enabled an empty value makes `editForm.invalid` true, and `vendor-update.html` binds
       * `[disabled]="editForm.invalid || isSaving()"`. Save would be permanently dead with no field on
       * screen to fix it.
       *
       * ⚠ **This does not make the write safe, and must not be read as though it did.** Carrying the
       * value still sends whatever the resolver read when the screen opened, so an archive performed
       * elsewhere while this form is open is still overwritten on save. That stale-write window is not
       * closed here — it is narrowed to the one every other field on this form already has. What
       * changes is that a field nobody touched stops being destroyed by an edit to a different one.
       */
      isArchived: new FormControl({ value: vendorRawValue.isArchived, disabled: true }),
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
      // Boxed for the same reason as `id` above — `reset` is the live path, called for every record
      // the screen loads, and a bare value here would leave the control's disabled state depending on
      // nothing this method says.
      //
      // ⚠ Measured on `patient` on 2026-09-25 and re-measured here, because the obvious reading is
      // wrong: this line and the boxed value in `createVendorFormGroup` are **mutually redundant**,
      // not additive. `reset` preserves a control's existing disabled state when handed a bare value,
      // so removing this line alone changes no behaviour and `archived-survives-an-edit.spec.ts` stays
      // green — while removing the *other* one alone is caught only on the create path, because this
      // line re-disables the control the moment a record is loaded. Each covers the other's absence.
      // Keep both: the guard cannot see a defect in either one individually, which is an argument for
      // defence in depth and not for trimming one away.
      isArchived: { value: vendorRawValue.isArchived, disabled: true },
    });
  }

  private getFormDefaults(): VendorFormDefaults {
    return {
      id: null,
    };
  }
}
