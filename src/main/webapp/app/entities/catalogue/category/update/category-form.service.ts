import { Injectable } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import { ICategory, NewCategory } from '../category.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts ICategory for edit and NewCategoryFormGroupInput for create.
 */
type CategoryFormGroupInput = ICategory | PartialWithRequiredKeyOf<NewCategory>;

type CategoryFormDefaults = Pick<NewCategory, 'id'>;

type CategoryFormGroupContent = {
  id: FormControl<ICategory['id'] | NewCategory['id']>;
  name: FormControl<ICategory['name']>;
  description: FormControl<ICategory['description']>;
  iconKey: FormControl<ICategory['iconKey']>;
};

export type CategoryFormGroup = FormGroup<CategoryFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class CategoryFormService {
  createCategoryFormGroup(category?: CategoryFormGroupInput): CategoryFormGroup {
    const categoryRawValue = {
      ...this.getFormDefaults(),
      ...(category ?? { id: null }),
    };

    return new FormGroup<CategoryFormGroupContent>({
      id: new FormControl(
        { value: categoryRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      name: new FormControl(categoryRawValue.name, {
        validators: [Validators.required, Validators.maxLength(60)],
      }),
      description: new FormControl(categoryRawValue.description, {
        validators: [Validators.maxLength(200)],
      }),
      iconKey: new FormControl(categoryRawValue.iconKey, {
        validators: [Validators.maxLength(30)],
      }),
    });
  }

  getCategory(form: CategoryFormGroup): ICategory | NewCategory {
    return form.getRawValue();
  }

  resetForm(form: CategoryFormGroup, category: CategoryFormGroupInput): void {
    const categoryRawValue = { ...this.getFormDefaults(), ...category };
    form.reset({
      ...categoryRawValue,
      id: { value: categoryRawValue.id, disabled: true },
    });
  }

  private getFormDefaults(): CategoryFormDefaults {
    return {
      id: null,
    };
  }
}
