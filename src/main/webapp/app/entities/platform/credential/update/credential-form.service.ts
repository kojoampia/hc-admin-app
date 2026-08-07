import { Injectable } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import dayjs from 'dayjs/esm';

import { DATE_TIME_FORMAT } from 'app/config/input.constants';
import { ICredential, NewCredential } from '../credential.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts ICredential for edit and NewCredentialFormGroupInput for create.
 */
type CredentialFormGroupInput = ICredential | PartialWithRequiredKeyOf<NewCredential>;

/**
 * Type that converts some properties for forms.
 */
type FormValueOf<T extends ICredential | NewCredential> = Omit<T, 'lastLoginAt'> & {
  lastLoginAt?: string | null;
};

type CredentialFormRawValue = FormValueOf<ICredential>;

type NewCredentialFormRawValue = FormValueOf<NewCredential>;

type CredentialFormDefaults = Pick<NewCredential, 'id' | 'enabled' | 'lastLoginAt'>;

type CredentialFormGroupContent = {
  id: FormControl<CredentialFormRawValue['id'] | NewCredential['id']>;
  email: FormControl<CredentialFormRawValue['email']>;
  phoneNumber: FormControl<CredentialFormRawValue['phoneNumber']>;
  passwordHash: FormControl<CredentialFormRawValue['passwordHash']>;
  role: FormControl<CredentialFormRawValue['role']>;
  enabled: FormControl<CredentialFormRawValue['enabled']>;
  lastLoginAt: FormControl<CredentialFormRawValue['lastLoginAt']>;
};

export type CredentialFormGroup = FormGroup<CredentialFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class CredentialFormService {
  createCredentialFormGroup(credential?: CredentialFormGroupInput): CredentialFormGroup {
    const credentialRawValue = this.convertCredentialToCredentialRawValue({
      ...this.getFormDefaults(),
      ...(credential ?? { id: null }),
    });

    return new FormGroup<CredentialFormGroupContent>({
      id: new FormControl(
        { value: credentialRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      email: new FormControl(credentialRawValue.email, {
        validators: [Validators.required, Validators.maxLength(120)],
      }),
      phoneNumber: new FormControl(credentialRawValue.phoneNumber, {
        validators: [Validators.maxLength(24)],
      }),
      passwordHash: new FormControl(credentialRawValue.passwordHash, {
        validators: [Validators.maxLength(120)],
      }),
      role: new FormControl(credentialRawValue.role, {
        validators: [Validators.required],
      }),
      enabled: new FormControl(credentialRawValue.enabled, {
        validators: [Validators.required],
      }),
      lastLoginAt: new FormControl(credentialRawValue.lastLoginAt),
    });
  }

  getCredential(form: CredentialFormGroup): ICredential | NewCredential {
    return this.convertCredentialRawValueToCredential(form.getRawValue());
  }

  resetForm(form: CredentialFormGroup, credential: CredentialFormGroupInput): void {
    const credentialRawValue = this.convertCredentialToCredentialRawValue({ ...this.getFormDefaults(), ...credential });
    form.reset({
      ...credentialRawValue,
      id: { value: credentialRawValue.id, disabled: true },
    });
  }

  private getFormDefaults(): CredentialFormDefaults {
    const currentTime = dayjs();

    return {
      id: null,
      enabled: false,
      lastLoginAt: currentTime,
    };
  }

  private convertCredentialRawValueToCredential(
    rawCredential: CredentialFormRawValue | NewCredentialFormRawValue,
  ): ICredential | NewCredential {
    return {
      ...rawCredential,
      lastLoginAt: dayjs(rawCredential.lastLoginAt, DATE_TIME_FORMAT),
    };
  }

  private convertCredentialToCredentialRawValue(
    credential: ICredential | (Partial<NewCredential> & CredentialFormDefaults),
  ): CredentialFormRawValue | PartialWithRequiredKeyOf<NewCredentialFormRawValue> {
    return {
      ...credential,
      lastLoginAt: credential.lastLoginAt ? credential.lastLoginAt.format(DATE_TIME_FORMAT) : undefined,
    };
  }
}
