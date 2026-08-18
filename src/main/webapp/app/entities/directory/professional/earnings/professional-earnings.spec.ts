import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import dayjs from 'dayjs/esm';

import { ProfessionalRole } from 'app/entities/enumerations/professional-role.model';

import { ProfessionalEarnings } from './professional-earnings';
import { EarningsGranularity, IEarningsBucket, IProfessionalEarnings } from './professional-earnings.model';

/**
 * The panel's state is `protected` — right for the template, out of reach from here. The surface
 * the spec drives is named once rather than cast to `any` at every call site.
 */
interface EarningsUnderTest {
  points(): { label: string; value: number }[];
  rows(): IEarningsBucket[];
  earnings(): IProfessionalEarnings | null;
  failed(): boolean;
  setGranularity(granularity: EarningsGranularity): void;
  bucketLabel(periodStart: dayjs.Dayjs): string;
}

const driverFor = (fixture: ComponentFixture<ProfessionalEarnings>): EarningsUnderTest =>
  fixture.componentInstance as unknown as EarningsUnderTest;
import { ProfessionalEarningsService } from './professional-earnings.service';

/**
 * The earnings panel on a professional's page.
 *
 * Most of what matters here is about not overstating: a failed request, an unpriced shift and a
 * genuinely idle month all produce a small number or none at all, and the panel has to keep them
 * distinguishable.
 */
describe('ProfessionalEarnings', () => {
  let earningsService: { forProfessional: any };

  const anEarnings = (overrides: Partial<IProfessionalEarnings> = {}): IProfessionalEarnings => ({
    professionalId: 'p1',
    professionalName: 'Ama Boateng',
    role: ProfessionalRole.DOCTOR,
    granularity: 'MONTHLY',
    from: dayjs('2026-05-01'),
    to: dayjs('2026-08-17'),
    shiftsCompleted: 70,
    totalAccrued: 36700,
    unpricedShifts: 0,
    currency: 'GHS',
    buckets: [
      { periodStart: dayjs('2026-06-01'), periodEnd: dayjs('2026-06-30'), shifts: 20, amount: 10000 },
      { periodStart: dayjs('2026-07-01'), periodEnd: dayjs('2026-07-31'), shifts: 22, amount: 12100 },
      { periodStart: dayjs('2026-08-01'), periodEnd: dayjs('2026-08-17'), shifts: 10, amount: 5500 },
    ],
    ...overrides,
  });

  beforeEach(async () => {
    earningsService = { forProfessional: vitest.fn().mockReturnValue(of(anEarnings())) };

    await TestBed.configureTestingModule({
      imports: [ProfessionalEarnings],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslateService(),
        { provide: ProfessionalEarningsService, useValue: earningsService },
      ],
    }).compileComponents();
  });

  function build(professionalId: string | null = 'p1'): ComponentFixture<ProfessionalEarnings> {
    const fixture = TestBed.createComponent(ProfessionalEarnings);
    fixture.componentRef.setInput('professionalId', professionalId);
    fixture.detectChanges();
    return fixture;
  }

  it('asks the api for the professional it was given', () => {
    build('p9');

    expect(earningsService.forProfessional).toHaveBeenCalledWith('p9', 'MONTHLY');
  });

  it('does not call the api without a professional', () => {
    build(null);

    expect(earningsService.forProfessional).not.toHaveBeenCalled();
  });

  it('refetches when the granularity changes', () => {
    const fixture = build();
    const component = driverFor(fixture);

    component.setGranularity('WEEKLY');
    fixture.detectChanges();

    expect(earningsService.forProfessional).toHaveBeenLastCalledWith('p1', 'WEEKLY');
  });

  it('plots value accrued, one point per bucket, in chronological order', () => {
    const fixture = build();
    const component = driverFor(fixture);

    expect(component.points().map(point => point.value)).toEqual([10000, 12100, 5500]);
  });

  /** The chart reads left to right through time; a table of periods is scanned newest first. */
  it('lists the table newest first', () => {
    const fixture = build();
    const component = driverFor(fixture);

    expect(component.rows().map(row => row.periodStart.format('YYYY-MM'))).toEqual(['2026-08', '2026-07', '2026-06']);
  });

  /**
   * A failed request must not render as an empty panel. Zero shifts and "we could not find out" are
   * different answers, and the second one silently rendering as the first is exactly how a
   * remuneration screen misleads.
   */
  it('reports a failure rather than showing nothing', () => {
    earningsService.forProfessional.mockReturnValue(throwError(() => new Error('boom')));

    const fixture = build();
    const component = driverFor(fixture);

    expect(component.failed()).toBe(true);
    expect(component.earnings()).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-cy="earningsError"]')).not.toBeNull();
  });

  it('renders the totals the api reported', () => {
    const fixture = build();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[data-cy="earningsShiftCount"]')?.textContent).toContain('70');
    expect(element.querySelector('[data-cy="earningsTotal"]')?.textContent).toContain('36700');
  });

  /**
   * Shifts worked before a rate existed are inside the shift count and outside the total, so the
   * two figures disagree. Unexplained, that reads as a bug in the arithmetic.
   */
  it('calls out unpriced shifts, and only when there are some', () => {
    const fixture = build();
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-cy="earningsUnpriced"]')).toBeNull();

    earningsService.forProfessional.mockReturnValue(of(anEarnings({ unpricedShifts: 4 })));
    const withUnpriced = build();
    expect((withUnpriced.nativeElement as HTMLElement).querySelector('[data-cy="earningsUnpriced"]')).not.toBeNull();
  });

  /**
   * The panel reports the window the api actually counted, and does not compute one of its own.
   *
   * A shift is payable only once it is in the past, so the api clips the range at yesterday — a
   * client that sent its own `to`, or relabelled the result with today, would claim days the
   * figures do not include. Asserted on the request and the held value rather than on the rendered
   * string, because the range is rendered through a translated template whose interpolation the
   * TestBed's stub translate service does not perform.
   */
  it('reports the window the api counted rather than one of its own', () => {
    earningsService.forProfessional.mockReturnValue(of(anEarnings({ to: dayjs('2026-08-17') })));

    const fixture = build();
    const component = driverFor(fixture);

    expect(earningsService.forProfessional).toHaveBeenCalledWith('p1', 'MONTHLY');
    expect(component.earnings()?.to.format('YYYY-MM-DD')).toBe('2026-08-17');
  });

  it('says so when nothing was worked instead of drawing an empty chart unexplained', () => {
    earningsService.forProfessional.mockReturnValue(
      of(anEarnings({ shiftsCompleted: 0, totalAccrued: 0, buckets: [], unpricedShifts: 0 })),
    );

    const fixture = build();

    expect((fixture.nativeElement as HTMLElement).querySelector('[data-cy="earningsNone"]')).not.toBeNull();
  });

  it('labels buckets by the granularity in view', () => {
    const fixture = build();
    const component = driverFor(fixture);

    expect(component.bucketLabel(dayjs('2026-08-01'))).toBe('Aug 26');

    component.setGranularity('DAILY');
    fixture.detectChanges();
    expect(component.bucketLabel(dayjs('2026-08-12'))).toBe('12 Aug');
  });
});
