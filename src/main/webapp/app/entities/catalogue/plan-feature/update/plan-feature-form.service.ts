import { Injectable } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import { IPlanFeature, NewPlanFeature } from '../plan-feature.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts IPlanFeature for edit and NewPlanFeatureFormGroupInput for create.
 */
type PlanFeatureFormGroupInput = IPlanFeature | PartialWithRequiredKeyOf<NewPlanFeature>;

type PlanFeatureFormDefaults = Pick<NewPlanFeature, 'id'>;

type PlanFeatureFormGroupContent = {
  id: FormControl<IPlanFeature['id'] | NewPlanFeature['id']>;
  label: FormControl<IPlanFeature['label']>;
  position: FormControl<IPlanFeature['position']>;
  plan: FormControl<IPlanFeature['plan']>;
};

export type PlanFeatureFormGroup = FormGroup<PlanFeatureFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class PlanFeatureFormService {
  createPlanFeatureFormGroup(planFeature?: PlanFeatureFormGroupInput): PlanFeatureFormGroup {
    const planFeatureRawValue = {
      ...this.getFormDefaults(),
      ...(planFeature ?? { id: null }),
    };

    return new FormGroup<PlanFeatureFormGroupContent>({
      id: new FormControl(
        { value: planFeatureRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      label: new FormControl(planFeatureRawValue.label, {
        validators: [Validators.required, Validators.maxLength(120)],
      }),
      position: new FormControl(planFeatureRawValue.position, {
        validators: [Validators.required, Validators.min(0)],
      }),
      plan: new FormControl(planFeatureRawValue.plan, {
        validators: [Validators.required],
      }),
    });
  }

  getPlanFeature(form: PlanFeatureFormGroup): IPlanFeature | NewPlanFeature {
    return form.getRawValue();
  }

  resetForm(form: PlanFeatureFormGroup, planFeature: PlanFeatureFormGroupInput): void {
    const planFeatureRawValue = { ...this.getFormDefaults(), ...planFeature };
    form.reset({
      ...planFeatureRawValue,
      id: { value: planFeatureRawValue.id, disabled: true },
    });
  }

  private getFormDefaults(): PlanFeatureFormDefaults {
    return {
      id: null,
    };
  }
}
