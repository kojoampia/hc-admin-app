import { Injectable } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import { IShiftAssignment, NewShiftAssignment } from '../shift-assignment.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts IShiftAssignment for edit and NewShiftAssignmentFormGroupInput for create.
 */
type ShiftAssignmentFormGroupInput = IShiftAssignment | PartialWithRequiredKeyOf<NewShiftAssignment>;

type ShiftAssignmentFormDefaults = Pick<NewShiftAssignment, 'id'>;

type ShiftAssignmentFormGroupContent = {
  id: FormControl<IShiftAssignment['id'] | NewShiftAssignment['id']>;
  dayIndex: FormControl<IShiftAssignment['dayIndex']>;
  shiftDate: FormControl<IShiftAssignment['shiftDate']>;
  shift: FormControl<IShiftAssignment['shift']>;
  week: FormControl<IShiftAssignment['week']>;
  professional: FormControl<IShiftAssignment['professional']>;
};

export type ShiftAssignmentFormGroup = FormGroup<ShiftAssignmentFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class ShiftAssignmentFormService {
  createShiftAssignmentFormGroup(shiftAssignment?: ShiftAssignmentFormGroupInput): ShiftAssignmentFormGroup {
    const shiftAssignmentRawValue = {
      ...this.getFormDefaults(),
      ...(shiftAssignment ?? { id: null }),
    };

    return new FormGroup<ShiftAssignmentFormGroupContent>({
      id: new FormControl(
        { value: shiftAssignmentRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      dayIndex: new FormControl(shiftAssignmentRawValue.dayIndex, {
        validators: [Validators.required, Validators.min(0), Validators.max(6)],
      }),
      shiftDate: new FormControl(shiftAssignmentRawValue.shiftDate, {
        validators: [Validators.required],
      }),
      shift: new FormControl(shiftAssignmentRawValue.shift, {
        validators: [Validators.required],
      }),
      week: new FormControl(shiftAssignmentRawValue.week, {
        validators: [Validators.required],
      }),
      professional: new FormControl(shiftAssignmentRawValue.professional, {
        validators: [Validators.required],
      }),
    });
  }

  getShiftAssignment(form: ShiftAssignmentFormGroup): IShiftAssignment | NewShiftAssignment {
    return form.getRawValue();
  }

  resetForm(form: ShiftAssignmentFormGroup, shiftAssignment: ShiftAssignmentFormGroupInput): void {
    const shiftAssignmentRawValue = { ...this.getFormDefaults(), ...shiftAssignment };
    form.reset({
      ...shiftAssignmentRawValue,
      id: { value: shiftAssignmentRawValue.id, disabled: true },
    });
  }

  private getFormDefaults(): ShiftAssignmentFormDefaults {
    return {
      id: null,
    };
  }
}
