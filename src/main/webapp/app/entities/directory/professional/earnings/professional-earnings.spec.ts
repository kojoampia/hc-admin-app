import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import dayjs from 'dayjs/esm';

import { ProfessionalRole } from 'app/entities/enumerations/professional-role.model';

import { EarningsUnit, ProfessionalEarnings } from './professional-earnings';
import { IEarningsBucket, IProfessionalEarnings } from './professional-earnings.model';
import { ProfessionalEarningsService } from './professional-earnings.service';

/**
 * The panel's state is `protected` — right for the template, out of reach from here. The surface
 * the spec drives is named once rather than cast to `any` at every call site.
 */
interface EarningsUnderTest {
  points(): { label: string; value: number }[];
  rows(): IEarningsBucket[];
  earnings(): IProfessionalEarnings | null;
  failed(): boolean;
  hasWindow(): boolean;
  canGoForward(): boolean;
  offset(): number;
  unit(): EarningsUnit;
  window(): { from: dayjs.Dayjs; to: dayjs.Dayjs };
  periodLabelKey(): string;
  setUnit(unit: EarningsUnit): void;
  goBack(): void;
  goForward(): void;
}

const driverFor = (fixture: ComponentFixture<ProfessionalEarnings>): EarningsUnderTest =>
  fixture.componentInstance as unknown as EarningsUnderTest;

/**
 * The earnings panel on a professional's page.
 *
 * Two groups of behaviour matter here. Paging has to name and bound periods the way a wage bill is
 * actually read — this week runs to date, and there is no next period while it is still running.
 * And the panel must not overstate: a failed request, an unpriced shift and a genuinely idle week
 * all produce a small number or none at all, and it has to keep them distinguishable.
 */
