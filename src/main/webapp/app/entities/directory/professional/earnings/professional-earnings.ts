import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';

import dayjs from 'dayjs/esm';
import { TranslatePipe } from '@ngx-translate/core';

import { AbfChartCard, AbfLineChart, LinePoint } from 'app/shared/viz';
import { TranslateDirective } from 'app/shared/language';

import { EarningsGranularity, IProfessionalEarnings } from './professional-earnings.model';
import { ProfessionalEarningsService } from './professional-earnings.service';

const GRANULARITIES: readonly EarningsGranularity[] = ['DAILY', 'WEEKLY', 'MONTHLY'];

/**
 * What this professional has worked and what it came to.
 *
 * A chart of value accrued over time, and the table beside it carrying both figures per period —
 * the house rule that every chart has a table view, which here is not decoration: the chart plots
 * money and the shift count only exists in the table.
 *
 * Two things the panel has to be careful to say rather than imply:
 *
 * The window ends where the api says it ended, not where it was asked to. A shift is payable only
 * once it is in the past, so today's rostered shift is not counted and the range is clipped at
 * yesterday. Echoing the requested range would label the chart with days it does not contain.
 *
 * Unpriced shifts are called out separately. A shift worked before its role had a rate is counted
 * but adds nothing, so a total of zero can mean "did not work" or "we never set a price", and only
 * this distinction tells them apart.
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

  protected readonly granularities = GRANULARITIES;
  protected readonly granularity = signal<EarningsGranularity>('MONTHLY');
  protected readonly earnings = signal<IProfessionalEarnings | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly failed = signal(false);

  /**
   * The line: value accrued per period.
   *
   * Labels are built here rather than in the template because the SVG renders them as `<text>`,
   * which no pipe can reach.
   */
  protected readonly points = computed<LinePoint[]>(() => {
    const earnings = this.earnings();
    if (!earnings) {
      return [];
    }
    return earnings.buckets.map(bucket => ({
      label: this.bucketLabel(bucket.periodStart),
      value: bucket.amount,
    }));
  });

  protected readonly rows = computed(() => {
    const earnings = this.earnings();
    if (!earnings) {
      return [];
    }
    // Newest first in the table: the chart reads left to right through time, but a table of periods
    // is scanned for the most recent one.
    return [...earnings.buckets].reverse();
  });

  /** True once anything was worked. An all-zero series is a real answer, and says so in words. */
  protected readonly hasEarnings = computed(() => (this.earnings()?.shiftsCompleted ?? 0) > 0);

  private readonly earningsService = inject(ProfessionalEarningsService);

  constructor() {
    effect(() => {
      const id = this.professionalId();
      const granularity = this.granularity();
      this.earnings.set(null);
      this.failed.set(false);
      if (!id) {
        return;
      }
      this.isLoading.set(true);
      this.earningsService.forProfessional(id, granularity).subscribe({
        next: earnings => {
          this.earnings.set(earnings);
          this.isLoading.set(false);
        },
        // Not silently blank: an earnings panel showing nothing looks exactly like a professional
        // who has earned nothing, which is the one reading it must never produce by accident.
        error: () => {
          this.failed.set(true);
          this.isLoading.set(false);
        },
      });
    });
  }

  protected setGranularity(granularity: EarningsGranularity): void {
    this.granularity.set(granularity);
  }

  protected granularityLabelKey(granularity: EarningsGranularity): string {
    return `professionalEarnings.granularity.${granularity.toLowerCase()}`;
  }

  /**
   * `12 Aug`, `w/c 10 Aug`, `Aug 26` — short enough to sit under a chart tick without colliding
   * with its neighbours, and unambiguous about which period it names.
   */
  protected bucketLabel(periodStart: dayjs.Dayjs): string {
    switch (this.granularity()) {
      case 'DAILY':
        return periodStart.format('D MMM');
      case 'WEEKLY':
        return periodStart.format('D MMM');
      case 'MONTHLY':
      default:
        return periodStart.format('MMM YY');
    }
  }
}
