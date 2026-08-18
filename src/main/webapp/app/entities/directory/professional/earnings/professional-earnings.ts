import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';

import dayjs from 'dayjs/esm';
import { TranslatePipe } from '@ngx-translate/core';

import { AbfChartCard, AbfLineChart, LinePoint } from 'app/shared/viz';
import { TranslateDirective } from 'app/shared/language';

import { IProfessionalEarnings } from './professional-earnings.model';
import { ProfessionalEarningsService } from './professional-earnings.service';

/** The periods a wage bill is read in. Both page backwards one at a time. */
export type EarningsUnit = 'WEEK' | 'MONTH';

const UNITS: readonly EarningsUnit[] = ['WEEK', 'MONTH'];

/**
 * The Monday of the week containing `date`.
 *
 * Not `dayjs().startOf('week')`, which is locale-dependent and defaults to Sunday. The roster is
 * Monday-first everywhere — `ShiftAssignment.dayIndex` 0 is Monday and the api snaps its weekly
 * buckets with `previousOrSame(MONDAY)` — so a Sunday-start week here would report a different
 * seven days than the duty roster shows for the same label.
 */
function startOfWeek(date: dayjs.Dayjs): dayjs.Dayjs {
  return date.subtract((date.day() + 6) % 7, 'day').startOf('day');
}

/**
 * What this professional has worked and what it came to, one period at a time.
 *
 * Pick a unit and page back: this week, last week, the week before; this month, last month, and so
 * on. The current period runs to date — Monday to today, or the 1st to today — because a shift is
 * payable only once it is in the past, so today's rostered shift has not been earned yet.
 *
 * <b>Neither bound is computed here.</b> The window is sent to the api as `from`/`to` and the api
 * decides where it actually ended; the panel labels itself with what came back. That matters for
 * the current period, where the requested end is in the future and the real end is yesterday —
 * captioning the chart with the requested range would claim days the figures do not include.
 *
 * Buckets are daily in both units, which is also not a free choice. Weekly buckets inside a month
 * would be more readable, but the api snaps weekly buckets to Monday, so a month starting mid-week
 * would pull the tail of the previous month into its first bucket and the total would be wrong.
 * Daily buckets start exactly on the 1st. The chart thins its own labels.
 */
@Component({
  selector: 'abf-professional-earnings',
  templateUrl: './professional-earnings.html',
  styleUrl: './professional-earnings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AbfChartCard, AbfLineChart, TranslatePipe, TranslateDirective],
})
export class ProfessionalEarnings {
  readonly professionalId = input<string | null>(null);

  protected readonly units = UNITS;
  protected readonly unit = signal<EarningsUnit>('WEEK');
  /** 0 is the period in progress, -1 the one before it, and so on. Never positive. */
  protected readonly offset = signal(0);

  protected readonly earnings = signal<IProfessionalEarnings | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly failed = signal(false);

  /** The period asked for, before the api clips it to what has actually been worked. */
  protected readonly window = computed(() => {
    const today = dayjs().startOf('day');
    if (this.unit() === 'WEEK') {
      const from = startOfWeek(today.add(this.offset() * 7, 'day'));
      return { from, to: from.add(6, 'day') };
    }
    const from = today.add(this.offset(), 'month').startOf('month');
    return { from, to: from.endOf('month').startOf('day') };
  });

  /** "This week" / "Last week" / "Week of 3 Aug 2026", and the monthly equivalents. */
  protected readonly periodLabelKey = computed(() => {
    const unit = this.unit() === 'WEEK' ? 'week' : 'month';
    if (this.offset() === 0) {
      return `professionalEarnings.period.this.${unit}`;
    }
    if (this.offset() === -1) {
      return `professionalEarnings.period.last.${unit}`;
    }
    return `professionalEarnings.period.named.${unit}`;
  });

  /** The interpolation for the "named" case; harmless and unused for this/last. */
  protected readonly periodLabelArgs = computed(() => ({
    date: this.unit() === 'WEEK' ? this.window().from.format('D MMM YYYY') : this.window().from.format('MMMM YYYY'),
  }));

  /** There is no next period to page into while the current one is still running. */
  protected readonly canGoForward = computed(() => this.offset() < 0);

  /**
   * True once the reported window contains at least one day. On the first day of a period — Monday,
   * or the 1st — the api clips the end to yesterday, which lands before the start, and there is
   * genuinely nothing to show yet rather than a range to caption.
   */
  protected readonly hasWindow = computed(() => {
    const earnings = this.earnings();
    return earnings !== null && !earnings.to.isBefore(earnings.from);
  });

  /** The line: value accrued per day. Labels are built here because the SVG renders them as `<text>`. */
  protected readonly points = computed<LinePoint[]>(
    () => this.earnings()?.buckets.map(bucket => ({ label: bucket.periodStart.format('D MMM'), value: bucket.amount })) ?? [],
  );

  /** Newest first: the chart reads left to right through time, a table of days is scanned for the latest. */
  protected readonly rows = computed(() => [...(this.earnings()?.buckets ?? [])].reverse());

  /** An all-zero period is a real answer, and the panel says so in words rather than drawing a flat line. */
  protected readonly hasEarnings = computed(() => (this.earnings()?.shiftsCompleted ?? 0) > 0);

  private readonly earningsService = inject(ProfessionalEarningsService);

  constructor() {
    effect(() => {
      const id = this.professionalId();
      const { from, to } = this.window();
      this.earnings.set(null);
      this.failed.set(false);
      if (!id) {
        return;
      }
      this.isLoading.set(true);
      this.earningsService.forProfessional(id, 'DAILY', from, to).subscribe({
        next: earnings => {
          this.earnings.set(earnings);
          this.isLoading.set(false);
        },
        // Not silently blank: a panel showing nothing looks exactly like a professional who has
        // earned nothing, which is the one reading it must never produce by accident.
        error: () => {
          this.failed.set(true);
          this.isLoading.set(false);
        },
      });
    });
  }

  /** Switching unit returns to the period in progress; "three weeks ago" has no monthly meaning. */
  protected setUnit(unit: EarningsUnit): void {
    if (this.unit() !== unit) {
      this.unit.set(unit);
      this.offset.set(0);
    }
  }

  protected goBack(): void {
    this.offset.update(offset => offset - 1);
  }

  protected goForward(): void {
    if (this.canGoForward()) {
      this.offset.update(offset => offset + 1);
    }
  }

  protected unitLabelKey(unit: EarningsUnit): string {
    return `professionalEarnings.unit.${unit.toLowerCase()}`;
  }
}
