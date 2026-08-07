import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';

import { TranslatePipe } from '@ngx-translate/core';

/**
 * The frame every chart sits in: title, subtitle, legend, and the Chart /
 * Table toggle.
 *
 * The table view is not a nicety and not optional. Two of the three data-viz
 * slots are lighter than the first, and the table is how their values stay
 * readable to anyone the colour separation does not serve — including anyone
 * printing the page in greyscale. Every chart in this app has one.
 */
@Component({
  selector: 'abf-chart-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    <section class="card viz-card">
      <header class="viz-head">
        <div class="grow">
          <h4>{{ title() | translate }}</h4>
          @if (subtitle()) {
            <p>{{ subtitle()! | translate }}</p>
          }
        </div>
        <div class="viz-toggle no-print" role="group" [attr.aria-label]="'viz.toggle.label' | translate">
          <button type="button" [class.on]="!showTable()" [attr.aria-pressed]="!showTable()" (click)="showTable.set(false)">
            {{ 'viz.toggle.chart' | translate }}
          </button>
          <button type="button" [class.on]="showTable()" [attr.aria-pressed]="showTable()" (click)="showTable.set(true)">
            {{ 'viz.toggle.table' | translate }}
          </button>
        </div>
      </header>

      @if (showTable()) {
        <div class="viz-body viz-body--table">
          <ng-content select="[chartTable]" />
        </div>
      } @else {
        <div class="viz-body">
          <ng-content select="[chartFigure]" />
        </div>
        <ng-content select="[chartLegend]" />
      }
    </section>
  `,
  styleUrl: './abf-viz.scss',
})
export class AbfChartCard {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);

  readonly showTable = signal(false);
}
