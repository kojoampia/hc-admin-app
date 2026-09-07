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

/**
 * Counts of **records in hc-admin**, which is a narrower claim than the labels suggest.
 *
 * `professionals` counts `Professional` documents. A clinician who has registered on
 * hc-professional and has no record here is not in it — see
 * `DashboardMetrics.professionalsAwaitingRecord`, which counts exactly those, and the api's
 * `DashboardMetricsDTO` for why the two are kept apart rather than added together.
 */
export interface NetworkTotals {
  patients: number;
  professionals: number;
  vendors: number;
}

/**
 * Counted the way `console/duty-roster` counts it — capacity is rosterable professionals × 7, and an
 * unassigned slot is a cell with no assignment rather than an assignment with no professional. The
 * two screens sit one click apart and used to disagree: the hero said 0% cover while the grid said
 * 80% over the same roster.
 *
 * `weekLabel` and `weekStartDate` say which week the figures are about, and are null only when there
 * is no roster week at all. Render the label — "for the week" with no week named is how one week's
 * number sits beside another week's grid and looks reconciled.
 */
export interface RosterSummary {
  coverPercent: number;
  unassignedSlots: number;
  rosteredStaff: number;
  shiftsThisWeek: number;
  weekLabel: string | null;
  weekStartDate: string | null;
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
  /**
   * Clinicians this service knows about and holds no `Professional` for.
   *
   * A registration on hc-professional arrives as a `DirectoryLink` with no local record — the topic
   * carries no role and no licence number, and both are required here — so the professionals tile
   * cannot move when somebody registers. It did not, and an administrator reported it from
   * production (backlog item 46).
   *
   * **It is rendered beside that tile rather than added into it.** The tile counts records, and the
   * account-mix chart and the professionals sparkline are both derived from the same number; folding
   * links in would move all three without saying so. The professional directory lists these same
   * accounts, so the figure is one click from the people it counts.
   */
  professionalsAwaitingRecord: number;
  roster: RosterSummary;
  degradedServices: DegradedService[];
  /** How many services the map covers, and how many are healthy. */
  platformServices: { total: number; healthy: number };
  messageVolume: { month: string; count: number }[];
  accountMix: { key: string; value: number }[];
  caseLoad: CaseLoadRow[];
  /** Keyed by KPI. A key that is not present simply has no trend line. */
  sparklines: Record<string, number[] | undefined>;
  /**
   * What each KPI tile's note says, as numbers.
   *
   * Item 14: the notes were i18n literals — "+3 this week" under a patient count of 12, on both
   * sides, unable to change. The strings are templates now and these fill them. Keyed as the
   * sparklines are, and each is the measurement its own template names rather than a generic delta
   * the copy could reinterpret.
   */
  deltas: Record<string, number | undefined>;
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
