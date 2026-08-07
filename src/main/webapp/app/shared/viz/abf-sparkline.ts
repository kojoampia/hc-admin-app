import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, effect, inject, input, viewChild } from '@angular/core';

/**
 * The gold trend line inside a KPI tile.
 *
 * Canvas rather than SVG, matching the prototype: a sparkline carries no
 * labels, no axis and no interaction, so it has nothing to expose to the
 * accessibility tree and nothing to gain from being in the DOM. The tile's
 * own number and delta line are the accessible reading of it, which is why
 * this element is `aria-hidden`.
 */
@Component({
  selector: 'abf-sparkline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<canvas #canvas class="abf-spark" aria-hidden="true"></canvas>',
  styles: [
    `
      :host {
        display: block;
      }
      .abf-spark {
        display: block;
        width: 100%;
        height: 34px;
      }
    `,
  ],
})
export class AbfSparkline implements AfterViewInit, OnDestroy {
  readonly series = input<readonly number[]>([]);
  readonly stroke = input('var(--abf-gold)');

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly host = inject(ElementRef<HTMLElement>);
  private observer?: ResizeObserver;

  constructor() {
    // Redraw whenever the series changes; the first run is a no-op until the
    // canvas exists, which ngAfterViewInit then covers.
    effect(() => {
      this.series();
      this.stroke();
      this.draw();
    });
  }

  ngAfterViewInit(): void {
    // A canvas has no intrinsic layout response, so it needs telling when its
    // box changes. ResizeObserver is per element rather than a window resize
    // listener, so a tile that reflows on its own still redraws.
    this.observer = new ResizeObserver(() => this.draw());
    this.observer.observe(this.host.nativeElement);
    this.draw();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private draw(): void {
    // Not `viewChild.required`: the constructor effect runs before the view
    // exists, and a required query throws rather than returning undefined
    // there. The first real draw is ngAfterViewInit's.
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) {
      return;
    }
    const context = canvas.getContext('2d');
    const points = this.series();
    if (!context || points.length < 2) {
      return;
    }

    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 120;
    const height = canvas.clientHeight || 34;

    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    const min = Math.min(...points);
    const max = Math.max(...points);
    // A flat series would divide by zero; give it a mid-height straight line.
    const span = max - min || 1;
    const padding = 3;
    const usable = height - padding * 2;

    const x = (index: number): number => (index / (points.length - 1)) * width;
    const y = (value: number): number => padding + usable - ((value - min) / span) * usable;

    context.beginPath();
    points.forEach((value, index) => {
      const px = x(index);
      const py = y(value);
      if (index === 0) {
        context.moveTo(px, py);
      } else {
        context.lineTo(px, py);
      }
    });

    context.strokeStyle = this.resolveColour(this.stroke());
    context.lineWidth = 2;
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.stroke();
  }

  /** Canvas cannot read a CSS custom property; resolve it off the host. */
  private resolveColour(value: string): string {
    const custom = /^var\((--[\w-]+)\)$/.exec(value.trim());
    if (!custom) {
      return value;
    }
    const resolved = getComputedStyle(this.host.nativeElement).getPropertyValue(custom[1]).trim();
    return resolved || '#c59437';
  }
}
