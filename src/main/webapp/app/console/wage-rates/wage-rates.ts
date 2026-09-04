import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import dayjs from 'dayjs/esm';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';

import { ProfessionalRole } from 'app/entities/enumerations/professional-role.model';
import { ShiftType } from 'app/entities/enumerations/shift-type.model';
import { IWageRate, NewWageRate } from 'app/entities/operations/wage-rate/wage-rate.model';
import { WageRateService } from 'app/entities/operations/wage-rate/service/wage-rate.service';
import HasAnyAuthorityDirective from 'app/shared/auth/has-any-authority.directive';
import { ConsoleAuthority } from 'app/shared/auth/console-role';
import { FormatMediumDatePipe, FormatMediumDatetimePipe } from 'app/shared/date';
import { TranslateDirective } from 'app/shared/language';

/** Every role, in the order the bands run — cheapest first, which is how the table reads. */
const ROLE_ORDER: readonly ProfessionalRole[] = [
  ProfessionalRole.CAREGIVER,
  ProfessionalRole.PARAMEDIC,
  ProfessionalRole.THERAPIST,
  ProfessionalRole.NURSE,
  ProfessionalRole.DOCTOR,
];

/**
 * The shift types priced, in the enum's declared order.
 *
 * <p>All five, including `OFF`. It is never paid — the api drops an off day before resolving any
 * rate — and it is offered here because the pricing grid is asked for once and in full, and a column
 * quietly missing from the screen is a question nobody gets asked. The screen says so where the cell
 * is, rather than leaving somebody to wonder whether the rate they set is being applied.
 *
 * <p>Not `SHIFT_CYCLE`'s order: that one puts `FLEXIBLE` before `OFF` because cycling past `OFF`
 * clears a roster cell, which is a rule this screen does not have.
 */
const SHIFT_ORDER: readonly ShiftType[] = [ShiftType.DAY, ShiftType.EVENING, ShiftType.NIGHT, ShiftType.OFF, ShiftType.FLEXIBLE];

/** One cell of the pricing grid: a role, a shift type, and what that combination pays. */
interface RateRow {
  readonly role: ProfessionalRole;
  readonly shiftType: ShiftType;
  /** `role/shiftType` — the identity of a cell wherever one has to be named. */
  readonly key: string;
  /** The rate in force today, or null when this cell has never been priced. */
  readonly current: IWageRate | null;
  readonly history: readonly IWageRate[];
  /** True on the first row of a role's block, which is where the role is named. */
  readonly startsRole: boolean;
}

/** The identity of a grid cell. Built in one place so the map keys and the template agree. */
const cellKey = (role: ProfessionalRole, shiftType: ShiftType): string => `${role}/${shiftType}`;

/**
 * Professional wage remuneration: what one shift pays, per role and per shift type.
 *
 * **Changing a price adds a row; it does not edit one.** Each rate carries a `validFrom`, and a
 * shift is valued at whichever rate was in force on the day it was worked. That is the whole reason
 * the screen is shaped this way — the obvious design, one editable number per cell, silently
 * restates every historical total the moment a rate moves, so last month's wage bill reads
 * differently than it did last month and the money has usually already been paid.
 *
 * So the form is "set a new rate from a date", not "edit the rate", and the superseded rows stay
 * visible underneath as history. There is a separate correction path for a figure typed wrongly,
 * which does rewrite the record and says so.
 *
 * **The second dimension arrived on 2026-09-04**, when the estate settled on one five-value
 * `ShiftType` and `WageRate` gained a `shiftType`. A night is not paid what a day is, and the server
 * matches the combination exactly — no fallback from an unpriced cell to the role's other rates — so
 * every cell is its own price with its own history.
 *
 * **It stays a table rather than becoming a five-by-five matrix of numbers**, one row per cell with
 * the role named once per block. A matrix would fit on the screen and would have to drop three of
 * the four columns to do it: *in force since*, *last changed* and the per-cell history are the
 * effective-dating model made visible, and a screen that shows only today's number is the very
 * design the model exists to prevent. The grid is what is being *asked for*; the table is how it is
 * read back.
 */
@Component({
  selector: 'abf-wage-rates',
  templateUrl: './wage-rates.html',
  styleUrl: './wage-rates.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    FontAwesomeModule,
    TranslatePipe,
    TranslateDirective,
    HasAnyAuthorityDirective,
    FormatMediumDatePipe,
    FormatMediumDatetimePipe,
  ],
})
export default class WageRates implements OnInit {
  protected readonly ConsoleAuthority = ConsoleAuthority;
  protected readonly roleOrder = ROLE_ORDER;

  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly savedCell = signal<RateRow | null>(null);

  /** Which cell's history is expanded. Only one at a time — the table is the primary reading. */
  protected readonly expandedCell = signal<string | null>(null);
  /** Which cell is being repriced. Null means the form is closed. */
  protected readonly editingCell = signal<string | null>(null);

  protected readonly rows = computed<readonly RateRow[]>(() => {
    const current = this.current();
    const histories = this.histories();
    return ROLE_ORDER.flatMap(role =>
      SHIFT_ORDER.map((shiftType, index) => ({
        role,
        shiftType,
        key: cellKey(role, shiftType),
        current: current.find(rate => rate.role === role && rate.shiftType === shiftType) ?? null,
        history: histories[cellKey(role, shiftType)] ?? [],
        startsRole: index === 0,
      })),
    );
  });

