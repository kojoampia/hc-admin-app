import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faChevronDown, faChevronUp, faPen, faSave, faSync } from '@fortawesome/free-solid-svg-icons';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import dayjs from 'dayjs/esm';

import WageRates from './wage-rates';
import { ProfessionalRole } from 'app/entities/enumerations/professional-role.model';
import { ShiftType } from 'app/entities/enumerations/shift-type.model';
import { IWageRate } from 'app/entities/operations/wage-rate/wage-rate.model';
import { WageRateService } from 'app/entities/operations/wage-rate/service/wage-rate.service';

/**
 * The screen's state is `protected` — right for the template, and out of reach from here. Rather
 * than casting to `any` at every call site, the surface the spec drives is named once.
 */
interface RateRowUnderTest {
  role: ProfessionalRole;
  shiftType: ShiftType;
  key: string;
  current: IWageRate | null;
  history: readonly IWageRate[];
  startsRole: boolean;
}

interface WageRatesUnderTest {
  rows(): RateRowUnderTest[];
  form: { value: { amount?: number | null; validFrom?: string | null }; patchValue(value: Record<string, unknown>): void };
  errorMessage(): string | null;
  savedCell(): RateRowUnderTest | null;
  startReprice(row: RateRowUnderTest): void;
  cancelReprice(): void;
  save(): void;
  toggleHistory(row: RateRowUnderTest): void;
  isScheduled(rate: IWageRate): boolean;
  isNeverPaid(shiftType: ShiftType): boolean;
}

/**
 * The configuration screen for what a shift pays.
 *
 * The behaviours worth testing here are the ones that make effective-dating real rather than
 * decorative. A screen that posts a new dated row and one that overwrites the current row look
 * identical on load — the difference only shows up in what is sent, and getting it wrong silently
 * restates historical wage bills.
 */
