import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';

import dayjs from 'dayjs/esm';
import { forkJoin, map, of, switchMap } from 'rxjs';

import { StatusPill } from 'app/console/shared/status-pill/status-pill';
import { AccountService } from 'app/core/auth/account.service';
import { VerificationStatus } from 'app/entities/enumerations/verification-status.model';
import { ConsoleAuthority } from 'app/shared/auth/console-role';
import { IShiftAssignment } from 'app/entities/operations/shift-assignment/shift-assignment.model';
import { ShiftAssignmentService } from 'app/entities/operations/shift-assignment/service/shift-assignment.service';
import { RosterWeekService } from 'app/entities/operations/roster-week/service/roster-week.service';
import { Alert } from 'app/shared/alert/alert';
import { AlertError } from 'app/shared/alert/alert-error';
import { FormatMediumDatePipe, FormatMediumDatetimePipe } from 'app/shared/date';
import { TranslateDirective } from 'app/shared/language';
import { ProfessionalEarnings } from '../earnings/professional-earnings';
import { IProfessional } from '../professional.model';
import { IProfessionalVerification } from '../professional-verification.model';
import { ProfessionalService } from '../service/professional.service';
import { ProfessionalVerificationService } from '../service/professional-verification.service';

const DAYS_IN_WEEK = 7;

/**
 * One column of the "this week" strip: the day, and the shift worked on it.
 *
 * The date is carried rather than a translation key, because the duty roster labels its columns the
 * same way — `date.format('ddd DD')` off the week's start — and two screens showing the same week
 * must not disagree about what Wednesday is called.
 */
export interface WeekCell {
  readonly dayIndex: number;
  readonly date: dayjs.Dayjs | null;
  readonly shift: string | null;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-professional-detail',
  templateUrl: './professional-detail.html',
  styleUrl: './professional-detail.scss',
  imports: [
    FontAwesomeModule,
    Alert,
    AlertError,
    TranslateDirective,
    TranslatePipe,
    RouterLink,
    FormatMediumDatePipe,
    FormatMediumDatetimePipe,
    StatusPill,
    ProfessionalEarnings,
  ],
})
export class ProfessionalDetail {
  readonly professional = input<IProfessional | null>(null);

  /**
   * Applied locally so the button flips without a re-resolve, and keyed by id so it cannot leak.
   *
   * Nothing re-runs the route resolver after a PATCH, so the input signal keeps whatever it saw and
   * the button would otherwise still say "Archive" after archiving. Holding the id alongside the
   * value means that if the resolver ever swaps the record underneath us, a stale override is
   * ignored rather than claiming the new record's state.
   */
  readonly archivedOverride = signal<{ id: string; isArchived: boolean } | null>(null);
  /** Same reasoning, for the two fields the actions on this screen write. */
  readonly statusOverride = signal<{ id: string; status: string } | null>(null);
  readonly verificationOverride = signal<{ id: string; verification: string } | null>(null);
  readonly isSaving = signal(false);
  readonly week = signal<WeekCell[]>([]);
  /**
   * The verification history, newest first.
   *
   * Empty is a real state and renders as such: a professional mid-onboarding has never been
   * verified, and the panel says so rather than looking like a failed request.
   */
  readonly verifications = signal<IProfessionalVerification[]>([]);

  readonly dayIndexes = Array.from({ length: DAYS_IN_WEEK }, (_, index) => index);

  protected readonly professionalService = inject(ProfessionalService);
  private readonly shiftService = inject(ShiftAssignmentService);
  private readonly rosterWeekService = inject(RosterWeekService);
  private readonly verificationService = inject(ProfessionalVerificationService);
  private readonly accountService = inject(AccountService);

  constructor() {
    effect(() => {
      const id = this.professional()?.id;
      this.week.set([]);
      this.verifications.set([]);
      if (!id) {
        return;
      }
      this.loadWeek(id);
      this.loadVerifications(id);
    });
  }

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly isArchived = computed(() => {
    const professional = this.professional();
    const override = this.archivedOverride();
    if (override && professional?.id === override.id) {
      return override.isArchived;
    }
    return professional?.isArchived === true;
  });

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly status = computed(() => {
    const professional = this.professional();
    const override = this.statusOverride();
    if (override && professional?.id === override.id) {
      return override.status;
    }
    return professional?.status ?? null;
  });

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly verification = computed(() => {
    const professional = this.professional();
    const override = this.verificationOverride();
    if (override && professional?.id === override.id) {
      return override.verification;
    }
    return professional?.verification ?? null;
  });

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly isSuspended = computed(() => this.status() === 'SUSPENDED');

  /** Writing is the administrator's, matching the read/write split on /api/**. */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly canWrite = computed(() => {
    this.accountService.account();
    return this.accountService.hasAnyAuthority(ConsoleAuthority.ADMIN);
  });

  /** `Dr. Ama Boateng` — the title is part of how a clinician is named. */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly fullName = computed(() => {
    const profile = this.professional()?.profile;
    const title = profile?.title ? `${this.titleCase(profile.title)}.` : null;
    const name = [title, profile?.firstName, profile?.lastName].filter(Boolean).join(' ');
    return name || null;
  });

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly initials = computed(() => {
    const profile = this.professional()?.profile;
    const parts = [profile?.firstName, profile?.lastName].filter(Boolean) as string[];
    if (parts.length === 0) {
      return (this.professional()?.id ?? '?').slice(0, 2).toUpperCase();
    }
    return parts
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase();
  });

