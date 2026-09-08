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
  code: FormControl<IServicePlan['code']>;
  tierLabel: FormControl<IServicePlan['tierLabel']>;
  displayOrder: FormControl<IServicePlan['displayOrder']>;
  monthlyPrice: FormControl<IServicePlan['monthlyPrice']>;
  currency: FormControl<IServicePlan['currency']>;
  summary: FormControl<IServicePlan['summary']>;
  featured: FormControl<IServicePlan['featured']>;
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
      // Not required, and not disabled either. `code` is kept in step with Abofonsa's published
      // catalogue by the api's scheduled sync, so an administrator has no reason to type one — but a
      // plan that predates the reconciliation has none, and locking the field would leave the only
      // way of giving it one a database edit. The form says where it comes from instead.
      code: new FormControl(servicePlanRawValue.code, {
        validators: [Validators.maxLength(40)],
      }),
      tierLabel: new FormControl(servicePlanRawValue.tierLabel, {
        validators: [Validators.maxLength(40)],
      }),
      displayOrder: new FormControl(servicePlanRawValue.displayOrder),
      // Optional since 2026-09-08. A plan the catalogue sync created carries no price until somebody
      // sets one here, because Abofonsa publishes a formatted string rather than a number and this
      // console must never parse it back. See `IServicePlan.monthlyPrice`.
      monthlyPrice: new FormControl(servicePlanRawValue.monthlyPrice, {
        validators: [Validators.min(0)],
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
