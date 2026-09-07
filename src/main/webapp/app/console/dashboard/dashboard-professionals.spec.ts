import { beforeEach, describe, expect, it } from 'vitest';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { DashboardMetrics } from '../shared/console-metrics.service';
import Dashboard from './dashboard';

/**
 * The professionals tile, and the clinicians it deliberately does not count — backlog item 46.
 *
 * A clinician who registers on hc-professional reaches this service as a `DirectoryLink` with no
 * local record: that topic carries no role and no licence number, both of which hc-admin requires, so
 * no `Professional` is ever created. `network.professionals` counts `Professional` documents, so the
 * tile could not move when somebody registered — which is what an administrator reported from
 * production, having watched a registration go through and the dashboard sit still.
 *
 * **The fix is a second figure, and these cases are what stop it quietly becoming a first one.** The
 * tempting change is to add the links into `network.professionals`. That number is also the
 * account-mix chart's professionals segment and the last point of the professionals sparkline — which
 * `SparklinesIT` requires to equal the tile — so folding them in moves three figures at once and says
 * so nowhere.
 */
describe('the professionals tile', () => {
  let component: Dashboard;
  let httpMock: HttpTestingController;

  /** Only the fields `kpis()` reads. Everything else on the payload is lazily computed elsewhere. */
  const metrics = (professionals: number, awaiting: number): DashboardMetrics =>
    ({
      network: { patients: 40, professionals, vendors: 3 },
      loaded: { patients: 40, professionals, vendors: 3 },
      unreadMessages: 0,
      openTasks: 0,
      pendingApprovals: 0,
      professionalsAwaitingRecord: awaiting,
      deltas: { professionals: 0 },
      sparklines: {},
    }) as unknown as DashboardMetrics;

  const answerMetrics = (payload: DashboardMetrics): void => {
    httpMock.expectOne(request => request.url.includes('dashboard/metrics')).flush(payload);
  };

  const professionalsTile = (): { value: number; subNote?: { key: string; params: Record<string, number> } } =>
    component.kpis().find(tile => tile.key === 'professionals')!;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideTranslateService()],
    });
    component = TestBed.runInInjectionContext(() => new Dashboard());
    httpMock = TestBed.inject(HttpTestingController);
    component.ngOnInit();
  });

  it('counts records, and reports the clinicians with no record beside that number rather than in it', () => {
    answerMetrics(metrics(9, 3));

    // Nine, not twelve. The tile means "clinicians on file" and still does.
    expect(professionalsTile().value).toBe(9);
    expect(professionalsTile().subNote).toEqual({
      key: 'dashboard.kpi.professionalsAwaitingNote',
      params: { count: 3 },
    });
  });

  /**
   * Nothing waiting is no second line, not a line saying zero.
   *
   * "0 registered, no record here yet" is a sentence about a problem nobody has, on the tile an
   * administrator looks at every morning — and it is the normal state of every stack that has never
   * consumed a registration.
   */
  it('says nothing when there is nothing waiting', () => {
    answerMetrics(metrics(9, 0));

    expect(professionalsTile().value).toBe(9);
    expect(professionalsTile().subNote).toBeUndefined();
  });

  /** The other three tiles have nothing of the kind, so a stray line cannot appear under them. */
  it('leaves the other tiles with no second line', () => {
    answerMetrics(metrics(9, 3));

    expect(component.kpis().filter(tile => tile.subNote !== undefined)).toHaveLength(1);
  });
});
