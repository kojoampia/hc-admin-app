import { Injectable } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import { IProfessional, NewProfessional } from '../professional.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts IProfessional for edit and NewProfessionalFormGroupInput for create.
 */
type ProfessionalFormGroupInput = IProfessional | PartialWithRequiredKeyOf<NewProfessional>;

type ProfessionalFormDefaults = Pick<NewProfessional, 'id'>;

type ProfessionalFormGroupContent = {
  id: FormControl<IProfessional['id'] | NewProfessional['id']>;
  role: FormControl<IProfessional['role']>;
  speciality: FormControl<IProfessional['speciality']>;
  licenceNumber: FormControl<IProfessional['licenceNumber']>;
  verification: FormControl<IProfessional['verification']>;
  status: FormControl<IProfessional['status']>;
  patientCount: FormControl<IProfessional['patientCount']>;
  caseCount: FormControl<IProfessional['caseCount']>;
  visitCount: FormControl<IProfessional['visitCount']>;
  rating: FormControl<IProfessional['rating']>;
  joinedOn: FormControl<IProfessional['joinedOn']>;
  profile: FormControl<IProfessional['profile']>;
  team: FormControl<IProfessional['team']>;
  hub: FormControl<IProfessional['hub']>;
  isArchived: FormControl<IProfessional['isArchived']>;
};

export type ProfessionalFormGroup = FormGroup<ProfessionalFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class ProfessionalFormService {
  createProfessionalFormGroup(professional?: ProfessionalFormGroupInput): ProfessionalFormGroup {
    const professionalRawValue = {
      ...this.getFormDefaults(),
      ...(professional ?? { id: null }),
    };

    return new FormGroup<ProfessionalFormGroupContent>({
      id: new FormControl(
        { value: professionalRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      role: new FormControl(professionalRawValue.role, {
        validators: [Validators.required],
      }),
      speciality: new FormControl(professionalRawValue.speciality, {
        validators: [Validators.maxLength(80)],
      }),
      licenceNumber: new FormControl(professionalRawValue.licenceNumber, {
        validators: [Validators.required, Validators.maxLength(40)],
      }),
      verification: new FormControl(professionalRawValue.verification, {
        validators: [Validators.required],
      }),
      status: new FormControl(professionalRawValue.status, {
        validators: [Validators.required],
      }),
      patientCount: new FormControl(professionalRawValue.patientCount, {
        validators: [Validators.min(0)],
      }),
      caseCount: new FormControl(professionalRawValue.caseCount, {
        validators: [Validators.min(0)],
      }),
      visitCount: new FormControl(professionalRawValue.visitCount, {
        validators: [Validators.min(0)],
      }),
      rating: new FormControl(professionalRawValue.rating, {
        validators: [Validators.min(0), Validators.max(5)],
      }),
      joinedOn: new FormControl(professionalRawValue.joinedOn, {
        validators: [Validators.required],
      }),
      profile: new FormControl(professionalRawValue.profile, {
        validators: [Validators.required],
      }),
      team: new FormControl(professionalRawValue.team),
      hub: new FormControl(professionalRawValue.hub),
      /*
       * Carried through the form, never offered by it — backlog item 139, which is item 135's
       * finding on this entity. `patient` took this shape first and the reasoning transfers whole.
       *
       * **The field already has an owner and a narrower verb.** `ProfessionalService.setArchived`
       * PATCHes `{ id, isArchived }` and nothing else, and its javadoc argues against exactly the
       * write this control would otherwise make: "sending it back would quietly overwrite any change
       * made in between with a stale copy". An enabled control here gives one field two writers, and
       * the wider of the two is a `PUT` of a whole document the route resolver read when the screen
       * opened.
       *
       * Two smaller reasons, each sufficient on its own to keep it off the screen. The form is a
       * three-step wizard grouped by subject — practice, standing, placement
       * (`professional-update.ts:76-82`) — and archiving is none of those; it is a directory action,
       * which is where the button already is. And a `PUT` that happens to flip a boolean is
       * indistinguishable in `AuditLog` from any other edit of the record, where the one-field PATCH
       * reads as an archive action and nothing else.
       *
       * Declaring it at all is what closes the defect: `getRawValue()` includes disabled controls, so
       * the control is what puts `isArchived` in the body. Without it, `getProfessional()` omits the
       * key and `ProfessionalResource.updateProfessional` saves the deserialised body, so the stored
       * `true` becomes `null` over `@Field("is_archived")` — and because the active list filters on
       * `isArchived.notEquals=true`, which matches a null, the archived clinician silently returns to
       * the directory.
       *
       * ⚠ **That resource restores two other fields from the stored document and not this one**, which
       * is the sharpest statement of why this control is needed. `verification`, `homeSpaceId` and
       * `unavailabilityPeriods` are all re-read and put back before the save, each with a comment
       * saying why; `isArchived` is written straight through from the body. So the server-side guard
       * this defect would otherwise need already exists three times over in the same method — it was
       * simply never extended here, exactly as `setArchived`'s reasoning was never carried across to
       * the edit screen beside it.
       *
       * ⚠ **No validators, deliberately.** The api declares no constraint on this field, so there is
       * nothing to mirror — and a mirrored `required` is the precise wedge item 115 measured on
       * `patient`'s form: Angular excludes a disabled control from a group's validity, but the moment
       * one is enabled an empty value makes `editForm.invalid` true, and `professional-update.html`
       * binds `[disabled]="editForm.invalid || isSaving()"`. Save would be permanently dead with no
       * field on screen to fix it.
       *
       * ⚠ **This does not make the write safe, and must not be read as though it did.** Carrying the
       * value still sends whatever the resolver read when the screen opened, so an archive performed
       * elsewhere while this form is open is still overwritten on save. That stale-write window is not
       * closed here — it is narrowed to the one every other field on this form already has. What
       * changes is that a field nobody touched stops being destroyed by an edit to a different one.
       */
      isArchived: new FormControl({ value: professionalRawValue.isArchived, disabled: true }),
    });
  }

  getProfessional(form: ProfessionalFormGroup): IProfessional | NewProfessional {
    return form.getRawValue();
  }

  resetForm(form: ProfessionalFormGroup, professional: ProfessionalFormGroupInput): void {
    const professionalRawValue = { ...this.getFormDefaults(), ...professional };
    form.reset({
      ...professionalRawValue,
      id: { value: professionalRawValue.id, disabled: true },
      // Boxed for the same reason as `id` above — `reset` is the live path, called for every record
      // the screen loads, and a bare value here would leave the control's disabled state depending on
      // nothing this method says.
      //
      // ⚠ Measured on `patient` on 2026-09-25 and re-measured here, because the obvious reading is
      // wrong: this line and the boxed value in `createProfessionalFormGroup` are **mutually
      // redundant**, not additive. `reset` preserves a control's existing disabled state when handed a
      // bare value, so removing this line alone changes no behaviour and
      // `archived-survives-an-edit.spec.ts` stays green — while removing the *other* one alone is
      // caught only on the create path, because this line re-disables the control the moment a record
      // is loaded. Each covers the other's absence. Keep both: the guard cannot see a defect in either
      // one individually, which is an argument for defence in depth and not for trimming one away.
      isArchived: { value: professionalRawValue.isArchived, disabled: true },
    });
  }

  private getFormDefaults(): ProfessionalFormDefaults {
    return {
      id: null,
    };
  }
}
