import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { ADMIN_SERVICE } from 'app/config/microservice.constants';
import { ApplicationConfigService } from 'app/core/config/application-config.service';

/** The five shift types, as both sides of the estate spell them since 2026-09-04. */
export type PlanShift = 'DAY' | 'EVENING' | 'NIGHT' | 'OFF' | 'FLEXIBLE';

/** hc-admin's own role vocabulary. The api translates it into hc-professional's duty names. */
export type PlanRole = 'CAREGIVER' | 'PARAMEDIC' | 'THERAPIST' | 'NURSE' | 'DOCTOR';

export interface PlanVisit {
  readonly customerId: string;
  readonly startTime: string;
  readonly endTime: string;
}

export interface PlanRound {
  readonly role: PlanRole;
  readonly shift: PlanShift;
  readonly geographicSpaceId: string;
  readonly name: string;
  readonly description?: string | null;
  readonly visits: PlanVisit[];
}

export interface PlanRequest {
  readonly date: string;
  readonly rounds: PlanRound[];
}

/**
 * Three outcomes, and the screen renders them as three different things.
 *
 * <p>`UNPLANNED` is a decision the administrator can act on by widening the request. `FAILED` is not
 * a decision at all — the roster of record could not be written to, so nothing is known about
 * whether the round should exist.
 */
export type PlanOutcome = 'PLANNED' | 'UNPLANNED' | 'FAILED';

export type PlanReason =
  | 'NO_TEAM_COVERS_THE_SPACE'
  | 'NO_CANDIDATE_HOLDS_THE_ROLE'
  | 'NO_CANDIDATE_IS_AVAILABLE'
  | 'ROSTER_SERVICE_UNREACHABLE'
  | 'ROSTER_SERVICE_REFUSED_THE_ROUND';

export interface PlanRoundOutcome {
  readonly index: number;
  readonly outcome: PlanOutcome;
  readonly reason?: PlanReason | null;
  readonly professionalId?: string | null;
  readonly professionalName?: string | null;
  readonly roundId?: string | null;
}

export interface PlanReport {
  readonly date: string;
  /** False when the roster service could not be written to. The screen's outage state. */
  readonly rosterServiceReachable: boolean;
  readonly rounds: PlanRoundOutcome[];
}

/** A geographic space, as `GeographicSpaceReferenceResource` projects it. */
export interface GeographicSpaceRef {
  readonly id: string;
  readonly name: string;
  readonly type?: string | null;
  readonly parentId?: string | null;
}

/**
 * Planning: ask the api to staff a round and file it with the roster of record.
 *
 * <h2>The write leaves this stack, and that is why this screen has an outage state</h2>
 *
 * <p>Until 2026-09-04 hc-admin kept its own duty roster and planning was a local save. It does not:
 * hc-professional owns the roster, and `POST /api/roster-plans` chooses a professional here and then
 * writes the round <em>there</em>. A write across a stack boundary can fail in a way a local one
 * cannot, so {@link PlanReport.rosterServiceReachable} exists and the grid renders a standing panel
 * when it is false. Not a toast: a toast is gone by the time somebody asks why the roster is empty,
 * and an empty roster must never be indistinguishable from an unreachable roster service.
 *
 * <h2>Always 200</h2>
 *
 * <p>Including when nothing could be filed. The api answers with a per-round outcome rather than a
 * status code, because a run that filed two rounds of three has genuinely done part of the work and
 * a 502 would throw that record away — leaving an administrator to guess whether to run it again,
 * which is how a round gets filed twice. An HTTP error from this call therefore means something else
 * went wrong (auth, the gateway, a malformed request), and the screen says so separately.
 */
@Injectable({ providedIn: 'root' })
export class RosterPlanService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  private readonly planUrl = this.applicationConfigService.getEndpointFor('api/roster-plans', ADMIN_SERVICE);
  private readonly spacesUrl = this.applicationConfigService.getEndpointFor('api/geographic-spaces', ADMIN_SERVICE);

  plan(request: PlanRequest): Observable<PlanReport> {
    return this.http.post<PlanReport>(this.planUrl, request);
  }

  /**
   * The areas a round can be planned in.
   *
   * <p>Paged like every list in that service, and asked for with a size — a `query()` with no `size`
   * returns twenty, and nothing reports that the twenty-first district is missing. The tree is small
   * and one page is deliberately enough; if it stops being, this needs a pager rather than a bigger
   * number.
   */
  spaces(): Observable<GeographicSpaceRef[]> {
    return this.http
      .get<GeographicSpaceRef[]>(this.spacesUrl, { params: { size: '200', sort: 'name,asc' }, observe: 'response' })
      .pipe(map(response => response.body ?? []));
  }
}
