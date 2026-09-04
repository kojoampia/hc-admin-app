import { Injectable } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

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
 * Type that drops the properties this form does not speak about.
 *
 * `publishedAt` is the server's — see the form group below — so it is neither a control here nor a
 * value this service reads back out. It stays on `IRosterWeek` because the detail and list screens
 * display it; it is only the *form* that has no opinion about it.
 */
type FormValueOf<T extends IRosterWeek | NewRosterWeek> = Omit<T, 'publishedAt'>;

type RosterWeekFormRawValue = FormValueOf<IRosterWeek>;

type NewRosterWeekFormRawValue = FormValueOf<NewRosterWeek>;

type RosterWeekFormDefaults = Pick<NewRosterWeek, 'id' | 'published'>;

type RosterWeekFormGroupContent = {
  id: FormControl<RosterWeekFormRawValue['id'] | NewRosterWeek['id']>;
  label: FormControl<RosterWeekFormRawValue['label']>;
  startDate: FormControl<RosterWeekFormRawValue['startDate']>;
  published: FormControl<RosterWeekFormRawValue['published']>;
};

export type RosterWeekFormGroup = FormGroup<RosterWeekFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class RosterWeekFormService {
  /**
   * Four controls, and `publishedAt` is deliberately not the fifth.
   *
   * The generator gave it one, defaulted to `dayjs()` on create, and rendered a `datetime-local`
   * beside it. The server owns the field: `RosterWeekLifecycleCallback` derives it from `published`
   * (decision 8 of `duty-roster-resolution.md` § 9.1) and `RosterWeekResource.stripServerOwnedFields`
   * nulls whatever arrives on POST and PUT. So an administrator could set a publication date, get a
   * 200 back, and have the value silently discarded — the client/server disagreement decision 8
   * exists to end, surviving on one screen.
   *
   * Its siblings `Message.readAt` and `Task.closedAt` are absent from their DTOs, so nothing on the
   * wire can carry them. `RosterWeek` has no DTO — it is serialised as the domain entity — so the
   * field cannot leave the wire, and taking it off the form is the only place the disagreement can
   * be removed.
   *
   * Ticking `published` is how a week is published; the stamp follows from that.
   */
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
    return {
      id: null,
      published: false,
    };
  }

  private convertRosterWeekRawValueToRosterWeek(
    rawRosterWeek: RosterWeekFormRawValue | NewRosterWeekFormRawValue,
  ): IRosterWeek | NewRosterWeek {
    return {
      ...rawRosterWeek,
    };
  }

  private convertRosterWeekToRosterWeekRawValue(
    rosterWeek: IRosterWeek | (Partial<NewRosterWeek> & RosterWeekFormDefaults),
  ): RosterWeekFormRawValue | PartialWithRequiredKeyOf<NewRosterWeekFormRawValue> {
    // publishedAt is dropped rather than passed through: it is not a control, so `reset` would
    // ignore it anyway, and carrying it here would suggest the form has an opinion about it.
    const { publishedAt: _discarded, ...withoutPublishedAt } = rosterWeek;
    return {
      ...withoutPublishedAt,
    };
  }
}
