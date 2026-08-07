import { Injectable } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import dayjs from 'dayjs/esm';

import { DATE_TIME_FORMAT } from 'app/config/input.constants';
import { IRosterWeek, NewRosterWeek } from '../roster-week.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts IRosterWeek for edit and NewRosterWeekFormGroupInput for create.
 */
type RosterWeekFormGroupInput = IRosterWeek | PartialWithRequiredKeyOf<NewRosterWeek>;

/**
 * Type that converts some properties for forms.
 */
type FormValueOf<T extends IRosterWeek | NewRosterWeek> = Omit<T, 'publishedAt'> & {
  publishedAt?: string | null;
};

type RosterWeekFormRawValue = FormValueOf<IRosterWeek>;

type NewRosterWeekFormRawValue = FormValueOf<NewRosterWeek>;

type RosterWeekFormDefaults = Pick<NewRosterWeek, 'id' | 'published' | 'publishedAt'>;

type RosterWeekFormGroupContent = {
  id: FormControl<RosterWeekFormRawValue['id'] | NewRosterWeek['id']>;
  label: FormControl<RosterWeekFormRawValue['label']>;
  startDate: FormControl<RosterWeekFormRawValue['startDate']>;
  published: FormControl<RosterWeekFormRawValue['published']>;
  publishedAt: FormControl<RosterWeekFormRawValue['publishedAt']>;
};

export type RosterWeekFormGroup = FormGroup<RosterWeekFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class RosterWeekFormService {
  createRosterWeekFormGroup(rosterWeek?: RosterWeekFormGroupInput): RosterWeekFormGroup {
    const rosterWeekRawValue = this.convertRosterWeekToRosterWeekRawValue({
      ...this.getFormDefaults(),
      ...(rosterWeek ?? { id: null }),
    });

    return new FormGroup<RosterWeekFormGroupContent>({
      id: new FormControl(
        { value: rosterWeekRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      label: new FormControl(rosterWeekRawValue.label, {
        validators: [Validators.required, Validators.maxLength(60)],
      }),
      startDate: new FormControl(rosterWeekRawValue.startDate, {
        validators: [Validators.required],
      }),
      published: new FormControl(rosterWeekRawValue.published, {
        validators: [Validators.required],
      }),
      publishedAt: new FormControl(rosterWeekRawValue.publishedAt),
    });
  }

  getRosterWeek(form: RosterWeekFormGroup): IRosterWeek | NewRosterWeek {
    return this.convertRosterWeekRawValueToRosterWeek(form.getRawValue());
  }

  resetForm(form: RosterWeekFormGroup, rosterWeek: RosterWeekFormGroupInput): void {
    const rosterWeekRawValue = this.convertRosterWeekToRosterWeekRawValue({ ...this.getFormDefaults(), ...rosterWeek });
    form.reset({
      ...rosterWeekRawValue,
      id: { value: rosterWeekRawValue.id, disabled: true },
    });
  }

  private getFormDefaults(): RosterWeekFormDefaults {
    const currentTime = dayjs();

    return {
      id: null,
      published: false,
      publishedAt: currentTime,
    };
  }

  private convertRosterWeekRawValueToRosterWeek(
    rawRosterWeek: RosterWeekFormRawValue | NewRosterWeekFormRawValue,
  ): IRosterWeek | NewRosterWeek {
    return {
      ...rawRosterWeek,
      publishedAt: dayjs(rawRosterWeek.publishedAt, DATE_TIME_FORMAT),
    };
  }

  private convertRosterWeekToRosterWeekRawValue(
    rosterWeek: IRosterWeek | (Partial<NewRosterWeek> & RosterWeekFormDefaults),
  ): RosterWeekFormRawValue | PartialWithRequiredKeyOf<NewRosterWeekFormRawValue> {
    return {
      ...rosterWeek,
      publishedAt: rosterWeek.publishedAt ? rosterWeek.publishedAt.format(DATE_TIME_FORMAT) : undefined,
    };
  }
}
