import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { forkJoin, map } from 'rxjs';

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

interface ApprovalRow {
  readonly kind: 'patient' | 'professional' | 'vendor';
  readonly id: number;
  readonly name: string;
  readonly detail: string;
  readonly route: string;
}

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
   * The account-mix stack. Segment labels are translated here rather than in
   * the template because the SVG renders them as `<text>`, which has no pipe
   * to run them through.
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly accountMixSegments = computed(() =>
    (this.metrics()?.accountMix ?? []).map(row => ({
      key: row.key,
      label: this.translateService.instant(`dashboard.charts.mix.${row.key}`),
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

  private loadApprovals(): void {
    const pending = { page: 0, size: 20, 'status.equals': 'PENDING' };

    forkJoin({
      patients: this.patientService.query(pending).pipe(map(response => response.body ?? [])),
      professionals: this.professionalService.query(pending).pipe(map(response => response.body ?? [])),
      vendors: this.vendorService.query(pending).pipe(map(response => response.body ?? [])),
    }).subscribe({
      next: ({ patients, professionals, vendors }) => {
        this.approvals.set([
          ...patients.map((patient: IPatient) => ({
            kind: 'patient' as const,
            id: patient.id,
            name: [patient.profile?.firstName, patient.profile?.lastName].filter(Boolean).join(' '),
            detail: 'dashboard.approvals.patient',
            route: `/patient/${patient.id}/view`,
          })),
          ...professionals.map((professional: IProfessional) => ({
            kind: 'professional' as const,
            id: professional.id,
            name: [professional.profile?.firstName, professional.profile?.lastName].filter(Boolean).join(' '),
            detail: 'dashboard.approvals.professional',
            route: `/professional/${professional.id}/view`,
          })),
          ...vendors.map((vendor: IVendor) => ({
            kind: 'vendor' as const,
            id: vendor.id,
            name: vendor.name ?? '',
            detail: 'dashboard.approvals.vendor',
            route: `/vendor/${vendor.id}/view`,
          })),
        ]);
      },
      error: () => this.approvals.set([]),
    });
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