describe('WageRates', () => {
  let wageRateService: { current: any; history: any; create: any };

  const doctorDayRate = {
    id: 'wage-doctor-day-2026-07',
    role: ProfessionalRole.DOCTOR,
    shiftType: ShiftType.DAY,
    amount: 550,
    currency: 'GHS',
    validFrom: dayjs('2026-07-01'),
    note: 'July 2026 market review',
  };

  /**
   * The same role, priced differently for another shift.
   *
   * <p>The fixture that makes the second dimension visible: with one rate per role, every assertion
   * below passes whether the screen keys a cell on the role alone or on the role and the shift.
   */
  const doctorNightRate = {
    id: 'wage-doctor-night-2026-01',
    role: ProfessionalRole.DOCTOR,
    shiftType: ShiftType.NIGHT,
    amount: 825,
    currency: 'GHS',
    validFrom: dayjs('2026-01-01'),
    note: 'Opening rate',
  };

  const nurseDayRate = {
    id: 'wage-nurse-day-2026-01',
    role: ProfessionalRole.NURSE,
    shiftType: ShiftType.DAY,
    amount: 300,
    currency: 'GHS',
    validFrom: dayjs('2026-01-01'),
    note: 'Opening rate',
  };

  const cell = (component: WageRatesUnderTest, role: ProfessionalRole, shiftType: ShiftType): RateRowUnderTest =>
    component.rows().find(row => row.role === role && row.shiftType === shiftType)!;

  beforeEach(async () => {
    wageRateService = {
      current: vitest.fn().mockReturnValue(of([doctorDayRate, doctorNightRate, nurseDayRate])),
      history: vitest.fn().mockReturnValue(of([doctorDayRate])),
      create: vitest.fn().mockReturnValue(of(doctorDayRate)),
    };

    await TestBed.configureTestingModule({
      imports: [WageRates],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideTranslateService(),
        { provide: WageRateService, useValue: wageRateService },
      ],
    }).compileComponents();
  });

  function build(): WageRatesUnderTest {
    // The icon library is empty in a TestBed, and a missing icon throws during change detection
    // rather than degrading — so every icon the template renders has to be registered here.
    TestBed.inject(FaIconLibrary).addIcons(faChevronDown, faChevronUp, faPen, faSave, faSync);

    const fixture = TestBed.createComponent(WageRates);
    fixture.detectChanges();
    // Cast once, here: the screen's state is `protected`, which is the right visibility for the
    // template and leaves the spec reaching past it.
    return fixture.componentInstance as unknown as WageRatesUnderTest;
  }

  it('lists every role by every shift type, priced or not', () => {
    const component = build();

    const rows = component.rows();
    expect(rows).toHaveLength(25);
    // Roles cheapest first, and within each role the shift types in the enum's declared order.
    expect(rows.slice(0, 5).map(row => row.shiftType)).toEqual([
      ShiftType.DAY,
      ShiftType.EVENING,
      ShiftType.NIGHT,
      ShiftType.OFF,
      ShiftType.FLEXIBLE,
    ]);
    expect(rows.filter(row => row.startsRole).map(row => row.role)).toEqual([
      ProfessionalRole.CAREGIVER,
      ProfessionalRole.PARAMEDIC,
      ProfessionalRole.THERAPIST,
      ProfessionalRole.NURSE,
      ProfessionalRole.DOCTOR,
    ]);
  });

  /**
   * <b>The assertion the shift dimension turns on.</b> A DOCTOR day and a DOCTOR night are separate
   * cells with separate prices; a screen still keying on the role alone puts the same number in
   * both, which reads perfectly and under- or over-reports every night worked.
   */
  it('prices each shift type of a role independently', () => {
    const component = build();

    expect(cell(component, ProfessionalRole.DOCTOR, ShiftType.DAY).current?.amount).toBe(550);
    expect(cell(component, ProfessionalRole.DOCTOR, ShiftType.NIGHT).current?.amount).toBe(825);
  });

  /**
   * A cell the api returned no rate for must stay null, not fall back to zero and not fall back to
   * the role's other shift types. "Priced at nothing", "never priced" and "priced for days only"
   * read identically on a wage bill, and only this distinction lets the screen say which it is —
   * the server has no fallback either, so an empty cell here is an empty cell there.
   */
  it("leaves an unpriced cell as null rather than zero or a sibling shift's rate", () => {
    const component = build();

    expect(cell(component, ProfessionalRole.CAREGIVER, ShiftType.DAY).current).toBeNull();
    // The role is priced, this shift type is not. The 550 next door must not leak into it.
    expect(cell(component, ProfessionalRole.DOCTOR, ShiftType.EVENING).current).toBeNull();
  });

  /**
   * <b>The behaviour the whole model rests on.</b> Saving must POST a new row — never PUT over the
   * one in force. An update would rewrite the rate that historical shifts are valued at, which is
   * exactly the retroactive restatement effective-dating exists to prevent.
   */
  it('records a price change as a new dated rate, never as an edit of the current one', () => {
    const component = build();

    component.startReprice(cell(component, ProfessionalRole.DOCTOR, ShiftType.DAY));
    component.form.patchValue({ amount: 600, validFrom: '2026-10-01', note: 'October review' });
    component.save();

    expect(wageRateService.create).toHaveBeenCalledTimes(1);
    const sent = wageRateService.create.mock.calls[0][0];
    expect(sent.id).toBeNull();
    expect(sent.role).toBe(ProfessionalRole.DOCTOR);
    expect(sent.amount).toBe(600);
    expect(sent.validFrom.format('YYYY-MM-DD')).toBe('2026-10-01');
  });

  /** The shift type has to reach the wire, or every reprice lands on whichever cell the server defaults to. */
  it('sends the shift type of the cell being repriced', () => {
    const component = build();

    component.startReprice(cell(component, ProfessionalRole.DOCTOR, ShiftType.NIGHT));
    component.form.patchValue({ amount: 900, validFrom: '2026-10-01' });
    component.save();

    expect(wageRateService.create.mock.calls[0][0].shiftType).toBe(ShiftType.NIGHT);
  });

  /**
   * The form opens dated tomorrow, not today. A rate dated today would reprice shifts already
   * worked this morning — a retroactive change made by accident, through the ordinary path.
   */
  it('defaults a new rate to take effect tomorrow', () => {
    const component = build();

    component.startReprice(cell(component, ProfessionalRole.DOCTOR, ShiftType.DAY));

    expect(component.form.value.validFrom).toBe(dayjs().add(1, 'day').format('YYYY-MM-DD'));
  });

  it('prefills the amount from the rate in force for that cell, not for the role', () => {
    const component = build();

    component.startReprice(cell(component, ProfessionalRole.DOCTOR, ShiftType.NIGHT));

    expect(component.form.value.amount).toBe(825);
  });

  /**
   * Currency is carried forward from the superseded rate rather than re-defaulted, so a reprice
   * cannot quietly redenominate a cell. GHS only applies when nothing was priced before.
   */
  it('carries the currency forward from the rate it supersedes', () => {
    const component = build();

    component.startReprice(cell(component, ProfessionalRole.DOCTOR, ShiftType.DAY));
    component.form.patchValue({ amount: 600, validFrom: '2026-10-01' });
    component.save();

    expect(wageRateService.create.mock.calls[0][0].currency).toBe('GHS');
  });

  it('defaults currency to GHS when the cell has never been priced', () => {
    const component = build();

    component.startReprice(cell(component, ProfessionalRole.CAREGIVER, ShiftType.DAY));
    component.form.patchValue({ amount: 200, validFrom: '2026-10-01' });
    component.save();

    expect(wageRateService.create.mock.calls[0][0].currency).toBe('GHS');
  });

  it('does not save an incomplete form', () => {
    const component = build();

    component.startReprice(cell(component, ProfessionalRole.DOCTOR, ShiftType.DAY));
    component.form.patchValue({ amount: null, validFrom: null });
    component.save();

    expect(wageRateService.create).not.toHaveBeenCalled();
  });

  it('rejects a negative rate', () => {
    const component = build();

    component.startReprice(cell(component, ProfessionalRole.DOCTOR, ShiftType.DAY));
    component.form.patchValue({ amount: -1, validFrom: '2026-10-01' });
    component.save();

    expect(wageRateService.create).not.toHaveBeenCalled();
  });

  it('loads a cell history only when it is expanded, narrowed to that shift type', () => {
    const component = build();

    expect(wageRateService.history).not.toHaveBeenCalled();

    const night = cell(component, ProfessionalRole.DOCTOR, ShiftType.NIGHT);
    component.toggleHistory(night);
    expect(wageRateService.history).toHaveBeenCalledWith(ProfessionalRole.DOCTOR, ShiftType.NIGHT);

    // Collapsing and reopening must not refetch what is already held.
    component.toggleHistory(night);
    component.toggleHistory(night);
    expect(wageRateService.history).toHaveBeenCalledTimes(1);
  });

  /**
   * The histories are cached per cell, not per role.
   *
   * <p>Keyed on the role alone, opening the night history after the day one would show the day's
   * rows under the night cell — the cache would report a hit and no request would be made, so the
   * screen would be confidently wrong and completely silent about it.
   */
  it('caches a history per cell, so one shift type does not answer for another', () => {
    const component = build();

    component.toggleHistory(cell(component, ProfessionalRole.DOCTOR, ShiftType.DAY));
    component.toggleHistory(cell(component, ProfessionalRole.DOCTOR, ShiftType.NIGHT));

    expect(wageRateService.history).toHaveBeenCalledTimes(2);
    expect(wageRateService.history).toHaveBeenNthCalledWith(1, ProfessionalRole.DOCTOR, ShiftType.DAY);
    expect(wageRateService.history).toHaveBeenNthCalledWith(2, ProfessionalRole.DOCTOR, ShiftType.NIGHT);
  });

  /**
   * `OFF` is offered on the grid and is never paid — the api drops a rest day before resolving any
   * rate. The screen has to say so where the cell is, or "I set a rate and nothing changed" becomes
   * a support call.
   */
  it('marks the off-day cell as recorded but never applied', () => {
    const component = build();

    expect(component.isNeverPaid(ShiftType.OFF)).toBe(true);
    expect(component.isNeverPaid(ShiftType.DAY)).toBe(false);
    expect(component.isNeverPaid(ShiftType.FLEXIBLE)).toBe(false);
  });

  /** A future-dated rate is recorded but is not what anyone is paid, and must not read as current. */
  it('marks a rate that has not taken effect as scheduled', () => {
    const component = build();

    expect(component.isScheduled({ ...doctorDayRate, validFrom: dayjs().add(7, 'day') })).toBe(true);
    expect(component.isScheduled({ ...doctorDayRate, validFrom: dayjs().subtract(1, 'day') })).toBe(false);
    expect(component.isScheduled({ ...doctorDayRate, validFrom: dayjs() })).toBe(false);
  });

  it('surfaces a save failure instead of reporting success', () => {
    const component = build();
    wageRateService.create.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { fieldErrors: [{ field: 'amount', message: 'must not be null' }] } })),
    );

    component.startReprice(cell(component, ProfessionalRole.DOCTOR, ShiftType.DAY));
    component.form.patchValue({ amount: 600, validFrom: '2026-10-01' });
    component.save();

    expect(component.errorMessage()).toContain('amount');
    expect(component.savedCell()).toBeNull();
  });
});
