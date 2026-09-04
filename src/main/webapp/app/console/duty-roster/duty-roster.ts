import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';
import dayjs from 'dayjs/esm';
import { forkJoin, map, of, switchMap } from 'rxjs';

import { GeographicSpaceRef, PlanReport, PlanRole, PlanShift, RosterPlanService } from './roster-plan.service';

import { IProfessional } from 'app/entities/directory/professional/professional.model';
import { ProfessionalService } from 'app/entities/directory/professional/service/professional.service';
import { IRosterWeek } from 'app/entities/operations/roster-week/roster-week.model';
import { RosterWeekService } from 'app/entities/operations/roster-week/service/roster-week.service';
import { IShiftAssignment, NewShiftAssignment } from 'app/entities/operations/shift-assignment/shift-assignment.model';
import { ShiftAssignmentService } from 'app/entities/operations/shift-assignment/service/shift-assignment.service';
import { TranslateDirective } from 'app/shared/language';
import HasAnyAuthorityDirective from 'app/shared/auth/has-any-authority.directive';
import { ConsoleAuthority } from 'app/shared/auth/console-role';
import { AccountService } from 'app/core/auth/account.service';

/**
 * unassigned -> DAY -> EVENING -> NIGHT -> FLEXIBLE -> OFF -> unassigned.
 *
 * <p><b>`FLEXIBLE` sits before `OFF`, not after it</b>, and the position is the whole of the thought.
 * The three cell states this grid has to keep distinct are *no row*, *rostered rest* and *worked*;
 * `FLEXIBLE` is a worked state, so it belongs with the other worked ones, and `OFF` has to stay the
 * last stop before the wrap because it is the wrap past `OFF` that **deletes** the assignment. Put
 * `FLEXIBLE` at the end and cycling past a rest day produces a shift instead of clearing the cell,
 * which is a different grid.
 *
 * <p>This is deliberately not the declared order of `ShiftType`, which is
 * `DAY, EVENING, NIGHT, OFF, FLEXIBLE` on both sides of the estate. That order is for display and
 * sorting; this one is an affordance, and it has a rule the enum does not.
 */
export const SHIFT_CYCLE: (ShiftKind | null)[] = [null, 'DAY', 'EVENING', 'NIGHT', 'FLEXIBLE', 'OFF'];

export type ShiftKind = 'DAY' | 'EVENING' | 'NIGHT' | 'OFF' | 'FLEXIBLE';

/** The next shift in the cycle. Exported so the spec can exercise it alone. */
export const nextShift = (current: ShiftKind | null): ShiftKind | null => {
  const index = SHIFT_CYCLE.indexOf(current ?? null);
  return SHIFT_CYCLE[(index + 1) % SHIFT_CYCLE.length];
};

/**
 * Where a visit is placed inside its shift, one hour per call.
 *
 * <p><b>Not a formatting nicety: hc-professional refuses both mistakes this avoids.</b> It resolves
 * every visit time against the shift's own window and rejects one outside it, and it rejects two
 * visits on the same round that overlap. So a fixed 09:00 would 400 for every evening and night
 * round, and a fixed hour for all of them would 400 for the second visit on any round — both
 * arriving back here as "the roster service refused the round", which reads as a server problem.
 *
 * <p>The starts are the estate's shift windows (DAY 07–15, EVENING 15–23, NIGHT 23–07, FLEXIBLE the
 * whole day), one hour in so a round has room to grow either way. Only the first few hours of a
 * shift are used; a round longer than that is planned here and its times edited on the professional
 * portal, which is where a clinician's real day is arranged.
 */
export function visitWindow(shift: PlanShift, index: number): { startTime: string; endTime: string } {
  const firstHour: Record<PlanShift, number> = { DAY: 8, EVENING: 16, NIGHT: 23, OFF: 8, FLEXIBLE: 10 };
  const start = (firstHour[shift] + index) % 24;
  const end = (start + 1) % 24;
  const hh = (hour: number): string => `${String(hour).padStart(2, '0')}:00`;
  return { startTime: hh(start), endTime: hh(end) };
}

export interface RosterCell {
  readonly dayIndex: number;
  readonly shift: ShiftKind | null;
  readonly assignmentId: string | null;
}

export interface RosterRow {
  readonly professional: IProfessional;
  readonly name: string;
  readonly cells: RosterCell[];
}

const DAYS_IN_WEEK = 7;

/**
 * The duty roster: professionals down, seven days across.
 *
 * A cell is a `ShiftAssignment` row. Cycling a cell creates one, updates one,
 * or — on the wrap back past OFF — deletes it, because unassigned is the
 * absence of an assignment rather than an assignment with a null shift. That
 * is what makes the unassigned-slot count a subtraction and keeps the grid
 * honest about what has actually been planned.
 */
