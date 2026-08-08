import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';

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
  imports: [FontAwesomeModule, Alert, AlertError, TranslateDirective, TranslatePipe, RouterLink, FormatMediumDatePipe],
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

  protected readonly patientService = inject(PatientService);

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
