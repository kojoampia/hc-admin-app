import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { PlanReport, PlanRequest, RosterPlanService } from './roster-plan.service';

/**
 * The console's one new write, and the only thing that addresses hc-professional's roster from here.
 *
 * <p>It had no spec until 2026-09-05. The two tests that did cover the planner read text out of the
 * outage panel's template, and their own javadoc admits what that cannot see — a component that sets
 * the flag and renders nothing passes. The converse holds too, which is the half that matters here:
 * a service that never sets the flag also passes, because the panel's absence is what a healthy run
 * looks like.
 *
 * <p>So the three things pinned below are the three that no template assertion reaches.
 *
 * <ul>
 *   <li><b>The URL and its microservice prefix.</b> The defect class that 404'd all 23 entity
 *       services once already: a client addressing the gateway's own {@code /api} rather than
 *       {@code /services/hcadminservice/api}. It is invisible under {@code ng serve}, where the
 *       proxy forwards both, and it is a 404 behind nginx.
 *   <li><b>The request shape.</b> The api takes a date and a list of rounds; the far service refuses
 *       a round whose visits fall outside their shift window. A body that drifts from either is
 *       reported to the user as the roster service refusing the round, which points at the wrong
 *       stack.
 *   <li><b>The error path.</b> {@code plan()} must propagate an HTTP failure rather than swallowing
 *       it into an empty report, because {@code planCallFailed} is what the grid subscribes to and
 *       an empty report is indistinguishable from a run that planned nothing.
 * </ul>
 */
describe('RosterPlanService', () => {
  let service: RosterPlanService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(RosterPlanService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  const aRequest = (): PlanRequest => ({
    date: '2026-09-10',
    rounds: [
      {
        role: 'NURSE',
        shift: 'DAY',
        geographicSpaceId: 'gs-osu',
        name: 'Osu morning round',
        visits: [{ customerId: 'patient-kojo', startTime: '08:00', endTime: '09:00' }],
      },
    ],
  });

  const aReport = (): PlanReport => ({
    date: '2026-09-10',
    rosterServiceReachable: true,
    rounds: [{ index: 0, outcome: 'PLANNED', professionalId: 'p1', professionalName: 'Nii Osae', roundId: 'round-1' }],
  });

  describe('plan', () => {
    /**
     * Addressed through the microservice segment, which is the part that breaks in production only.
     *
     * <p>Asserted on the whole path rather than on a suffix: `/api/roster-plans` alone would pass for
     * a client that had dropped the prefix entirely, which is precisely the mistake.
     */
    it('posts to api/roster-plans under the hcadminservice prefix', () => {
      service.plan(aRequest()).subscribe();

      const req = httpMock.expectOne(request => request.method === 'POST' && request.url.includes('roster-plans'));
      expect(req.request.url).toContain('services/hcadminservice/api/roster-plans');
      req.flush(aReport());
    });

    /** The body the api parses, sent whole rather than assembled server-side from query parameters. */
    it('sends the date and the rounds as the body', () => {
      const request = aRequest();
      service.plan(request).subscribe();

      const req = httpMock.expectOne(r => r.url.includes('roster-plans'));
      expect(req.request.body).toEqual(request);
      expect(req.request.body.rounds[0].visits[0]).toEqual({
        customerId: 'patient-kojo',
        startTime: '08:00',
        endTime: '09:00',
      });
      req.flush(aReport());
    });

    /** A round with no visits is valid — ward cover and on-call time are real shifts. */
    it('sends an empty visit list rather than omitting it', () => {
      const request: PlanRequest = { date: '2026-09-10', rounds: [{ ...aRequest().rounds[0], visits: [] }] };
      service.plan(request).subscribe();

      const req = httpMock.expectOne(r => r.url.includes('roster-plans'));
      expect(req.request.body.rounds[0].visits).toEqual([]);
      req.flush(aReport());
    });

    /**
     * The report is handed back untouched, including the outage flag.
     *
     * <p>`rosterServiceReachable: false` arrives on a **200** — the api answers per-round rather than
     * with a status code, so that a run which filed two of three rounds does not throw that record
     * away. A service that treated it as an error would turn a partly successful run into a retry,
     * which is how a round gets filed twice.
     */
    it('passes a 200 carrying rosterServiceReachable false through as a report, not an error', () => {
      const seen: PlanReport[] = [];
      let errored = false;
      service.plan(aRequest()).subscribe({ next: report => seen.push(report), error: () => (errored = true) });

      httpMock
        .expectOne(r => r.url.includes('roster-plans'))
        .flush({
          date: '2026-09-10',
          rosterServiceReachable: false,
          rounds: [{ index: 0, outcome: 'FAILED', reason: 'ROSTER_SERVICE_UNREACHABLE' }],
        });

      expect(errored).toBe(false);
      expect(seen).toHaveLength(1);
      expect(seen[0].rosterServiceReachable).toBe(false);
      expect(seen[0].rounds[0].reason).toBe('ROSTER_SERVICE_UNREACHABLE');
    });

    /**
     * And a genuine HTTP failure reaches the subscriber, which is what sets `planCallFailed`.
     *
     * <p>The two outages are different and the grid renders them differently: this one is "the api
     * did not answer", the one above is "the api answered that it could not reach hc-professional".
     * A service that mapped an error to an empty report would collapse them, and an empty report is
     * also what a run that planned nothing looks like.
     */
    it.each([
      ['a 500 from the api', 500],
      ['a 403 from the gateway', 403],
    ])('propagates %s to the subscriber', (_label, status) => {
      let errorStatus: number | undefined;
      let nexted = false;
      service.plan(aRequest()).subscribe({
        next() {
          nexted = true;
        },
        error(err: HttpErrorResponse) {
          errorStatus = err.status;
        },
      });

      httpMock.expectOne(r => r.url.includes('roster-plans')).flush('nope', { status, statusText: 'refused' });

      expect(nexted).toBe(false);
      expect(errorStatus).toBe(status);
    });
  });

  describe('spaces', () => {
    it('reads api/geographic-spaces under the hcadminservice prefix', () => {
      service.spaces().subscribe();

      const req = httpMock.expectOne(request => request.method === 'GET' && request.url.includes('geographic-spaces'));
      expect(req.request.url).toContain('services/hcadminservice/api/geographic-spaces');
      req.flush([]);
    });

    /**
     * Asked for with a size, because a `query()` with no `size` returns twenty.
     *
     * <p>Nothing reports that the twenty-first district is missing: the picker simply does not offer
     * it, and a round is planned in the wrong area or not at all.
     */
    it('asks for a page big enough to hold the tree, sorted by name', () => {
      service.spaces().subscribe();

      const req = httpMock.expectOne(r => r.url.includes('geographic-spaces'));
      expect(req.request.params.get('size')).toBe('200');
      expect(req.request.params.get('sort')).toBe('name,asc');
      req.flush([]);
    });

    /** A body-less 200 is an empty list rather than a null the picker would throw on. */
    it('answers an empty list when the response carries no body', () => {
      const seen: unknown[] = [];
      service.spaces().subscribe(spaces => seen.push(spaces));

      httpMock.expectOne(r => r.url.includes('geographic-spaces')).flush(null, { status: 200, statusText: 'OK' });

      expect(seen).toEqual([[]]);
    });
  });
});
