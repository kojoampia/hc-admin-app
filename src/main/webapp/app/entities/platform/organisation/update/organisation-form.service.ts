import { Injectable } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import { IOrganisation, NewOrganisation } from '../organisation.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts IOrganisation for edit and NewOrganisationFormGroupInput for create.
 */
type OrganisationFormGroupInput = IOrganisation | PartialWithRequiredKeyOf<NewOrganisation>;

type OrganisationFormDefaults = Pick<NewOrganisation, 'id'>;

type OrganisationFormGroupContent = {
  id: FormControl<IOrganisation['id'] | NewOrganisation['id']>;
  name: FormControl<IOrganisation['name']>;
  legalName: FormControl<IOrganisation['legalName']>;
  description: FormControl<IOrganisation['description']>;
  registrationNumber: FormControl<IOrganisation['registrationNumber']>;
  tin: FormControl<IOrganisation['tin']>;
  foundedOn: FormControl<IOrganisation['foundedOn']>;
  switchboard: FormControl<IOrganisation['switchboard']>;
  email: FormControl<IOrganisation['email']>;
  deskHours: FormControl<IOrganisation['deskHours']>;
  address: FormControl<IOrganisation['address']>;
};

export type OrganisationFormGroup = FormGroup<OrganisationFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class OrganisationFormService {
  createOrganisationFormGroup(organisation?: OrganisationFormGroupInput): OrganisationFormGroup {
    const organisationRawValue = {
      ...this.getFormDefaults(),
      ...(organisation ?? { id: null }),
    };

    return new FormGroup<OrganisationFormGroupContent>({
      id: new FormControl(
        { value: organisationRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      name: new FormControl(organisationRawValue.name, {
        validators: [Validators.required, Validators.maxLength(80)],
      }),
      legalName: new FormControl(organisationRawValue.legalName, {
        validators: [Validators.required, Validators.maxLength(120)],
      }),
      description: new FormControl(organisationRawValue.description, {
        validators: [Validators.maxLength(400)],
      }),
      registrationNumber: new FormControl(organisationRawValue.registrationNumber, {
        validators: [Validators.maxLength(40)],
      }),
      tin: new FormControl(organisationRawValue.tin, {
        validators: [Validators.maxLength(40)],
      }),
      foundedOn: new FormControl(organisationRawValue.foundedOn),
      switchboard: new FormControl(organisationRawValue.switchboard, {
        validators: [Validators.maxLength(24)],
      }),
      email: new FormControl(organisationRawValue.email, {
        validators: [Validators.maxLength(120)],
      }),
      deskHours: new FormControl(organisationRawValue.deskHours, {
        validators: [Validators.maxLength(80)],
      }),
      address: new FormControl(organisationRawValue.address),
    });
  }

  getOrganisation(form: OrganisationFormGroup): IOrganisation | NewOrganisation {
    return form.getRawValue();
  }

  resetForm(form: OrganisationFormGroup, organisation: OrganisationFormGroupInput): void {
    const organisationRawValue = { ...this.getFormDefaults(), ...organisation };
    form.reset({
      ...organisationRawValue,
      id: { value: organisationRawValue.id, disabled: true },
    });
  }

  private getFormDefaults(): OrganisationFormDefaults {
    return {
      id: null,
    };
  }
}