  previousState(): void {
    globalThis.history.back();
  }

  toggleArchived(): void {
    const current = this.professional();
    if (!current || this.isSaving()) {
      return;
    }
    const next = !this.isArchived();
    this.isSaving.set(true);
    this.professionalService.setArchived(current, next).subscribe({
      next: () => {
        this.archivedOverride.set({ id: current.id, isArchived: next });
        this.isSaving.set(false);
      },
      error: () => this.isSaving.set(false),
    });
  }

  /**
   * Suspend or reinstate, as a status PATCH.
   *
   * No new endpoint was needed: `partialUpdate` already exists and `setArchived` is the same shape.
   * Suspending is not archiving — an archived professional leaves the directory, a suspended one
   * stays in it and cannot work — so they are separate actions writing separate fields.
   */
  toggleSuspended(): void {
    const current = this.professional();
    if (!current || this.isSaving()) {
      return;
    }
    const next = this.isSuspended() ? 'ACTIVE' : 'SUSPENDED';
    this.isSaving.set(true);
    this.professionalService.partialUpdate({ id: current.id, status: next }).subscribe({
      next: () => {
        this.statusOverride.set({ id: current.id, status: next });
        this.isSaving.set(false);
      },
      // Leave the pill as it was: relabelling on a failed write claims a state the server rejected.
      error: () => this.isSaving.set(false),
    });
  }

  /**
   * Flag the licence for re-verification.
   *
   * The prototype calls this "Re-run registry check", which this cannot be: there is no registry.
   * The service holds `verification` as a plain enum and has no outbound HTTP client of any kind —
   * no RestTemplate, no WebClient, nothing to call. What is real is moving the record back to
   * PENDING so whoever does verification sees it again, and that is what the label says.
   */
  /**
   * Sends this professional back for re-verification, by recording a PENDING decision.
   *
   * Was a `PATCH { verification: 'PENDING' }` until 2026-08-24. That path no longer exists: the field
   * is written only by the server, from a recorded decision, so the console asks for the decision and
   * the projection follows. The visible behaviour is the same and the record is not — the request
   * now leaves a row saying who sent it back and when.
   */
  requestReverification(): void {
    this.record('PENDING');
  }

  /** Marks this professional verified. */
  verify(): void {
    this.record('VERIFIED');
  }

  /** Withdraws a verification that was granted. Distinct from REJECTED, which was never granted. */
  revoke(): void {
    this.record('REVOKED');
  }

  /**
   * Records one decision and folds it into what is on screen.
   *
   * The new row is prepended rather than re-fetched: the response is the stored row, so a second
   * request would ask the server to repeat what it just said. The status override is set for the
   * same reason the archive and suspend actions set theirs — nothing re-runs the route resolver
   * after a write, so the badge above would otherwise still show the old state.
   */
  private record(status: keyof typeof VerificationStatus): void {
    const current = this.professional();
    if (!current || this.isSaving() || this.verification() === status) {
      return;
    }
    this.isSaving.set(true);
    this.verificationService.record({ professionalId: current.id, status }).subscribe({
      next: recorded => {
        this.verificationOverride.set({ id: current.id, verification: status });
        this.verifications.update(rows => [recorded, ...rows]);
        this.isSaving.set(false);
      },
      error: () => this.isSaving.set(false),
    });
  }

  /** A failed history read leaves the panel empty rather than breaking the record around it. */
  private loadVerifications(id: string): void {
    this.verificationService.history(id).subscribe({
      next: rows => this.verifications.set(rows),
      error: () => this.verifications.set([]),
    });
  }

  private titleCase(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }

  /**
   * This professional's shifts for the current roster week.
   *
   * Both filters are applied by the api. They were not always: `professionalId.equals` and
   * `weekId.equals` were undeclared parameters, which Spring drops without complaint, so this asked
   * for one professional's week and received the whole collection — then narrowed it here, one page
   * deep, and showed an empty week for anyone whose shifts fell outside that page.
   */
  private loadWeek(professionalId: string): void {
    this.rosterWeekService
      .query({ page: 0, size: 1, sort: ['startDate,desc'] })
      .pipe(
        map(response => response.body?.[0] ?? null),
        switchMap(week =>
          week
            ? forkJoin({
                week: of(week),
                assignments: this.shiftService
                  .query({
                    page: 0,
                    // A week holds seven days; the margin is for a day carrying more than one entry.
                    size: 20,
                    'professionalId.equals': professionalId,
                    'weekId.equals': week.id,
                    sort: ['dayIndex,asc'],
                  })
                  .pipe(map(response => response.body ?? [])),
              })
            : of(null),
        ),
      )
      .subscribe({
        next: result => {
          if (!result) {
            this.week.set([]);
            return;
          }
          const mine: IShiftAssignment[] = result.assignments;
          const start = result.week.startDate ? dayjs(result.week.startDate) : null;
          this.week.set(
            this.dayIndexes.map(dayIndex => ({
              dayIndex,
              date: start ? start.add(dayIndex, 'day') : null,
              shift: mine.find(assignment => assignment.dayIndex === dayIndex)?.shift ?? null,
            })),
          );
        },
        error: () => this.week.set([]),
      });
  }
}