@Component({
  selector: 'abf-duty-roster',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './duty-roster.html',
  styleUrl: './duty-roster.scss',
  imports: [RouterLink, FormsModule, FontAwesomeModule, TranslateDirective, TranslatePipe, HasAnyAuthorityDirective],
})
export default class DutyRoster implements OnInit {
  readonly adminOnly = [ConsoleAuthority.ADMIN];
  readonly dayIndexes = Array.from({ length: DAYS_IN_WEEK }, (_, index) => index);

  /** Plannable shifts. `OFF` is absent: hc-professional refuses visits on a rest day. */
  readonly planShifts: PlanShift[] = ['DAY', 'EVENING', 'NIGHT', 'FLEXIBLE'];
  readonly planRoles: PlanRole[] = ['DOCTOR', 'NURSE', 'PARAMEDIC', 'THERAPIST', 'CAREGIVER'];

  readonly week = signal<IRosterWeek | null>(null);
  readonly rows = signal<RosterRow[]>([]);
  readonly isSaving = signal(false);

  // --- the planning panel ---------------------------------------------------------------------
  readonly planOpen = signal(false);
  readonly planning = signal(false);
  readonly spaces = signal<GeographicSpaceRef[]>([]);
  readonly report = signal<PlanReport | null>(null);
  /**
   * The call itself failed — not a round within it.
   *
   * <p>Separate from {@link PlanReport.rosterServiceReachable}, which is the api telling us it
   * could not reach hc-professional. This one is "the api did not answer at all", and the two are
   * different outages a reader would go and look at different things about.
   */
  readonly planCallFailed = signal(false);

  planDayIndex = 0;
  planRole: PlanRole = 'NURSE';
  planShift: PlanShift = 'DAY';
  planSpaceId = '';
  planName = '';
  planCustomerIds = '';

  private readonly rosterWeekService = inject(RosterWeekService);
  private readonly shiftService = inject(ShiftAssignmentService);
  private readonly professionalService = inject(ProfessionalService);
  private readonly accountService = inject(AccountService);
  private readonly rosterPlanService = inject(RosterPlanService);

  /**
   * Cycling a cell writes a ShiftAssignment, so it is a mutating control and
   * must be gated like every other one. The toolbar buttons sit behind
   * *abfHasAnyAuthority; a grid of 49 buttons is cheaper to disable than to
   * wrap individually, and disabled communicates "read-only" better than a
   * cell that silently does nothing.
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly canEdit = computed(() => {
    this.accountService.account();
    return this.accountService.hasAnyAuthority(ConsoleAuthority.ADMIN);
  });

  /** Slots that could be planned: seven days for every rostered professional. */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly totalSlots = computed(() => this.rows().length * DAYS_IN_WEEK);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly filledSlots = computed(() => this.rows().reduce((sum, row) => sum + row.cells.filter(cell => cell.shift !== null).length, 0));

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly unassignedSlots = computed(() => this.totalSlots() - this.filledSlots());

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly coverPercent = computed(() => {
    const total = this.totalSlots();
    return total === 0 ? 0 : Math.round((this.filledSlots() / total) * 100);
  });

  /** Shifts actually worked — OFF is planned, but it is not a shift. */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly workedShifts = computed(() =>
    this.rows().reduce((sum, row) => sum + row.cells.filter(cell => cell.shift !== null && cell.shift !== 'OFF').length, 0),
  );

  /** Per-day head count. Under three is flagged. */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly onDutyPerDay = computed(() =>
    this.dayIndexes.map(
      dayIndex => this.rows().filter(row => row.cells[dayIndex].shift !== null && row.cells[dayIndex].shift !== 'OFF').length,
    ),
  );

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly dayLabels = computed(() => {
    const start = this.week()?.startDate;
    return this.dayIndexes.map(index => (start ? start.add(index, 'day') : dayjs().add(index, 'day')));
  });

  ngOnInit(): void {
    this.load();
  }

