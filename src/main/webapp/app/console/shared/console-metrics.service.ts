import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';

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
}

@Injectable({ providedIn: 'root' })
export class ConsoleMetricsService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);
  private readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/dashboard/metrics');

  metrics(): Observable<DashboardMetrics> {
    return this.http.get<DashboardMetrics>(this.resourceUrl);
  }
}
