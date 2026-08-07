import { Injectable } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import { IUserOption, NewUserOption } from '../user-option.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts IUserOption for edit and NewUserOptionFormGroupInput for create.
 */
type UserOptionFormGroupInput = IUserOption | PartialWithRequiredKeyOf<NewUserOption>;

type UserOptionFormDefaults = Pick<NewUserOption, 'id'>;

type UserOptionFormGroupContent = {
  id: FormControl<IUserOption['id'] | NewUserOption['id']>;
  category: FormControl<IUserOption['category']>;
  userRef: FormControl<IUserOption['userRef']>;
  metadata: FormControl<IUserOption['metadata']>;
};

export type UserOptionFormGroup = FormGroup<UserOptionFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class UserOptionFormService {
  createUserOptionFormGroup(userOption?: UserOptionFormGroupInput): UserOptionFormGroup {
    const userOptionRawValue = {
      ...this.getFormDefaults(),
      ...(userOption ?? { id: null }),
    };

    return new FormGroup<UserOptionFormGroupContent>({
      id: new FormControl(
        { value: userOptionRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      category: new FormControl(userOptionRawValue.category, {
        validators: [Validators.required, Validators.maxLength(60)],
      }),
      userRef: new FormControl(userOptionRawValue.userRef, {
        validators: [Validators.required, Validators.maxLength(60)],
      }),
      metadata: new FormControl(userOptionRawValue.metadata, {
        validators: [Validators.maxLength(500)],
      }),
    });
  }

  getUserOption(form: UserOptionFormGroup): IUserOption | NewUserOption {
    return form.getRawValue();
  }

  resetForm(form: UserOptionFormGroup, userOption: UserOptionFormGroupInput): void {
    const userOptionRawValue = { ...this.getFormDefaults(), ...userOption };
    form.reset({
      ...userOptionRawValue,
      id: { value: userOptionRawValue.id, disabled: true },
    });
  }

  private getFormDefaults(): UserOptionFormDefaults {
    return {
      id: null,
    };
  }
}
