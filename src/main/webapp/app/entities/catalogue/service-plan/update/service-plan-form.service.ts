import { Injectable } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import { IServicePlan, NewServicePlan } from '../service-plan.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts IServicePlan for edit and NewServicePlanFormGroupInput for create.
 */
type ServicePlanFormGroupInput = IServicePlan | PartialWithRequiredKeyOf<NewServicePlan>;

type ServicePlanFormDefaults = Pick<NewServicePlan, 'id' | 'featured'>;

type ServicePlanFormGroupContent = {
  id: FormControl<IServicePlan['id'] | NewServicePlan['id']>;
  name: FormControl<IServicePlan['name']>;
  tier: FormControl<IServicePlan['tier']>;
  tierLabel: FormControl<IServicePlan['tierLabel']>;
  monthlyPrice: FormControl<IServicePlan['monthlyPrice']>;
  currency: FormControl<IServicePlan['currency']>;
  summary: FormControl<IServicePlan['summary']>;
  featured: FormControl<IServicePlan['featured']>;
  subscriberCount: FormControl<IServicePlan['subscriberCount']>;
};

export type ServicePlanFormGroup = FormGroup<ServicePlanFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class ServicePlanFormService {
  createServicePlanFormGroup(servicePlan?: ServicePlanFormGroupInput): ServicePlanFormGroup {
    const servicePlanRawValue = {
      ...this.getFormDefaults(),
      ...(servicePlan ?? { id: null }),
    };

    return new FormGroup<ServicePlanFormGroupContent>({
      id: new FormControl(
        { value: servicePlanRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      name: new FormControl(servicePlanRawValue.name, {
        validators: [Validators.required, Validators.maxLength(60)],
      }),
      tier: new FormControl(servicePlanRawValue.tier, {
        validators: [Validators.required],
      }),
      tierLabel: new FormControl(servicePlanRawValue.tierLabel, {
        validators: [Validators.maxLength(40)],
      }),
      monthlyPrice: new FormControl(servicePlanRawValue.monthlyPrice, {
        validators: [Validators.required, Validators.min(0)],
      }),
      currency: new FormControl(servicePlanRawValue.currency, {
        validators: [Validators.required, Validators.maxLength(3)],
      }),
      summary: new FormControl(servicePlanRawValue.summary, {
        validators: [Validators.maxLength(240)],
      }),
      featured: new FormControl(servicePlanRawValue.featured, {
        validators: [Validators.required],
      }),
      subscriberCount: new FormControl(servicePlanRawValue.subscriberCount, {
        validators: [Validators.min(0)],
      }),
    });
  }

  getServicePlan(form: ServicePlanFormGroup): IServicePlan | NewServicePlan {
    return form.getRawValue();
  }

  resetForm(form: ServicePlanFormGroup, servicePlan: ServicePlanFormGroupInput): void {
    const servicePlanRawValue = { ...this.getFormDefaults(), ...servicePlan };
    form.reset({
      ...servicePlanRawValue,
      id: { value: servicePlanRawValue.id, disabled: true },
    });
  }

  private getFormDefaults(): ServicePlanFormDefaults {
    return {
      id: null,
      featured: false,
    };
  }
}
