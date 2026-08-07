import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { map } from 'rxjs';

import { IPlatformService } from 'app/entities/platform/platform-service/platform-service.model';
import { PlatformServiceService } from 'app/entities/platform/platform-service/service/platform-service.service';
import { TranslateDirective } from 'app/shared/language';

import { ConsoleMetricsService, PlatformCapability } from '../shared/console-metrics.service';
import { StatusPill } from '../shared/status-pill/status-pill';

/**
 * Platform health: the thirteen services from the architecture page, grouped
 * into planes.
 *
 * `plane` is a field on the entity rather than something derived from the
 * hostname. The prototype infers it with `host.includes('admin')`, which
 * quietly mis-files anything named off-pattern — `hc-vendorr-ms` and
 * `hc-kafka` both land in the vendor group there only because the regex was
 * written around them.
 */
@Component({
  selector: 'abf-platform-health',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './platform-health.html',
  styleUrl: './platform-health.scss',
  imports: [FontAwesomeModule, TranslateDirective, StatusPill],
})
export default class PlatformHealth implements OnInit {
  readonly services = signal<IPlatformService[]>([]);
  readonly capabilities = signal<PlatformCapability[]>([]);

  private readonly platformServiceService = inject(PlatformServiceService);
  private readonly metricsService = inject(ConsoleMetricsService);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly healthyCount = computed(() => this.services().filter(service => service.health === 'HEALTHY').length);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly degradedCount = computed(() => this.services().length - this.healthyCount());

  /**
   * The median response time, not the mean.
   *
   * The prototype labels this "Median response" and computes a mean. With one
   * service at 212ms against twelve between 12 and 92, the mean reads 60 and
   * the median reads 46 — the mean is being dragged by the very outlier the
   * screen is meant to surface separately.
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly medianResponseMs = computed(() => {
    const values = this.services()
      .map(service => service.responseMs ?? 0)
      .sort((a, b) => a - b);
    if (values.length === 0) {
      return 0;
    }
    const middle = Math.floor(values.length / 2);
    return values.length % 2 === 0 ? Math.round((values[middle - 1] + values[middle]) / 2) : values[middle];
  });

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly planes = computed(() => {
    const groups = new Map<string, IPlatformService[]>();
    for (const service of this.services()) {
      const plane = service.plane ?? 'Other';
      groups.set(plane, [...(groups.get(plane) ?? []), service]);
    }
    return [...groups.entries()].map(([plane, services]) => ({ plane, services }));
  });

  ngOnInit(): void {
    this.platformServiceService
      .query({ page: 0, size: 100, sort: ['plane,asc', 'port,asc'] })
      .pipe(map(response => response.body ?? []))
      .subscribe(services => this.services.set(services));

    this.metricsService.metrics().subscribe(metrics => this.capabilities.set(metrics.capabilities));
  }
}
