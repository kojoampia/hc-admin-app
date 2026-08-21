import { HttpResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';

import { TOTAL_COUNT_RESPONSE_HEADER } from 'app/config/pagination.constants';
import { AccountService } from 'app/core/auth/account.service';
import { MessageService } from 'app/entities/operations/message/service/message.service';
import { IMessage } from 'app/entities/operations/message/message.model';
import { PatientService } from 'app/entities/directory/patient/service/patient.service';
import { IPatient } from 'app/entities/directory/patient/patient.model';
import { ProfessionalService } from 'app/entities/directory/professional/service/professional.service';
import { IProfessional } from 'app/entities/directory/professional/professional.model';
import { VendorService } from 'app/entities/directory/vendor/service/vendor.service';
import { IVendor } from 'app/entities/directory/vendor/vendor.model';
import { FormatMediumDatePipe } from 'app/shared/date';
import { TranslateDirective } from 'app/shared/language';
import { AbfChartCard, AbfGroupedBars, AbfLineChart, AbfSparkline, AbfStackedBar, VIZ_SERIES } from 'app/shared/viz';

import { ConsoleMetricsService, DashboardMetrics } from '../shared/console-metrics.service';
import { StatusPill } from '../shared/status-pill/status-pill';

interface KpiTile {
  readonly key: string;
  readonly label: string;
  readonly value: number;
  readonly icon: IconProp;
  readonly tone: 'gold' | 'navy' | 'warn' | 'ok';
  readonly direction: 'up' | 'down' | 'flat';
  readonly note: string;
  readonly route: string;
  readonly series: readonly number[];
}

type ApprovalKind = 'patient' | 'professional' | 'vendor';

interface ApprovalRow {
  readonly kind: ApprovalKind;
  readonly id: string;
  readonly name: string;
  readonly detail: string;
  readonly route: string;
}

/** One directory with pending records the card did not have room for. */
interface ApprovalOverflow {
  readonly kind: ApprovalKind;
  readonly label: string;
  readonly count: number;
  readonly route: string;
}

/**
 * How many approval rows the card shows, matching the design.
 *
 * It rendered every pending record until 2026-08-21 — 28 of them on seeded
 * data, three screens of dashboard below a hero about the week. The cap is only
 * half of the fix: a truncated list with no route to the rest is the failure
 * `CLAUDE.md` documents for pagination, so what is hidden is counted and each
 * directory is linked with its own filter.
 */
const APPROVAL_ROWS = 5;

/** The pending total for one directory, which is the header rather than the page. */
const totalCount = (response: HttpResponse<unknown[]>): number => Number(response.headers.get(TOTAL_COUNT_RESPONSE_HEADER) ?? 0);

/**
 * The admin dashboard.
 *
 * Reads the whole-network figures from `/api/dashboard/metrics` and the
 * pending-approval and latest-at-the-desk lists from the generated entity
 * services, filtered server-side. Nothing here counts a collection by
 * downloading it.
 */
@Component({
  selector: 'abf-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  imports: [
    RouterLink,
    FontAwesomeModule,
    TranslateDirective,
    TranslatePipe,
    FormatMediumDatePipe,
    AbfChartCard,
    AbfLineChart,
    AbfStackedBar,
    AbfGroupedBars,
    AbfSparkline,
    StatusPill,
  ],
})
export default class Dashboard implements OnInit {
  readonly metrics = signal<DashboardMetrics | null>(null);
  readonly approvals = signal<ApprovalRow[]>([]);
  readonly approvalOverflow = signal<ApprovalOverflow[]>([]);
  readonly hiddenApprovals = signal(0);
  readonly latestMessages = signal<IMessage[]>([]);
  readonly isLoading = signal(true);

  private readonly metricsService = inject(ConsoleMetricsService);
  private readonly patientService = inject(PatientService);
  private readonly professionalService = inject(ProfessionalService);
  private readonly vendorService = inject(VendorService);
  private readonly messageService = inject(MessageService);
  private readonly accountService = inject(AccountService);
  private readonly translateService = inject(TranslateService);
  private readonly router = inject(Router);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly firstName = computed(() => this.accountService.account()?.firstName ?? '');

