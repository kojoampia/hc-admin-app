import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { ADMIN_SERVICE } from 'app/config/microservice.constants';

/**
 * The one aggregate the generated entity services cannot express.
 *
 * Everything else on the console comes from `PatientService`,
 * `MessageService`, `ShiftAssignmentService` and the rest, unmodified. This
 * covers what genuinely has no entity behind it: the whole-network totals
 * (the directories load a 12-record extract, the network is larger), the
 * derived roster and approval counts, and the chart series.
 *
 * It is deliberately the ONLY narrow service here. If a screen needs
 * something new, it belongs on this endpoint or on an entity service — not in
 * a second data layer beside them.
 */

export interface NetworkTotals {
  patients: number;
  professionals: number;
  vendors: number;
}

export interface RosterSummary {
  coverPercent: number;
  unassignedSlots: number;
  rosteredStaff: number;
  shiftsThisWeek: number;
}

export interface DegradedService {
  /** A Mongo id. It was `number` while an in-browser mock invented ids; the api returns strings. */
  id: string;
  name: string;
  host: string;
  port: number;
}

export interface CaseLoadRow {
  /** A Mongo id — see DegradedService. */
  id: string;
  name: string;
  cases: number;
  visits: number;
}

export interface PlatformCapability {
  name: string;
  icon: string;
  status: string;
}

export interface Uptime {
  /** Null when no metrics store is configured — "not measured", which is not the same as 0%. */
  percent: number | null;
  /** Render this. The caption must never claim a window nobody measured. */
  windowDays: number;
}

export interface DashboardMetrics {
  /** Whole-network figures. */
  network: NetworkTotals;
  /** How many of each the directories actually hold. */
  loaded: NetworkTotals;
  unreadMessages: number;
  openTasks: number;
  pendingApprovals: number;
  roster: RosterSummary;
  degradedServices: DegradedService[];
  /** How many services the map covers, and how many are healthy. */
  platformServices: { total: number; healthy: number };
  messageVolume: { month: string; count: number }[];
  accountMix: { key: string; value: number }[];
  caseLoad: CaseLoadRow[];
  /** Keyed by KPI. A key that is not present simply has no trend line. */
  sparklines: Record<string, number[] | undefined>;
  capabilities: PlatformCapability[];
  uptime: Uptime;
}

@Injectable({ providedIn: 'root' })
export class ConsoleMetricsService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);
  /**
   * The microservice segment is not optional. Without it this resolves to `api/dashboard/metrics`
   * on the gateway's own surface, which serves no such route — a 404 that no screen reports,
   * leaving the dashboard, platform-health and the sign-in figures blank. Verified against
   * production: gateway-relative 404, `services/hcadminservice/` 200.
   */
  private readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/dashboard/metrics', ADMIN_SERVICE);

  metrics(): Observable<DashboardMetrics> {
    return this.http.get<DashboardMetrics>(this.resourceUrl);
  }
}
