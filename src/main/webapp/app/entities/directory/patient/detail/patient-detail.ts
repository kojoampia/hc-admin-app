import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';

import dayjs from 'dayjs/esm';

import { StatusPill } from 'app/console/shared/status-pill/status-pill';
import { ProfessionalService } from 'app/entities/directory/professional/service/professional.service';
import { Alert } from 'app/shared/alert/alert';
import { AlertError } from 'app/shared/alert/alert-error';
import { FormatMediumDatePipe } from 'app/shared/date';
import { TranslateDirective } from 'app/shared/language';
import { IPatient } from '../patient.model';
import { PatientService } from '../service/patient.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-patient-detail',
  templateUrl: './patient-detail.html',
  styleUrl: './patient-detail.scss',
  imports: [FontAwesomeModule, Alert, AlertError, TranslateDirective, TranslatePipe, RouterLink, FormatMediumDatePipe, StatusPill],
})
export class PatientDetail {
  readonly patient = input<IPatient | null>(null);

  /**
   * Applied locally so the button flips without a re-resolve, and keyed by id so it cannot leak.
   *
   * Nothing re-runs the route resolver after a PATCH, so the input signal keeps whatever it saw and
   * the button would otherwise still say "Archive" after archiving. Holding the id alongside the
   * value means that if the resolver ever swaps the record underneath us, a stale override is
   * ignored rather than claiming the new record's state.
   */
  readonly archivedOverride = signal<{ id: string; isArchived: boolean } | null>(null);
  readonly isArchived = computed(() => {
    const patient = this.patient();
    const override = this.archivedOverride();
    if (override && patient?.id === override.id) {
      return override.isArchived;
    }
    return patient?.isArchived === true;
  });
  readonly isSaving = signal(false);

  /**
   * The clinical lead's name, which the patient payload does not carry.
   *
   * `GET /api/patients/{id}` nests the profile, the address, the angel, the plan and the hub — but
   * `clinicalLead` arrives as a Professional without its own profile, so it has a licence number and
   * a speciality and no name. The record fetches the one professional to fill that in. It is a
   * second request on a detail screen rather than a wider payload for every row of the list.
   */
  readonly clinicalLeadName = signal<string | null>(null);

  protected readonly patientService = inject(PatientService);
  private readonly professionalService = inject(ProfessionalService);

  constructor() {
    effect(() => {
      const leadId = this.patient()?.clinicalLead?.id;
      this.clinicalLeadName.set(null);
      if (!leadId) {
        return;
      }
      this.professionalService.find(leadId).subscribe({
        next: professional => {
          const profile = professional.profile;
          const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ');
          this.clinicalLeadName.set(name || null);
        },
        // The rest of the record is intact; the card falls back to the licence number.
        error: () => this.clinicalLeadName.set(null),
      });
    });
  }

  /** Initials for the monogram, from whatever name the profile actually has. */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly initials = computed(() => {
    const profile = this.patient()?.profile;
    const parts = [profile?.firstName, profile?.lastName].filter(Boolean) as string[];
    if (parts.length === 0) {
      return (this.patient()?.id ?? '?').slice(0, 2).toUpperCase();
    }
    return parts
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase();
  });

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly fullName = computed(() => {
    const profile = this.patient()?.profile;
    const name = [profile?.firstName, profile?.middleName, profile?.lastName].filter(Boolean).join(' ');
    return name || null;
  });

  /**
   * The date of birth as a dayjs, because the one on the payload is a string.
   *
   * `PatientService` converts `joinedOn` and `lastActiveOn` and stops there — the nested profile,
   * angel, plan and hub are passed through as the server sent them. `IProfile.dateOfBirth` is
   * nevertheless typed `dayjs.Dayjs`, so the compiler is satisfied and `| formatMediumDate` throws
   * `day.format is not a function` at runtime. Any screen rendering a nested date hits this.
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly dateOfBirth = computed(() => {
    const raw = this.patient()?.profile?.dateOfBirth;
    if (!raw) {
      return null;
    }
    const parsed = dayjs(raw);
    return parsed.isValid() ? parsed : null;
  });

  /**
   * Age in whole years, or null when there is no date of birth.
   *
   * Shown beside the date rather than instead of it: the demo shows both, and an age with no date
   * behind it cannot be checked against an ID document.
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly age = computed(() => {
    const dateOfBirth = this.dateOfBirth();
    if (!dateOfBirth) {
      return null;
    }
    const years = dayjs().diff(dateOfBirth, 'year');
    return Number.isFinite(years) && years >= 0 ? years : null;
  });

  previousState(): void {
    globalThis.history.back();
  }

  toggleArchived(): void {
    const current = this.patient();
    if (!current || this.isSaving()) {
      return;
    }
    const next = !this.isArchived();
    this.isSaving.set(true);
    this.patientService.setArchived(current, next).subscribe({
      next: () => {
        this.archivedOverride.set({ id: current.id, isArchived: next });
        this.isSaving.set(false);
      },
      // Leave the flag as it was. The error interceptor raises the alert;
      // flipping the label on a failed write would be a lie about the record.
      error: () => this.isSaving.set(false),
    });
  }
}
