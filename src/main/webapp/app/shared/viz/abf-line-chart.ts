import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

export interface LinePoint {
  readonly label: string;
  readonly value: number;
}

/**
 * At most this many x-axis labels, whatever the series length.
 *
 * A label is drawn per point, so a month of daily figures puts 31 of them across ~590 viewBox units
 * — roughly 19 units each, against labels like "12 Aug" that need about 40. They overlap into a
 * grey smear that reads as a rendering fault rather than as dense data.
 */
const MAX_X_LABELS = 10;

/**
 * Above this many points, the value printed above each dot is noise rather than information — the
 * numbers touch and the line disappears behind them. The crosshair tooltip still gives the exact
 * value for any point, and the table view has all of them.
 */
const MAX_VALUE_LABELS = 14;

/**
 * Message volume over time, with a crosshair and tooltip.
 *
 * Geometry is computed into a fixed 640×200 viewBox and the SVG scales to its
 * container, so there is nothing to redraw on resize — the prototype's
 * debounced resize handler exists because it writes pixel coordinates into an
 * SVG string; a viewBox makes that unnecessary.
 */
@Component({
  selector: 'abf-line-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="viz-line">
      <svg
        class="viz-figure"
        [attr.viewBox]="'0 0 ' + W + ' ' + H"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        [attr.aria-label]="ariaLabel()"
        (pointerleave)="active.set(null)"
      >
        @for (tick of ticks(); track tick.value) {
          <line class="viz-grid" [attr.x1]="PL" [attr.y1]="tick.y" [attr.x2]="W - PR" [attr.y2]="tick.y" />
          <text class="viz-axis" [attr.x]="PL - 7" [attr.y]="tick.y + 3.5" text-anchor="end">{{ tick.value }}</text>
        }

        <path [attr.d]="areaPath()" fill="var(--abf-series-1)" opacity="0.12" />
        <path [attr.d]="linePath()" fill="none" stroke="var(--abf-series-1)" stroke-width="2.4" stroke-linejoin="round" />

        <!-- track by index, not label: two points can legitimately carry the same label (a series
             spanning a year end has two "Jan"), and a duplicate track key is a runtime error. -->
        @for (mark of marks(); track mark.index) {
          @if (active() === mark.index) {
            <line class="viz-grid" [attr.x1]="mark.x" [attr.y1]="PT" [attr.x2]="mark.x" [attr.y2]="H - PB" stroke-dasharray="3 3" />
          }
          <circle
            [attr.cx]="mark.x"
            [attr.cy]="mark.y"
            [attr.r]="active() === mark.index ? 5.5 : 3.5"
            fill="var(--abf-series-1)"
            stroke="#fff"
            stroke-width="1.5"
          />
          <!-- Direct value labels: the numbers are on the chart, not only in a tooltip — until there
               are too many of them to read, at which point the tooltip and the table carry them. -->
          @if (showValues()) {
            <text class="viz-value" [attr.x]="mark.x" [attr.y]="mark.y - 10" text-anchor="middle">{{ mark.value }}</text>
          }
          @if (mark.showLabel) {
            <text class="viz-axis viz-axis--x" [attr.x]="mark.x" [attr.y]="H - 9" text-anchor="middle">{{ mark.label }}</text>
          }

          <!-- A wide, invisible hit area so the crosshair is reachable by pointer and by keyboard. -->
          <rect
            [attr.x]="mark.x - hitWidth() / 2"
            [attr.y]="PT"
            [attr.width]="hitWidth()"
            [attr.height]="H - PT - PB"
            fill="transparent"
            tabindex="0"
            role="button"
            [attr.aria-label]="mark.label + ': ' + mark.value"
            (pointerenter)="active.set(mark.index)"
            (focus)="active.set(mark.index)"
            (blur)="active.set(null)"
          />
        }
      </svg>

      @if (activeMark(); as mark) {
        <div class="viz-tip" [style.left.%]="(mark.x / W) * 100" [style.top.%]="(mark.y / H) * 100">
          <b>{{ mark.value }}</b>
          <span>{{ mark.label }}</span>
        </div>
      }
    </div>
  `,
  styleUrls: ['./abf-viz.scss', './abf-line-chart.scss'],
})
export class AbfLineChart {
  readonly points = input.required<readonly LinePoint[]>();
  readonly ariaLabel = input('');

  protected readonly W = 640;
  protected readonly H = 200;
  protected readonly PL = 34;
  protected readonly PR = 16;
  protected readonly PT = 20;
  protected readonly PB = 28;

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly active = signal<number | null>(null);

  /** Round the top of the scale up to a multiple of 40, as the prototype does. */
  private readonly max = computed(() => {
    const peak = Math.max(0, ...this.points().map(point => point.value));
    return Math.max(40, Math.ceil((peak * 1.12) / 40) * 40);
  });

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly ticks = computed(() => {
    const max = this.max();
    const step = max / 4;
    const values: { value: number; y: number }[] = [];
    for (let value = 0; value <= max; value += step) {
      values.push({ value, y: this.y(value) });
    }
    return values;
  });

  /**
   * How many points apart the x-axis labels are placed. 1 means every point is labelled.
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly labelStride = computed(() => Math.max(1, Math.ceil(this.points().length / MAX_X_LABELS)));

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly showValues = computed(() => this.points().length <= MAX_VALUE_LABELS);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly marks = computed(() => {
    const stride = this.labelStride();
    const last = this.points().length - 1;
    return this.points().map((point, index) => ({
      index,
      label: point.label,
      value: point.value,
      // Counted back from the END, so the most recent point is always labelled and the spacing
      // stays even. Anchoring on the first instead leaves the last two labels crowded together
      // whenever the length is not a multiple of the stride, and the newest figure is the one
      // someone is looking for.
      showLabel: (last - index) % stride === 0,
      x: this.x(index),
      y: this.y(point.value),
    }));
  });

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly activeMark = computed(() => {
    const index = this.active();
    return index === null ? null : (this.marks()[index] ?? null);
  });

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly hitWidth = computed(() => {
    const count = this.points().length;
    return count < 2 ? this.W : (this.W - this.PL - this.PR) / (count - 1);
  });

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly linePath = computed(() =>
    this.marks()
      .map((mark, index) => `${index === 0 ? 'M' : 'L'}${mark.x.toFixed(1)} ${mark.y.toFixed(1)}`)
      .join(' '),
  );

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly areaPath = computed(() => {
    const marks = this.marks();
    if (marks.length === 0) {
      return '';
    }
    const baseline = this.H - this.PB;
    return `${this.linePath()} L${marks[marks.length - 1].x.toFixed(1)} ${baseline} L${marks[0].x.toFixed(1)} ${baseline} Z`;
  });

  private x(index: number): number {
    const count = this.points().length;
    if (count < 2) {
      return this.PL;
    }
    return this.PL + (index / (count - 1)) * (this.W - this.PL - this.PR);
  }

  private y(value: number): number {
    const inner = this.H - this.PT - this.PB;
    return this.PT + inner - (value / this.max()) * inner;
  }
}