  /**
   * The week comes from the server, not from "the most recent one I can see".
   *
   * This asked for `size: 1, sort: startDate,desc` and took the head, while the dashboard hero
   * derived its own Monday-to-Sunday window — two rules for one question, on two screens one click
   * apart. They happened to agree on the seeded data and would have parted the moment a week was
   * drafted ahead, with no error on either side. `/api/roster-weeks/current` is now the only answer,
   * and it deliberately returns the latest week that has *started* rather than the latest that
   * exists.
   */
  load(): void {
    forkJoin({
      week: this.rosterWeekService.findCurrent(),
      professionals: this.professionalService.query({ page: 0, size: 100, sort: ['id,asc'] }).pipe(map(response => response.body ?? [])),
    })
      .pipe(
        switchMap(({ week, professionals }) => {
          this.week.set(week);
          if (!week) {
            return of({ professionals, assignments: [] as IShiftAssignment[] });
          }
          return this.shiftService
            .query({ page: 0, size: 500, 'weekId.equals': week.id, sort: ['dayIndex,asc'] })
            .pipe(map(response => ({ professionals, assignments: response.body ?? [] })));
        }),
      )
      .subscribe(({ professionals, assignments }) => this.buildRows(professionals, assignments));
  }

  cellFor(row: RosterRow, dayIndex: number): RosterCell {
    return row.cells[dayIndex];
  }

  /** Click a cell to advance it through the cycle. */
  cycle(row: RosterRow, dayIndex: number): void {
    if (!this.canEdit()) {
      return;
    }
    const cell = row.cells[dayIndex];
    const target = nextShift(cell.shift);
    this.isSaving.set(true);

    if (target === null && cell.assignmentId !== null) {
      this.shiftService.delete(cell.assignmentId).subscribe({
        next: () => this.applyCell(row, dayIndex, null, null),
        error: () => this.isSaving.set(false),
      });
      return;
    }

    if (cell.assignmentId !== null) {
      this.shiftService.partialUpdate({ id: cell.assignmentId, shift: target }).subscribe({
        next: updated => this.applyCell(row, dayIndex, target, updated.id),
        error: () => this.isSaving.set(false),
      });
      return;
    }

    const week = this.week();
    if (!week || target === null) {
      this.isSaving.set(false);
      return;
    }

    const created: NewShiftAssignment = {
      id: null,
      dayIndex,
      shiftDate: week.startDate?.add(dayIndex, 'day') ?? null,
      shift: target,
      week: { id: week.id, label: week.label },
      professional: { id: row.professional.id, licenceNumber: row.professional.licenceNumber },
    };

    this.shiftService.create(created).subscribe({
      next: saved => this.applyCell(row, dayIndex, target, saved.id),
      error: () => this.isSaving.set(false),
    });
  }

  /**
   * Fill every empty cell for an active professional, rotating day/evening/
   * night so one person does not take every night. Suspended, pending and
   * on-leave staff are skipped — auto-fill must not roster someone who
   * cannot work.
   */
  autoFill(): void {
    const week = this.week();
    if (!week) {
      return;
    }
    const order: ShiftKind[] = ['DAY', 'EVENING', 'NIGHT'];
    const creates: { row: RosterRow; dayIndex: number; shift: ShiftKind }[] = [];

    this.rows().forEach((row, rowIndex) => {
      if (row.professional.status !== 'ACTIVE') {
        return;
      }
      row.cells.forEach((cell, dayIndex) => {
        if (cell.shift === null) {
          creates.push({ row, dayIndex, shift: order[(dayIndex + rowIndex) % order.length] });
        }
      });
    });

    if (creates.length === 0) {
      return;
    }

    this.isSaving.set(true);
    forkJoin(
      creates.map(entry =>
        this.shiftService.create({
          id: null,
          dayIndex: entry.dayIndex,
          shiftDate: week.startDate?.add(entry.dayIndex, 'day') ?? null,
          shift: entry.shift,
          week: { id: week.id, label: week.label },
          professional: { id: entry.row.professional.id, licenceNumber: entry.row.professional.licenceNumber },
        }),
      ),
    ).subscribe({
      next: () => this.load(),
      error: () => this.isSaving.set(false),
      complete: () => this.isSaving.set(false),
    });
  }

  /** Drop every assignment for the week and reload it empty. */
  resetWeek(): void {
    const ids = this.rows().flatMap(row => row.cells.map(cell => cell.assignmentId).filter((id): id is string => id !== null));
    if (ids.length === 0) {
      return;
    }
    this.isSaving.set(true);
    forkJoin(ids.map(id => this.shiftService.delete(id))).subscribe({
      next: () => this.load(),
      error: () => this.isSaving.set(false),
      complete: () => this.isSaving.set(false),
    });
  }

  /**
   * Publishing stamps the week; it does not alter a single assignment.
   *
   * <p><b>It no longer sends `publishedAt`, as of 2026-09-04.</b> That field is server-derived from
   * `published` now (decision 8), joining `Message.readAt` and `Task.closedAt`, and the api
   * discards whatever arrives on the wire. Sending it was harmless only for as long as the server
   * believed it: a browser with a wrong clock dated the publication wrongly, and nothing anywhere
   * disagreed. Do not put it back — the api would ignore it, so the two would silently differ.
   */
  publish(): void {
    const week = this.week();
    if (!week) {
      return;
    }
    this.isSaving.set(true);
    this.rosterWeekService.partialUpdate({ id: week.id, published: true }).subscribe({
      next: updated => {
        this.week.set(updated);
        this.isSaving.set(false);
      },
      error: () => this.isSaving.set(false),
    });
  }