describe('ProfessionalEarnings', () => {
  let earningsService: { forProfessional: any };

  const anEarnings = (overrides: Partial<IProfessionalEarnings> = {}): IProfessionalEarnings => ({
    professionalId: 'p1',
    professionalName: 'Ama Boateng',
    role: ProfessionalRole.DOCTOR,
    granularity: 'DAILY',
    from: dayjs('2026-08-17'),
    to: dayjs('2026-08-19'),
    shiftsCompleted: 3,
    totalAccrued: 1650,
    unpricedShifts: 0,
    currency: 'GHS',
    archived: false,
    buckets: [
      { periodStart: dayjs('2026-08-17'), periodEnd: dayjs('2026-08-17'), shifts: 1, amount: 550 },
      { periodStart: dayjs('2026-08-18'), periodEnd: dayjs('2026-08-18'), shifts: 1, amount: 550 },
      { periodStart: dayjs('2026-08-19'), periodEnd: dayjs('2026-08-19'), shifts: 1, amount: 550 },
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

  /** The last window the service was asked for, as ISO dates. */
  function lastWindow(): { from: string; to: string; granularity: string } {
    const call = earningsService.forProfessional.mock.calls.at(-1);
    return { granularity: call[1], from: call[2].format('YYYY-MM-DD'), to: call[3].format('YYYY-MM-DD') };
  }

  it('opens on the week in progress', () => {
    const component = driverFor(build());

    expect(component.unit()).toBe('WEEK');
    expect(component.offset()).toBe(0);
    expect(component.periodLabelKey()).toBe('professionalEarnings.period.this.week');
  });

  /**
   * Monday-first, and not by accident. `dayjs().startOf('week')` is Sunday by default, while the
   * roster is Monday-first everywhere — dayIndex 0 is Monday and the api snaps its weekly buckets
   * with previousOrSame(MONDAY). A Sunday-start week here would report seven different days than
   * the duty roster shows under the same label.
   */
  it('starts a week on Monday', () => {
    const component = driverFor(build());

    const from = component.window().from;
    expect(from.day()).toBe(1);
    expect(component.window().to.diff(from, 'day')).toBe(6);
  });

  it('starts a month on the first', () => {
    const fixture = build();
    const component = driverFor(fixture);

    component.setUnit('MONTH');
    fixture.detectChanges();

    expect(component.window().from.date()).toBe(1);
    expect(component.window().to.isSame(component.window().from.endOf('month'), 'day')).toBe(true);
  });

  it('pages back a week at a time', () => {
    const fixture = build();
    const component = driverFor(fixture);
    const thisMonday = component.window().from;

    component.goBack();
    fixture.detectChanges();

    expect(component.offset()).toBe(-1);
    expect(component.window().from.isSame(thisMonday.subtract(7, 'day'), 'day')).toBe(true);
    expect(component.periodLabelKey()).toBe('professionalEarnings.period.last.week');

    component.goBack();
    fixture.detectChanges();
    expect(component.window().from.isSame(thisMonday.subtract(14, 'day'), 'day')).toBe(true);
    // Two periods back has no colloquial name, so it is dated.
    expect(component.periodLabelKey()).toBe('professionalEarnings.period.named.week');
  });

  it('pages back a month at a time', () => {
    const fixture = build();
    const component = driverFor(fixture);
    component.setUnit('MONTH');
    fixture.detectChanges();
    const thisMonth = component.window().from;

    component.goBack();
    fixture.detectChanges();

    expect(component.window().from.isSame(thisMonth.subtract(1, 'month'), 'day')).toBe(true);
    expect(component.periodLabelKey()).toBe('professionalEarnings.period.last.month');
  });

  /** There is no next period while the current one is still running. */
  it('will not page forward past the period in progress', () => {
    const fixture = build();
    const component = driverFor(fixture);

    expect(component.canGoForward()).toBe(false);
    component.goForward();
    expect(component.offset()).toBe(0);

    component.goBack();
    fixture.detectChanges();
    expect(component.canGoForward()).toBe(true);

    component.goForward();
    fixture.detectChanges();
    expect(component.offset()).toBe(0);
    expect(component.canGoForward()).toBe(false);
  });

  /** "Three weeks ago" has no monthly meaning, so changing unit returns to the period in progress. */
  it('returns to the current period when the unit changes', () => {
    const fixture = build();
    const component = driverFor(fixture);

    component.goBack();
    component.goBack();
    fixture.detectChanges();
    expect(component.offset()).toBe(-2);

    component.setUnit('MONTH');
    fixture.detectChanges();
    expect(component.offset()).toBe(0);
  });

  /**
   * Daily buckets in both units, and the month must start exactly on the 1st. Weekly buckets would
   * read better in a month, but the api snaps them to Monday — a month beginning mid-week would
   * pull the tail of the previous month into its first bucket and the total would be wrong.
   */
  it('asks for daily buckets over the exact period', () => {
    const fixture = build();
    const component = driverFor(fixture);

    component.setUnit('MONTH');
    fixture.detectChanges();

    const asked = lastWindow();
    expect(asked.granularity).toBe('DAILY');
    expect(asked.from.slice(-2)).toBe('01');
  });

  it('refetches when the period changes', () => {
    const fixture = build();
    const component = driverFor(fixture);
    const before = earningsService.forProfessional.mock.calls.length;

    component.goBack();
    fixture.detectChanges();

    expect(earningsService.forProfessional.mock.calls.length).toBeGreaterThan(before);
  });

  it('plots value accrued, one point per day, in chronological order', () => {
    const component = driverFor(build());

    expect(component.points().map(point => point.value)).toEqual([550, 550, 550]);
  });

  it('lists the table newest first', () => {
    const component = driverFor(build());

    expect(component.rows().map(row => row.periodStart.format('YYYY-MM-DD'))).toEqual(['2026-08-19', '2026-08-18', '2026-08-17']);
  });

  /**
   * On the first day of a period the api clips the end to yesterday, which lands before the start.
   * That is not a range to caption — it is a period that has not begun producing figures.
   */
  it('says a period has not started rather than captioning an inverted range', () => {
    earningsService.forProfessional.mockReturnValue(
      of(anEarnings({ from: dayjs('2026-08-17'), to: dayjs('2026-08-16'), shiftsCompleted: 0, totalAccrued: 0, buckets: [] })),
    );

    const fixture = build();
    const component = driverFor(fixture);

    expect(component.hasWindow()).toBe(false);
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[data-cy="earningsNotStarted"]')).not.toBeNull();
    expect(element.querySelector('[data-cy="earningsRange"]')).toBeNull();
  });

  /**
   * The panel reports the window the api counted, never one of its own. The current period is asked
   * for to its calendar end, and the api clips it at yesterday — relabelling with the request would
   * claim days the figures do not include.
   */
  it('reports the window the api counted rather than the one requested', () => {
    earningsService.forProfessional.mockReturnValue(of(anEarnings({ to: dayjs('2026-08-19') })));

    const component = driverFor(build());

    expect(component.earnings()?.to.format('YYYY-MM-DD')).toBe('2026-08-19');
    // The request runs to the calendar end of the week, which is later than what came back.
    expect(lastWindow().to >= component.window().to.format('YYYY-MM-DD')).toBe(true);
  });

  it('does not call the api without a professional', () => {
    build(null);

    expect(earningsService.forProfessional).not.toHaveBeenCalled();
  });

  /**
   * A failed request must not render as an empty panel. Zero shifts and "we could not find out" are
   * different answers, and the second silently rendering as the first is how a remuneration screen
   * misleads.
   */
  it('reports a failure rather than showing nothing', () => {
    earningsService.forProfessional.mockReturnValue(throwError(() => new Error('boom')));

    const fixture = build();
    const component = driverFor(fixture);

    expect(component.failed()).toBe(true);
    expect(component.earnings()).toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-cy="earningsError"]')).not.toBeNull();
  });

  it('renders the totals the api reported', () => {
    const element = build().nativeElement as HTMLElement;

    expect(element.querySelector('[data-cy="earningsShiftCount"]')?.textContent).toContain('3');
    expect(element.querySelector('[data-cy="earningsTotal"]')?.textContent).toContain('1650');
  });

  /**
   * Shifts worked before a rate existed are inside the shift count and outside the total, so the
   * two figures disagree. Unexplained, that reads as broken arithmetic.
   */
  it('calls out unpriced shifts, and only when there are some', () => {
    expect((build().nativeElement as HTMLElement).querySelector('[data-cy="earningsUnpriced"]')).toBeNull();

    earningsService.forProfessional.mockReturnValue(of(anEarnings({ unpricedShifts: 2 })));
    expect((build().nativeElement as HTMLElement).querySelector('[data-cy="earningsUnpriced"]')).not.toBeNull();
  });

  it('says so when nothing was worked in a period that has run', () => {
    earningsService.forProfessional.mockReturnValue(of(anEarnings({ shiftsCompleted: 0, totalAccrued: 0, buckets: [] })));

    expect((build().nativeElement as HTMLElement).querySelector('[data-cy="earningsNone"]')).not.toBeNull();
  });
});
