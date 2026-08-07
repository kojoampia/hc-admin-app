import { Injectable } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import { IProfile, NewProfile } from '../profile.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts IProfile for edit and NewProfileFormGroupInput for create.
 */
type ProfileFormGroupInput = IProfile | PartialWithRequiredKeyOf<NewProfile>;

type ProfileFormDefaults = Pick<NewProfile, 'id'>;

type ProfileFormGroupContent = {
  id: FormControl<IProfile['id'] | NewProfile['id']>;
  accountId: FormControl<IProfile['accountId']>;
  title: FormControl<IProfile['title']>;
  firstName: FormControl<IProfile['firstName']>;
  middleName: FormControl<IProfile['middleName']>;
  lastName: FormControl<IProfile['lastName']>;
  dateOfBirth: FormControl<IProfile['dateOfBirth']>;
  sex: FormControl<IProfile['sex']>;
  mobilePhone: FormControl<IProfile['mobilePhone']>;
  email: FormControl<IProfile['email']>;
  idType: FormControl<IProfile['idType']>;
  idNumber: FormControl<IProfile['idNumber']>;
  address: FormControl<IProfile['address']>;
};

export type ProfileFormGroup = FormGroup<ProfileFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class ProfileFormService {
  createProfileFormGroup(profile?: ProfileFormGroupInput): ProfileFormGroup {
    const profileRawValue = {
      ...this.getFormDefaults(),
      ...(profile ?? { id: null }),
    };

    return new FormGroup<ProfileFormGroupContent>({
      id: new FormControl(
        { value: profileRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      accountId: new FormControl(profileRawValue.accountId, {
        validators: [Validators.required, Validators.maxLength(60)],
      }),
      title: new FormControl(profileRawValue.title),
      firstName: new FormControl(profileRawValue.firstName, {
        validators: [Validators.required, Validators.maxLength(50)],
      }),
      middleName: new FormControl(profileRawValue.middleName, {
        validators: [Validators.maxLength(50)],
      }),
      lastName: new FormControl(profileRawValue.lastName, {
        validators: [Validators.required, Validators.maxLength(50)],
      }),
      dateOfBirth: new FormControl(profileRawValue.dateOfBirth, {
        validators: [Validators.required],
      }),
      sex: new FormControl(profileRawValue.sex, {
        validators: [Validators.required],
      }),
      mobilePhone: new FormControl(profileRawValue.mobilePhone, {
        validators: [Validators.required, Validators.maxLength(24)],
      }),
      email: new FormControl(profileRawValue.email, {
        validators: [
          Validators.required,
          Validators.maxLength(120),
          Validators.pattern('^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'), // NOSONAR
        ],
      }),
      idType: new FormControl(profileRawValue.idType, {
        validators: [Validators.required],
      }),
      idNumber: new FormControl(profileRawValue.idNumber, {
        validators: [Validators.required, Validators.maxLength(40)],
      }),
      address: new FormControl(profileRawValue.address),
    });
  }

  getProfile(form: ProfileFormGroup): IProfile | NewProfile {
    return form.getRawValue();
  }

  resetForm(form: ProfileFormGroup, profile: ProfileFormGroupInput): void {
    const profileRawValue = { ...this.getFormDefaults(), ...profile };
    form.reset({
      ...profileRawValue,
      id: { value: profileRawValue.id, disabled: true },
    });
  }

  private getFormDefaults(): ProfileFormDefaults {
    return {
      id: null,
    };
  }
}
