import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { VIZ_SERIES } from './viz-palette';

export interface StackSegment {
  readonly key: string;
  readonly label: string;
  readonly value: number;
}

/**
 * The account-mix bar: one horizontal stack, one segment per account type.
 *
 * The 2px gaps between segments are surface-coloured rather than transparent,
 * so adjacent segments stay separable when two series land close together in
 * lightness — which is the failure mode a stacked bar has and a grouped bar
 * does not.
 */
@Component({
  selector: 'abf-stacked-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      class="viz-figure"
      [attr.viewBox]="'0 0 ' + W + ' ' + H"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      [attr.aria-label]="ariaLabel()"
    >
      @for (segment of segments(); track segment.key) {
        <rect [attr.x]="segment.x" y="40" [attr.width]="segment.width" [attr.height]="BAR_H" [attr.fill]="segment.colour" rx="3" />
        <!-- Direct labels above each segment, so the split reads without the legend. -->
        @if (segment.width > 46) {
          <text class="viz-value" [attr.x]="segment.x + segment.width / 2" y="30" text-anchor="middle">
            {{ segment.value }} · {{ segment.percent }}%
          </text>
        }
      }
      @for (segment of segments(); track segment.key) {
        @if (segment.width > 70) {
          <text class="viz-value" [attr.x]="segment.x + segment.width / 2" [attr.y]="40 + BAR_H / 2 + 4" text-anchor="middle" fill="#fff">
            {{ segment.label }}
          </text>
        }
      }
    </svg>
  `,
  styleUrl: './abf-viz.scss',
})
export class AbfStackedBar {
  readonly data = input.required<readonly StackSegment[]>();
  readonly ariaLabel = input('');

  protected readonly W = 640;
  protected readonly H = 120;
  protected readonly BAR_H = 46;

  /** 2px of surface between segments, taken off each segment's width. */
  private readonly GAP = 2;

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly total = computed(() => this.data().reduce((sum, segment) => sum + segment.value, 0));

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly segments = computed(() => {
    const rows = this.data();
    const total = this.total() || 1;
    const gaps = Math.max(0, rows.length - 1) * this.GAP;
    const usable = this.W - gaps;

    let cursor = 0;
    return rows.map((row, index) => {
      const width = (row.value / total) * usable;
      const segment = {
        key: row.key,
        label: row.label,
        value: row.value,
        percent: Math.round((row.value / total) * 100),
        x: cursor,
        width,
        colour: VIZ_SERIES[index % VIZ_SERIES.length],
      };
      cursor += width + this.GAP;
      return segment;
    });
  });
}
