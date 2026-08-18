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
import { IWageRate } from 'app/entities/operations/wage-rate/wage-rate.model';
import { WageRateService } from 'app/entities/operations/wage-rate/service/wage-rate.service';

/**
 * The screen's state is `protected` — right for the template, and out of reach from here. Rather
 * than casting to `any` at every call site, the surface the spec drives is named once.
 */
interface WageRatesUnderTest {
  rows(): { role: ProfessionalRole; current: IWageRate | null; history: readonly IWageRate[] }[];
  form: { value: { amount?: number | null; validFrom?: string | null }; patchValue(value: Record<string, unknown>): void };
  errorMessage(): string | null;
  savedRole(): ProfessionalRole | null;
  startReprice(role: ProfessionalRole): void;
  cancelReprice(): void;
  save(): void;
  toggleHistory(role: ProfessionalRole): void;
  isScheduled(rate: IWageRate): boolean;
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

  const doctorRate = {
    id: 'wage-doctor-2026-07',
    role: ProfessionalRole.DOCTOR,
    amount: 550,
    currency: 'GHS',
    validFrom: dayjs('2026-07-01'),
    note: 'July 2026 market review',
  };

  const nurseRate = {
    id: 'wage-nurse-2026-01',
    role: ProfessionalRole.NURSE,
    amount: 300,
    currency: 'GHS',
    validFrom: dayjs('2026-01-01'),
    note: 'Opening rate',
  };

  beforeEach(async () => {
    wageRateService = {
      current: vitest.fn().mockReturnValue(of([doctorRate, nurseRate])),
      history: vitest.fn().mockReturnValue(of([doctorRate])),
      create: vitest.fn().mockReturnValue(of(doctorRate)),
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

  it('lists every role, priced or not', () => {
    const component = build();

    const rows = component.rows();
    expect(rows.map(row => row.role)).toEqual([
      ProfessionalRole.CAREGIVER,
      ProfessionalRole.PARAMEDIC,
      ProfessionalRole.THERAPIST,
      ProfessionalRole.NURSE,
      ProfessionalRole.DOCTOR,
    ]);
  });

  /**
   * A role the api returned no rate for must stay null, not fall back to zero. The wage bill for
   * "priced at nothing" and "never priced" reads identically, and only this distinction lets the
   * screen say which it is.
   */
  it('leaves an unpriced role as null rather than zero', () => {
    const component = build();

    const caregiver = component.rows().find(row => row.role === ProfessionalRole.CAREGIVER);
    expect(caregiver?.current).toBeNull();

    const doctor = component.rows().find(row => row.role === ProfessionalRole.DOCTOR);
    expect(doctor?.current?.amount).toBe(550);
  });

  /**
   * <b>The behaviour the whole model rests on.</b> Saving must POST a new row — never PUT over the
   * one in force. An update would rewrite the rate that historical shifts are valued at, which is
   * exactly the retroactive restatement effective-dating exists to prevent.
   */
  it('records a price change as a new dated rate, never as an edit of the current one', () => {
    const component = build();

    component.startReprice(ProfessionalRole.DOCTOR);
    component.form.patchValue({ amount: 600, validFrom: '2026-10-01', note: 'October review' });
    component.save();

    expect(wageRateService.create).toHaveBeenCalledTimes(1);
    const sent = wageRateService.create.mock.calls[0][0];
    expect(sent.id).toBeNull();
    expect(sent.role).toBe(ProfessionalRole.DOCTOR);
    expect(sent.amount).toBe(600);
    expect(sent.validFrom.format('YYYY-MM-DD')).toBe('2026-10-01');
  });

  /**
   * The form opens dated tomorrow, not today. A rate dated today would reprice shifts already
   * worked this morning — a retroactive change made by accident, through the ordinary path.
   */
  it('defaults a new rate to take effect tomorrow', () => {
    const component = build();

    component.startReprice(ProfessionalRole.DOCTOR);

    expect(component.form.value.validFrom).toBe(dayjs().add(1, 'day').format('YYYY-MM-DD'));
  });

  it('prefills the amount from the rate in force so a small change is a small edit', () => {
    const component = build();

    component.startReprice(ProfessionalRole.DOCTOR);

    expect(component.form.value.amount).toBe(550);
  });

  /**
   * Currency is carried forward from the superseded rate rather than re-defaulted, so a reprice
   * cannot quietly redenominate a role. GHS only applies when nothing was priced before.
   */
  it('carries the currency forward from the rate it supersedes', () => {
    const component = build();

    component.startReprice(ProfessionalRole.DOCTOR);
    component.form.patchValue({ amount: 600, validFrom: '2026-10-01' });
    component.save();

    expect(wageRateService.create.mock.calls[0][0].currency).toBe('GHS');
  });

  it('defaults currency to GHS when the role has never been priced', () => {
    const component = build();

    component.startReprice(ProfessionalRole.CAREGIVER);
    component.form.patchValue({ amount: 200, validFrom: '2026-10-01' });
    component.save();

    expect(wageRateService.create.mock.calls[0][0].currency).toBe('GHS');
  });

  it('does not save an incomplete form', () => {
    const component = build();

    component.startReprice(ProfessionalRole.DOCTOR);
    component.form.patchValue({ amount: null, validFrom: null });
    component.save();

    expect(wageRateService.create).not.toHaveBeenCalled();
  });

  it('rejects a negative rate', () => {
    const component = build();

    component.startReprice(ProfessionalRole.DOCTOR);
    component.form.patchValue({ amount: -1, validFrom: '2026-10-01' });
    component.save();

    expect(wageRateService.create).not.toHaveBeenCalled();
  });

  it('loads a role history only when it is expanded', () => {
    const component = build();

    expect(wageRateService.history).not.toHaveBeenCalled();

    component.toggleHistory(ProfessionalRole.DOCTOR);
    expect(wageRateService.history).toHaveBeenCalledWith(ProfessionalRole.DOCTOR);

    // Collapsing and reopening must not refetch what is already held.
    component.toggleHistory(ProfessionalRole.DOCTOR);
    component.toggleHistory(ProfessionalRole.DOCTOR);
    expect(wageRateService.history).toHaveBeenCalledTimes(1);
  });

  /** A future-dated rate is recorded but is not what anyone is paid, and must not read as current. */
  it('marks a rate that has not taken effect as scheduled', () => {
    const component = build();

    expect(component.isScheduled({ ...doctorRate, validFrom: dayjs().add(7, 'day') })).toBe(true);
    expect(component.isScheduled({ ...doctorRate, validFrom: dayjs().subtract(1, 'day') })).toBe(false);
    expect(component.isScheduled({ ...doctorRate, validFrom: dayjs() })).toBe(false);
  });

  it('surfaces a save failure instead of reporting success', () => {
    const component = build();
    wageRateService.create.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { fieldErrors: [{ field: 'amount', message: 'must not be null' }] } })),
    );

    component.startReprice(ProfessionalRole.DOCTOR);
    component.form.patchValue({ amount: 600, validFrom: '2026-10-01' });
    component.save();

    expect(component.errorMessage()).toContain('amount');
    expect(component.savedRole()).toBeNull();
  });
});
