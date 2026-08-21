import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';
import dayjs from 'dayjs/esm';
import { forkJoin, map, of, switchMap } from 'rxjs';

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

/** unassigned -> DAY -> EVENING -> NIGHT -> OFF -> unassigned. */
export const SHIFT_CYCLE: (ShiftKind | null)[] = [null, 'DAY', 'EVENING', 'NIGHT', 'OFF'];

export type ShiftKind = 'DAY' | 'EVENING' | 'NIGHT' | 'OFF';

/** The next shift in the cycle. Exported so the spec can exercise it alone. */
export const nextShift = (current: ShiftKind | null): ShiftKind | null => {
  const index = SHIFT_CYCLE.indexOf(current ?? null);
  return SHIFT_CYCLE[(index + 1) % SHIFT_CYCLE.length];
};

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
  imports: [RouterLink, FontAwesomeModule, TranslateDirective, TranslatePipe, HasAnyAuthorityDirective],
})
export default class DutyRoster implements OnInit {
  readonly adminOnly = [ConsoleAuthority.ADMIN];
  readonly dayIndexes = Array.from({ length: DAYS_IN_WEEK }, (_, index) => index);

  readonly week = signal<IRosterWeek | null>(null);
  readonly rows = signal<RosterRow[]>([]);
  readonly isSaving = signal(false);

  private readonly rosterWeekService = inject(RosterWeekService);
  private readonly shiftService = inject(ShiftAssignmentService);
  private readonly professionalService = inject(ProfessionalService);
  private readonly accountService = inject(AccountService);

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

  /** Publishing stamps the week; it does not alter a single assignment. */
  publish(): void {
    const week = this.week();
    if (!week) {
      return;
    }
    this.isSaving.set(true);
    this.rosterWeekService.partialUpdate({ id: week.id, published: true, publishedAt: dayjs() }).subscribe({
      next: updated => {
        this.week.set(updated);
        this.isSaving.set(false);
      },
      error: () => this.isSaving.set(false),
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