  /**
   * Which week the cover figure is about, for the hero sentence.
   *
   * The sentence read "roster cover at {{ cover }}% for the week" and named no week, which is
   * precisely how a figure computed for one week could sit beside a duty roster showing another and
   * read as agreement. The api now says which week it counted; falling back to "the week" keeps the
   * sentence grammatical when there is no roster at all, and that case reads 0% anyway.
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly rosterWeekName = computed(() => this.metrics()?.roster.weekLabel ?? this.fallbackWeekName());

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly kpis = computed<KpiTile[]>(() => {
    const data = this.metrics();
    if (!data) {
      return [];
    }
    return [
      {
        key: 'patients',
        label: 'dashboard.kpi.patients',
        value: data.network.patients,
        icon: 'user',
        tone: 'gold',
        direction: 'up',
        note: 'dashboard.kpi.patientsNote',
        route: '/patient',
        series: data.sparklines.patients ?? [],
      },
      {
        key: 'professionals',
        label: 'dashboard.kpi.professionals',
        value: data.network.professionals,
        icon: 'stethoscope',
        tone: 'navy',
        direction: 'up',
        note: 'dashboard.kpi.professionalsNote',
        route: '/professional',
        series: data.sparklines.professionals ?? [],
      },
      {
        key: 'messages',
        label: 'dashboard.kpi.unreadMessages',
        value: data.unreadMessages,
        icon: 'envelope',
        tone: 'warn',
        direction: data.unreadMessages > 2 ? 'down' : 'flat',
        note: 'dashboard.kpi.unreadMessagesNote',
        route: '/message-desk',
        series: data.sparklines.messages ?? [],
      },
      {
        key: 'tasks',
        label: 'dashboard.kpi.openTasks',
        value: data.openTasks,
        icon: 'clipboard-list',
        tone: 'ok',
        direction: 'flat',
        note: 'dashboard.kpi.openTasksNote',
        route: '/task-board',
        series: data.sparklines.tasks ?? [],
      },
    ];
  });

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly messageVolume = computed(() => (this.metrics()?.messageVolume ?? []).map(row => ({ label: row.month, value: row.count })));

  /**
   * The account-mix stack: who holds an account on the platform.
   *
   * Segment labels are translated here rather than in the template because the
   * SVG renders them as `<text>`, which has no pipe to run them through.
   *
   * The keys are `patients` / `professionals` / `vendors` and come from the api
   * in that fixed order — deliberately not sorted, so a segment's colour keeps
   * its meaning when two counts cross. Item 10: this drew professionals by role
   * until 2026-08-21, a breakdown of one tile rather than of the network, and
   * the role split now lives on the professional directory where its tiles
   * also filter.
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly accountMixSegments = computed(() =>
    (this.metrics()?.accountMix ?? []).map(row => ({
      key: row.key,
      label: this.translateService.instant(`dashboard.charts.mix.${row.key}`) as string,
      value: row.value,
    })),
  );

  private readonly accountMixTotal = computed(() => this.accountMixSegments().reduce((sum, row) => sum + row.value, 0));

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly caseLoad = computed(() =>
    (this.metrics()?.caseLoad ?? []).map(row => ({
      label: row.name,
      values: [row.cases, row.visits],
    })),
  );

  ngOnInit(): void {
    this.metricsService.metrics().subscribe({
      next: metrics => {
        this.metrics.set(metrics);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });

    this.loadApprovals();

    // The four most recent threads, ordered by the server.
    this.messageService.query({ page: 0, size: 4, sort: ['sentAt,desc'] }).subscribe({
      next: response => this.latestMessages.set(response.body ?? []),
      error: () => this.latestMessages.set([]),
    });
  }

  openKpi(tile: KpiTile): void {
    void this.router.navigate([tile.route]);
  }

  /**
   * The pending-approval card: at most `APPROVAL_ROWS` rows, and the count of
   * what that leaves out.
   *
   * Each directory is asked for one page of `APPROVAL_ROWS` rather than 20, so
   * the request is the size of the card. The totals come off `X-Total-Count`,
   * which is the whole pending count for that directory whatever the page size
   * — that is what makes "and 7 more" a real number rather than a count of the
   * rows that happened to arrive.
   */
  private loadApprovals(): void {
    const pending = { page: 0, size: APPROVAL_ROWS, 'status.equals': 'PENDING' };

    forkJoin({
      patients: this.patientService.query(pending),
      professionals: this.professionalService.query(pending),
      vendors: this.vendorService.query(pending),
    }).subscribe({
      next: ({ patients, professionals, vendors }) => {
        this.setApprovals(
          [
            ...(patients.body ?? []).map((patient: IPatient) => ({
              kind: 'patient' as const,
              id: patient.id,
              name: [patient.profile?.firstName, patient.profile?.lastName].filter(Boolean).join(' '),
              detail: 'dashboard.approvals.patient',
              route: `/patient/${patient.id}/view`,
            })),
            ...(professionals.body ?? []).map((professional: IProfessional) => ({
              kind: 'professional' as const,
              id: professional.id,
              name: [professional.profile?.firstName, professional.profile?.lastName].filter(Boolean).join(' '),
              detail: 'dashboard.approvals.professional',
              route: `/professional/${professional.id}/view`,
            })),
            ...(vendors.body ?? []).map((vendor: IVendor) => ({
              kind: 'vendor' as const,
              id: vendor.id,
              name: vendor.name ?? '',
              detail: 'dashboard.approvals.vendor',
              route: `/vendor/${vendor.id}/view`,
            })),
          ],
          {
            patient: totalCount(patients),
            professional: totalCount(professionals),
            vendor: totalCount(vendors),
          },
        );
      },
      error: () => this.setApprovals([], { patient: 0, professional: 0, vendor: 0 }),
    });
  }

  /** Caps the rows, and turns whatever is left over into one link per directory. */
  private setApprovals(rows: ApprovalRow[], totals: Record<ApprovalKind, number>): void {
    const shown = rows.slice(0, APPROVAL_ROWS);
    const pending = totals.patient + totals.professional + totals.vendor;
    const groups: ApprovalOverflow[] = [
      { kind: 'patient', label: 'dashboard.approvals.patients', count: totals.patient, route: '/patient' },
      { kind: 'professional', label: 'dashboard.approvals.professionals', count: totals.professional, route: '/professional' },
      { kind: 'vendor', label: 'dashboard.approvals.vendors', count: totals.vendor, route: '/vendor' },
    ];

    this.approvals.set(shown);
    this.hiddenApprovals.set(Math.max(0, pending - shown.length));
    this.approvalOverflow.set(groups.filter(group => group.count > 0));
  }

  // eslint-disable-next-line @typescript-eslint/member-ordering
  sharePercent(value: number): number {
    const total = this.accountMixTotal();
    return total === 0 ? 0 : Math.round((value / total) * 100);
  }

  // eslint-disable-next-line @typescript-eslint/member-ordering
  seriesColour(index: number): string {
    return VIZ_SERIES[index % VIZ_SERIES.length];
  }

  /** "the week", for the case where there is no roster at all and no week to name. */
  private fallbackWeekName(): string {
    const fallback: string = this.translateService.instant('dashboard.hero.thisWeek');
    return fallback;
  }

  /** Initials for the monogram avatar, from whatever name we actually have. */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .map(part => part.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
}