  // --- planning ---------------------------------------------------------------------------------

  /**
   * Open the panel, and load the areas a round can be planned in.
   *
   * <p>Loaded on open rather than with the grid: the grid is what every visitor to this screen came
   * for, and the space list is only wanted by the one person about to plan a round.
   */
  openPlanner(): void {
    this.planOpen.set(true);
    if (this.spaces().length === 0) {
      this.rosterPlanService.spaces().subscribe({
        next: spaces => this.spaces.set(spaces),
        // An empty list leaves the picker empty and the Plan button disabled, which is a visible
        // and honest state; it is not worth its own error banner beside the outage one.
        error: () => this.spaces.set([]),
      });
    }
  }

  closePlanner(): void {
    this.planOpen.set(false);
  }

  /** The date the panel is planning for: the chosen day of the week on screen. */
  planDate(): dayjs.Dayjs | null {
    const start = this.week()?.startDate;
    return start ? start.add(this.planDayIndex, 'day') : null;
  }

  canPlan(): boolean {
    return !this.planning() && this.planSpaceId !== '' && this.planName.trim() !== '' && this.planDate() !== null;
  }

  /**
   * Staff one round and file it with the roster of record.
   *
   * <p><b>Customer ids are typed in, and that is a known limitation rather than a design.</b> A
   * visit's `customerId` is a `patientservice` `Profile.patientId`, and this service holds no
   * mapping from its own `Patient` documents to that id — see backlog item 22. Offering a picker
   * over hc-admin's patients would send a plausible id that means nobody, which is worse than
   * asking. A round with no visits is valid: ward cover and on-call time are real shifts.
   */
  planRound(): void {
    const date = this.planDate();
    if (!date || !this.canPlan()) {
      return;
    }
    this.planning.set(true);
    this.report.set(null);
    this.planCallFailed.set(false);

    const visits = this.planCustomerIds
      .split(',')
      .map(id => id.trim())
      .filter(id => id !== '')
      .map((customerId, index) => ({ customerId, ...visitWindow(this.planShift, index) }));

    this.rosterPlanService
      .plan({
        date: date.format('YYYY-MM-DD'),
        rounds: [
          {
            role: this.planRole,
            shift: this.planShift,
            geographicSpaceId: this.planSpaceId,
            name: this.planName.trim(),
            visits,
          },
        ],
      })
      .subscribe({
        next: report => {
          this.report.set(report);
          this.planning.set(false);
        },
        error: () => {
          this.planCallFailed.set(true);
          this.planning.set(false);
        },
      });
  }

  private applyCell(row: RosterRow, dayIndex: number, shift: ShiftKind | null, assignmentId: string | null): void {
    this.rows.update(rows =>
      rows.map(candidate =>
        candidate.professional.id === row.professional.id
          ? {
              ...candidate,
              cells: candidate.cells.map((cell, index) => (index === dayIndex ? { dayIndex, shift, assignmentId } : cell)),
            }
          : candidate,
      ),
    );
    this.isSaving.set(false);
  }

  /**
   * Every rosterable professional gets a row — everyone except pending
   * applicants, which is seven of the nine on file and matches the
   * prototype's grid exactly.
   *
   * Membership deliberately does NOT come from "has an assignment this week".
   * An unassigned cell is the absence of a ShiftAssignment, so anyone with a
   * completely empty week would vanish from the grid — hiding precisely the
   * person whose gaps most need filling, and quietly shrinking the
   * unassigned-slot count that is supposed to surface them.
   */
  private buildRows(professionals: IProfessional[], assignments: IShiftAssignment[]): void {
    const rows = professionals
      .filter(professional => professional.status !== 'PENDING')
      .map(professional => {
        const cells: RosterCell[] = this.dayIndexes.map(dayIndex => {
          const match = assignments.find(assignment => assignment.professional?.id === professional.id && assignment.dayIndex === dayIndex);
          return {
            dayIndex,
            shift: (match?.shift as ShiftKind | undefined) ?? null,
            assignmentId: match?.id ?? null,
          };
        });
        return {
          professional,
          name: [professional.profile?.firstName, professional.profile?.lastName].filter(Boolean).join(' '),
          cells,
        };
      });

    this.rows.set(rows);
  }
}