  /** True once at least one cell is priced — the empty-state warning is wrong otherwise. */
  protected readonly anyPriced = computed(() => this.rows().some(row => row.current !== null));

  protected readonly form = new FormGroup({
    amount: new FormControl<number | null>(null, { validators: [Validators.required, Validators.min(0)] }),
    validFrom: new FormControl<string | null>(null, { validators: [Validators.required] }),
    note: new FormControl<string | null>(null, { validators: [Validators.maxLength(200)] }),
  });

  private readonly current = signal<readonly IWageRate[]>([]);
  /** Keyed by `cellKey`, so a role's day and night histories cannot overwrite one another. */
  private readonly histories = signal<Readonly<Record<string, readonly IWageRate[] | undefined>>>({});

  private readonly wageRateService = inject(WageRateService);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.wageRateService.current().subscribe({
      next: rates => {
        this.current.set(rates);
        this.isLoading.set(false);
      },
      error: (response: HttpErrorResponse) => {
        this.errorMessage.set(describeError(response));
        this.isLoading.set(false);
      },
    });
  }

  toggleHistory(row: RateRow): void {
    if (this.expandedCell() === row.key) {
      this.expandedCell.set(null);
      return;
    }
    this.expandedCell.set(row.key);
    // Fetched on expand rather than up front: twenty-five extra requests on load, to fill a panel
    // most visits never open. That was five before the shift dimension, which is the difference
    // between "wasteful" and "a page that visibly stalls" — so the laziness matters more than it did.
    if (this.histories()[row.key] === undefined) {
      this.wageRateService.history(row.role, row.shiftType).subscribe({
        next: rates => this.histories.update(all => ({ ...all, [row.key]: rates })),
        error: (response: HttpErrorResponse) => this.errorMessage.set(describeError(response)),
      });
    }
  }

  startReprice(row: RateRow): void {
    const current = row.current;
    this.editingCell.set(row.key);
    this.savedCell.set(null);
    this.errorMessage.set(null);
    this.form.reset({
      // Prefilled with today's figure so a small adjustment is a small edit, and with tomorrow's
      // date rather than today's: a rate dated today would reprice shifts already worked this
      // morning, which is the retroactive change the model exists to prevent.
      amount: current?.amount ?? null,
      validFrom: dayjs().add(1, 'day').format('YYYY-MM-DD'),
      note: null,
    });
  }

  cancelReprice(): void {
    this.editingCell.set(null);
    this.form.reset();
  }

  save(): void {
    const key = this.editingCell();
    const row = this.rows().find(candidate => candidate.key === key) ?? null;
    if (row === null || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const existing = row.current;

    const rate: NewWageRate = {
      id: null,
      role: row.role,
      shiftType: row.shiftType,
      amount: value.amount,
      // Carried forward from the rate it supersedes so a reprice never silently changes currency;
      // GHS only when the role is being priced for the first time.
      currency: existing?.currency ?? 'GHS',
      validFrom: value.validFrom ? dayjs(value.validFrom) : null,
      note: value.note,
    };

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.wageRateService.create(rate).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.editingCell.set(null);
        this.savedCell.set(row);
        // The new row may be future-dated, in which case `current` is unchanged and only the
        // history moves — so both are refetched rather than patched in locally.
        this.histories.update(all => ({ ...all, [row.key]: undefined }));
        if (this.expandedCell() === row.key) {
          this.wageRateService.history(row.role, row.shiftType).subscribe({
            next: rates => this.histories.update(all => ({ ...all, [row.key]: rates })),
          });
        }
        this.load();
      },
      error: (response: HttpErrorResponse) => {
        this.isSaving.set(false);
        this.errorMessage.set(describeError(response));
      },
    });
  }

  /** True while the given rate has not yet taken effect — shown as "scheduled", not as current. */
  protected isScheduled(rate: IWageRate): boolean {
    return rate.validFrom ? rate.validFrom.isAfter(dayjs(), 'day') : false;
  }

  protected roleLabelKey(role: ProfessionalRole): string {
    return `hcAdminApp.ProfessionalRole.${role}`;
  }

  protected shiftLabelKey(shiftType: ShiftType): string {
    return `hcAdminApp.ShiftType.${shiftType}`;
  }

  /**
   * True for the one cell that can be priced and is never paid.
   *
   * <p>The api drops an off day before resolving any rate, so a rate recorded here is inert. The
   * cell is offered anyway because the pricing grid is asked for once and in full — and the screen
   * says which cell that is, because "I set a rate and nothing changed" is otherwise a support call.
   */
  protected isNeverPaid(shiftType: ShiftType): boolean {
    return shiftType === ShiftType.OFF;
  }
}

/**
 * Turns a JHipster problem response into something worth showing. Field errors first, because they
 * name what to change; the bare `detail` is often "Unexpected runtime exception", so it is last.
 */
function describeError(response: HttpErrorResponse): string {
  const problem = response.error as { fieldErrors?: { field: string; message: string }[]; detail?: string } | null;
  const fieldErrors = problem?.fieldErrors;
  if (fieldErrors?.length) {
    return fieldErrors.map(error => `${error.field}: ${error.message}`).join('; ');
  }
  return problem?.detail ?? response.message;
}
