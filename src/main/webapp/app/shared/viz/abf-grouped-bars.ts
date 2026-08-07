import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { VIZ_SERIES, shortName } from './viz-palette';

export interface GroupedRow {
  readonly label: string;
  readonly values: readonly number[];
}

/**
 * Case load and visits per professional — two bars per group.
 *
 * Grouped rather than stacked because the two series are compared against
 * each other, not summed: a stack would answer "how much work in total",
 * which is not the question the workload-balance panel is asking.
 */
@Component({
  selector: 'abf-grouped-bars',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      class="viz-figure"
      [attr.viewBox]="'0 0 ' + W + ' ' + height()"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      [attr.aria-label]="ariaLabel()"
    >
      @for (tick of ticks(); track tick.value) {
        <line class="viz-grid" [attr.x1]="PL" [attr.y1]="tick.y" [attr.x2]="W - PR" [attr.y2]="tick.y" />
        <text class="viz-axis" [attr.x]="PL - 7" [attr.y]="tick.y + 3.5" text-anchor="end">{{ tick.value }}</text>
      }

      @for (group of groups(); track group.label) {
        @for (bar of group.bars; track bar.seriesIndex) {
          <rect [attr.x]="bar.x" [attr.y]="bar.y" [attr.width]="barWidth()" [attr.height]="bar.height" [attr.fill]="bar.colour" rx="2">
            <title>{{ group.label }} — {{ bar.value }}</title>
          </rect>
          @if (bar.value > 0) {
            <text class="viz-value" [attr.x]="bar.x + barWidth() / 2" [attr.y]="bar.y - 4" text-anchor="middle">{{ bar.value }}</text>
          }
        }
        <text class="viz-axis viz-axis--x" [attr.x]="group.centre" [attr.y]="height() - 8" text-anchor="middle">
          {{ group.shortLabel }}
        </text>
      }
    </svg>
  `,
  styleUrl: './abf-viz.scss',
})
export class AbfGroupedBars {
  readonly data = input.required<readonly GroupedRow[]>();
  readonly ariaLabel = input('');

  protected readonly W = 640;
  protected readonly PL = 34;
  protected readonly PR = 16;
  protected readonly PT = 22;
  protected readonly PB = 30;

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly height = computed(() => 240);

  private readonly max = computed(() => {
    const peak = Math.max(0, ...this.data().flatMap(row => [...row.values]));
    return Math.max(10, Math.ceil((peak * 1.15) / 10) * 10);
  });

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly ticks = computed(() => {
    const max = this.max();
    const step = max / 4;
    const values: { value: number; y: number }[] = [];
    for (let value = 0; value <= max; value += step) {
      values.push({ value: Math.round(value), y: this.y(value) });
    }
    return values;
  });

  private readonly groupWidth = computed(() => {
    const count = this.data().length || 1;
    return (this.W - this.PL - this.PR) / count;
  });

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly barWidth = computed(() => {
    const series = this.data()[0]?.values.length ?? 1;
    // Two thirds of the slot goes to bars, the rest is breathing room.
    return (this.groupWidth() * 0.66) / series;
  });

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly groups = computed(() => {
    const slot = this.groupWidth();
    const width = this.barWidth();
    const baseline = this.y(0);

    return this.data().map((row, groupIndex) => {
      const slotStart = this.PL + groupIndex * slot;
      const barsWidth = width * row.values.length;
      const start = slotStart + (slot - barsWidth) / 2;

      return {
        label: row.label,
        shortLabel: shortName(row.label),
        centre: slotStart + slot / 2,
        bars: row.values.map((value, seriesIndex) => {
          const y = this.y(value);
          return {
            seriesIndex,
            value,
            x: start + seriesIndex * width,
            y,
            height: Math.max(0, baseline - y),
            colour: VIZ_SERIES[seriesIndex % VIZ_SERIES.length],
          };
        }),
      };
    });
  });

  private y(value: number): number {
    const inner = this.height() - this.PT - this.PB;
    return this.PT + inner - (value / this.max()) * inner;
  }
}
