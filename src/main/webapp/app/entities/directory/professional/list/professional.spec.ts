import { MockInstance, afterEach, beforeEach, describe, expect, it, vitest } from 'vitest';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, inject } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import {
  faBoxArchive,
  faEye,
  faList,
  faPencilAlt,
  faPlus,
  faSort,
  faSortDown,
  faSortUp,
  faSync,
  faTimes,
  faCalendarAlt,
  faUserDoctor,
} from '@fortawesome/free-solid-svg-icons';
import { provideTranslateService } from '@ngx-translate/core';
import { Subject, of } from 'rxjs';

import { sampleWithRequiredData } from '../professional.test-samples';
import { ProfessionalService } from '../service/professional.service';

import { Professional } from './professional';

vitest.useFakeTimers();

describe('Professional Management Component', () => {
  let httpMock: HttpTestingController;
  let comp: Professional;
  let fixture: ComponentFixture<Professional>;
  let service: ProfessionalService;
  let routerNavigateSpy: MockInstance;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideTranslateService(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({
              defaultSort: 'id,asc',
            }),
            queryParamMap: of(
              convertToParamMap({
                page: '1',
                size: '1',
                sort: 'id,desc',
              }),
            ),
            snapshot: {
              queryParams: {},
              queryParamMap: convertToParamMap({
                page: '1',
                size: '1',
                sort: 'id,desc',
              }),
            },
          },
        },
      ],
    });

    fixture = TestBed.createComponent(Professional);
    comp = fixture.componentInstance;
    service = TestBed.inject(ProfessionalService);
    routerNavigateSpy = vitest.spyOn(comp.router, 'navigate');

    const library = TestBed.inject(FaIconLibrary);
    // The role-tile and roster-shortcut icons go in alongside the table's: an icon missing from
    // the library throws at render, so every test fails on the tiles rather than on its subject.
    library.addIcons(
      faBoxArchive,
      faCalendarAlt,
      faEye,
      faList,
      faPencilAlt,
      faPlus,
      faSort,
      faSortDown,
      faSortUp,
      faSync,
      faTimes,
      faUserDoctor,
    );
    httpMock = TestBed.inject(HttpTestingController);
  });

  /**
   * The table's own request.
   *
   * `ngOnInit` loads the role tiles as well — two `size=1` counts per role — so a bare
   * `expectOne({ method: 'GET' })` now matches eleven requests and fails.
   *
   * Discriminated on page size, not on the absence of `role.equals`: once a role tile is
   * selected the list request carries that parameter too, and only the tiles ask for `size=1`.
   */
  function expectListRequest(): TestRequest {
    return httpMock.expectOne(req => req.url.endsWith('/api/professionals') && req.params.get('size') !== '1');
  }

  /**
   * Answer the tile requests.
   *
   * An unanswered request makes `httpMock.verify()` fail in `afterEach`, so every test would
   * report "open requests" instead of whatever it was actually asserting.
   */
  function flushTiles(): void {
    for (const req of httpMock.match(r => r.url.endsWith('/api/professionals') && r.params.get('size') === '1')) {
      req.flush([], { headers: { 'X-Total-Count': '0' } });
    }
  }

  /**
   * Answer the awaiting-a-record request, which `ngOnInit` makes alongside the tiles.
   *
   * Same reasoning as {@link flushTiles}: an unanswered request fails `httpMock.verify()` in
   * `afterEach`, so every test would report "open requests" instead of its own subject.
   */
  function flushAwaiting(links: unknown[] = [], total = '0'): void {
    for (const req of httpMock.match(r => r.url.endsWith('/api/directory-links'))) {
      req.flush(links, { headers: { 'X-Total-Count': total } });
    }
  }

  afterEach(() => {
    flushTiles();
    flushAwaiting();
    TestBed.resetTestingModule();
    httpMock.verify();
  });

  it('should call load all on init', async () => {
    // WHEN
    TestBed.tick();
    const req = expectListRequest();
    req.flush([{ id: '2c613901-f64b-4441-b80a-f5fb03b8e466' }], {
      headers: { link: '<http://localhost/api/foo?page=1&size=20>; rel="next"' },
    });
    await vitest.runAllTimersAsync();

    // THEN
    expect(comp.isLoading()).toEqual(false);
    expect(comp.professionals()[0]).toEqual(expect.objectContaining({ id: '2c613901-f64b-4441-b80a-f5fb03b8e466' }));
  });

  it('should cancel previous requests when loading a new page', async () => {
    // WHEN
    TestBed.tick();
    const req = expectListRequest();
    await vitest.runAllTimersAsync();

    comp.page.set(3);
    comp.load();
    await vitest.runAllTimersAsync();
    const req2 = expectListRequest();
    req2.flush([{ id: '2c613901-f64b-4441-b80a-f5fb03b8e466' }], {
      headers: { link: '<http://localhost/api/foo?page=1&size=20>; rel="next"' },
    });
    await vitest.runAllTimersAsync();

    // THEN
    expect(req.cancelled).toBeTruthy();
    expect(comp.isLoading()).toEqual(false);
    expect(comp.professionals()[0]).toEqual(expect.objectContaining({ id: '2c613901-f64b-4441-b80a-f5fb03b8e466' }));
  });

  it('should not fail on resource error state', async () => {
    // GIVEN - first load triggers an HTTP error
    TestBed.tick();
    const errorReq = expectListRequest();
    errorReq.flush('error', { status: 500, statusText: 'Server Error' });
    await vitest.runAllTimersAsync();

    // THEN - loading state was reset and list is empty
    expect(comp.isLoading()).toBe(false);
    expect(comp.professionals()).toEqual([]);

    // WHEN - second load should still work
    comp.load();
    TestBed.tick();
    const successReq = expectListRequest();
    successReq.flush([{ id: '2c613901-f64b-4441-b80a-f5fb03b8e466' }], {
      headers: { link: '<http://localhost/api/foo?page=1&size=20>; rel="next"' },
    });
    await vitest.runAllTimersAsync();

    // THEN - subscription is still alive and second load succeeds
    expect(comp.professionals()[0]).toEqual(expect.objectContaining({ id: '2c613901-f64b-4441-b80a-f5fb03b8e466' }));
  });

  describe('trackId', () => {
    it('should forward to professionalService', () => {
      const entity = { id: '2c613901-f64b-4441-b80a-f5fb03b8e466' };
      vitest.spyOn(service, 'getProfessionalIdentifier');
      const id = comp.trackId(entity);
      expect(service.getProfessionalIdentifier).toHaveBeenCalledWith(entity);
      expect(id).toBe(entity.id);
    });
  });

  it('should calculate the sort attribute for a non-id attribute', () => {
    // WHEN
    comp.navigateToWithComponentValues({ predicate: 'non-existing-column', order: 'asc' });

    // THEN
    expect(routerNavigateSpy).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        queryParams: expect.objectContaining({
          sort: ['non-existing-column,asc'],
        }),
      }),
    );
  });

  it('should load a page', () => {
    // WHEN
    comp.navigateToPage(1);

    // THEN
    expect(routerNavigateSpy).toHaveBeenCalled();
  });

  it('should calculate the sort attribute for an id', () => {
    // WHEN
    TestBed.tick();
    expectListRequest();

    // THEN
    expect(service.professionalsParams()).toMatchObject(expect.objectContaining({ sort: ['id,desc'] }));
  });

  describe('archived filter', () => {
    it('should ask for the un-archived half by default', () => {
      TestBed.tick();
      expectListRequest();

      // notEquals, not equals=false: a record saved before isArchived existed has no value at
      // all, and equals=false would not match it — the whole directory would read as empty.
      expect(service.professionalsParams()).toMatchObject(expect.objectContaining({ 'isArchived.notEquals': true }));
      expect(service.professionalsParams()).not.toMatchObject(expect.objectContaining({ 'isArchived.equals': true }));
    });

    it('should ask for the archived half when the route says so', () => {
      // Consume the load the component issues on init, or verify() in afterEach
      // sees two open requests and the failure reads as a leak rather than this.
      TestBed.tick();
      expectListRequest();

      comp.showArchived.set(true);
      comp.load();
      TestBed.tick();
      expectListRequest();

      expect(service.professionalsParams()).toMatchObject(expect.objectContaining({ 'isArchived.equals': true }));
    });

    it('should carry the archived flag into the URL when toggled on', () => {
      const navigate = vitest.spyOn(comp.router, 'navigate');

      comp.toggleArchived();

      expect(navigate).toHaveBeenCalledWith(['./'], expect.objectContaining({ queryParams: expect.objectContaining({ archived: true }) }));
    });

    it('should clear the archived flag from the URL when toggled off', () => {
      comp.showArchived.set(true);
      const navigate = vitest.spyOn(comp.router, 'navigate');

      comp.toggleArchived();

      expect(navigate).toHaveBeenCalledWith(['./'], expect.objectContaining({ queryParams: expect.objectContaining({ archived: null }) }));
    });
  });

  describe('role tiles', () => {
    it('should cover every role, so no clinician is counted in no tile', () => {
      // The demo draws four tiles and the enum has five — a THERAPIST would sit in the table,
      // be counted nowhere and be reachable by no filter. Listing the enum is what closes that.
      expect(comp.ROLES).toEqual(['CAREGIVER', 'PARAMEDIC', 'THERAPIST', 'NURSE', 'DOCTOR']);
    });

    it('should ask for a headcount and an active count per role, over the unarchived directory', () => {
      TestBed.tick();
      expectListRequest();

      const tileRequests = httpMock.match(r => r.url.endsWith('/api/professionals') && r.params.get('size') === '1');

      // Two per role: total, and total where status is ACTIVE.
      expect(tileRequests).toHaveLength(comp.ROLES.length * 2);
      expect(tileRequests.filter(r => r.request.params.get('status.equals') === 'ACTIVE')).toHaveLength(comp.ROLES.length);
      // Both figures describe the directory the table shows, so they must not move when
      // Show archived is on.
      expect(tileRequests.every(r => r.request.params.get('isArchived.notEquals') === 'true')).toBe(true);
    });

    it('should keep both counts when they land in either order', () => {
      TestBed.tick();
      expectListRequest();

      const forDoctor = httpMock.match(
        r => r.url.endsWith('/api/professionals') && r.params.get('size') === '1' && r.params.get('role.equals') === 'DOCTOR',
      );
      const active = forDoctor.find(r => r.request.params.get('status.equals') === 'ACTIVE')!;
      const total = forDoctor.find(r => r.request.params.get('status.equals') === null)!;

      // Active answers first, deliberately: merging rather than replacing is what stops the
      // second answer wiping the first, and the tile flashing a headcount of zero on the way.
      active.flush([], { headers: { 'X-Total-Count': '1' } });
      total.flush([], { headers: { 'X-Total-Count': '2' } });

      expect(comp.roleCounts()['DOCTOR']).toEqual({ total: 2, active: 1 });
    });

    it('should not reload the tiles when turning a page', () => {
      TestBed.tick();
      expectListRequest();
      flushTiles();

      comp.load();
      TestBed.tick();
      expectListRequest();

      expect(httpMock.match(r => r.url.endsWith('/api/professionals') && r.params.get('size') === '1')).toHaveLength(0);
    });
  });

  describe('filters', () => {
    it('should send role and status to the server rather than filtering a page', () => {
      TestBed.tick();
      expectListRequest();
      flushTiles();

      comp.role.set('NURSE');
      comp.status.set('ACTIVE');
      comp.load();
      TestBed.tick();
      expectListRequest();

      expect(service.professionalsParams()).toMatchObject(expect.objectContaining({ 'role.equals': 'NURSE', 'status.equals': 'ACTIVE' }));
    });

    it('should ignore a role the enum does not have', () => {
      // A hand-edited URL would otherwise reach the api as an unknown enum value, which is a 400 —
      // and the screen would read as broken rather than as unfiltered.
      comp['fillComponentAttributeFromRoute'](convertToParamMap({ role: 'SURGEON' }), {});

      expect(comp.role()).toBeNull();
    });
  });

  describe('the name column the generated screen did not have', () => {
    it('should read the name from the linked profile', () => {
      expect(comp.displayName({ id: 'p1', profile: { id: 'x', firstName: 'Efua', lastName: 'Mensah' } })).toBe('Efua Mensah');
      expect(comp.initials({ id: 'p1', profile: { id: 'x', firstName: 'Efua', lastName: 'Mensah' } })).toBe('EM');
    });

    it('should fall back to the licence number, then the id, rather than showing nothing', () => {
      // The whole finding was that rows read "p1" and "MDC/RN/23-4471" with no name anywhere. A
      // record with no profile still has to identify itself.
      expect(comp.displayName({ id: 'p1', licenceNumber: 'MDC/RN/23-4471' })).toBe('MDC/RN/23-4471');
      expect(comp.displayName({ id: 'p1' })).toBe('p1');
    });

    /**
     * Backlog item 45's rendering, which survived one directory along until 2026-09-07.
     *
     * `displayName` is shielded by `licenceNumber ?? id` and the licence number is required, so the
     * name cell was never the problem. `Professional.profile` is an optional `@DBRef` and nothing
     * requires it, so the **chip** rendered `professional.id.slice(0, 2)` — two hex characters of a
     * Mongo ObjectId, the exact thing the patient screen had it removed for.
     *
     * Asserted as an absence first, so any future fallback that reaches for the id fails here too.
     */
    it('never renders two hex characters of the record id as the initials chip', () => {
      const learned = { id: '68b4f2a19c3d5e7f81a02c44', licenceNumber: 'MDC/RN/23-4471' } as never;

      expect(comp.initials(learned)).not.toBe('68');
      expect(comp.initials(learned)).toBe('—');
      // And the name cell keeps the licence number, which is a readable identifier in a licence
      // directory — this case is about the chip and must not be read as removing that.
      expect(comp.displayName(learned)).toBe('MDC/RN/23-4471');
    });
  });

  /**
   * Backlog item 46: a clinician who registers on hc-professional reaches this service, is stored as
   * a `DirectoryLink` with no local record, and appeared on this screen nowhere at all.
   *
   * The table cannot hold them — there is no `Professional` for `/api/professionals` to return — so
   * this panel is where they are visible, and every case here is about it saying what is true rather
   * than filling a row in.
   */
  describe('the clinicians this console knows about and has no record for', () => {
    /** Reaches `ngOnInit`, answers the table and the tiles, and leaves the panel request open. */
    function initAndFlushTable(): void {
      TestBed.tick();
      expectListRequest().flush([], { headers: { 'X-Total-Count': '0' } });
      flushTiles();
    }

    it('asks the link endpoint for its own source, unlinked only', () => {
      initAndFlushTable();

      const req = httpMock.expectOne(r => r.url.endsWith('/api/directory-links'));
      expect(req.request.params.get('source')).toBe('HC_PROFESSIONAL');
      // Not asking this returns hc-patient's care angels and erased subjects too — links with no
      // local record that are emphatically not clinicians.
      expect(req.request.params.get('unlinked')).toBe('true');
      req.flush([], { headers: { 'X-Total-Count': '0' } });
    });

    /**
     * <b>Named from the login, and the address is not on the screen at all.</b>
     *
     * This asserted the opposite until 2026-09-07 — it expected `k.quartey@abofonsa.care` in the name
     * cell, which was item 46's rule and correct under it. Backlog item 47's contract names `login`
     * as what the console shows and says of `email` that it is "for correlation, not for display";
     * item 43 had already taken the same value out of every log line. The row carries both fields and
     * renders one.
     *
     * The rendered check is the part that matters: `awaitingName` returning the login would still
     * leave the address on screen if some other cell printed it.
     */
    it('names a row from the login and keeps the address off the screen', () => {
      initAndFlushTable();
      flushAwaiting(
        [
          {
            id: 'dl-1',
            source: 'HC_PROFESSIONAL',
            login: 'kquartey',
            email: 'k.quartey@abofonsa.care',
            state: 'DOCUMENTS_SUBMITTED',
          },
        ],
        '1',
      );

      expect(comp.awaiting()).toHaveLength(1);
      expect(comp.awaitingName(comp.awaiting()[0])).toBe('kquartey');

      fixture.detectChanges();
      const rendered = fixture.nativeElement.querySelector('[data-cy="awaitingRow"]').textContent;
      expect(rendered).toContain('kquartey');
      expect(rendered).not.toContain('k.quartey@abofonsa.care');
    });

    /**
     * <b>A link with an address and no login cannot be named, and says so.</b>
     *
     * The inversion of the case above, and the reason it is worth its own case: falling back to the
     * email would satisfy "names a row from the login" on every row that has both. Only a row with
     * one and not the other can tell a preference from a rule.
     */
    it('does not fall back to the address when there is no login', () => {
      initAndFlushTable();
      flushAwaiting([{ id: 'dl-1b', source: 'HC_PROFESSIONAL', email: 'k.quartey@abofonsa.care' }], '1');

      expect(comp.awaitingName(comp.awaiting()[0])).toBeNull();

      fixture.detectChanges();
      const rendered = fixture.nativeElement.querySelector('[data-cy="awaitingRow"]').textContent;
      expect(rendered).not.toContain('k.quartey@abofonsa.care');
    });

    // --- the two-phase contract, backlog item 47 -------------------------------------------------

    /**
     * <b>Both phases in one row, joined by the api on `accountId`.</b>
     *
     * Phase 1 gives `login` and `activated`; phase 2 gives the rest. They arrive on two topics with
     * no ordering between them and the api writes both halves onto one document, so the row reads
     * them off one object — there is no client-side join and there must not be one.
     */
    it('shows both phases in a single row', () => {
      initAndFlushTable();
      flushAwaiting(
        [
          {
            id: 'dl-both',
            source: 'HC_PROFESSIONAL',
            login: 'yasante',
            activated: true,
            profileEventAt: '2026-09-02T14:47:05Z',
            profileComplete: true,
            profileVerified: true,
            profileCreatedDate: '2026-08-19T11:30:00Z',
            profileModifiedDate: '2026-09-02T14:47:00Z',
            profileLastModifiedBy: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          },
        ],
        '1',
      );
      fixture.detectChanges();

      const row = fixture.nativeElement.querySelector('[data-cy="awaitingRow"]');
      expect(row.querySelector('[data-cy="awaitingActivated"]').textContent).toContain('hcAdminApp.directoryProfessional.awaiting.yes');
      expect(row.querySelector('[data-cy="awaitingVerified"]').textContent).toContain('hcAdminApp.directoryProfessional.awaiting.yes');
      expect(row.querySelector('[data-cy="awaitingComplete"]').textContent).toContain('hcAdminApp.directoryProfessional.awaiting.yes');
      expect(row.querySelector('[data-cy="awaitingCreated"]').textContent).toContain('19 Aug 2026');
      expect(row.querySelector('[data-cy="awaitingModified"]').textContent).toContain('2 Sep 2026');
      expect(row.querySelector('[data-cy="awaitingLastModifiedBy"]').textContent).toContain('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    });

    /**
     * <b>Empty is not false, which is the whole of the display rule.</b>
     *
     * A clinician with a registration and no `ProfileStatus` has `verified` and `complete`
     * <em>unknown</em>. Rendering either as "No" asserts something about a person from the absence of
     * a message — items 27(a) and 46's prohibition one column along — and it is the failure this
     * table is likeliest to ship, because "No" is what a falsy check produces without anyone
     * choosing it.
     */
    it('renders an unreported profile status as unknown and never as no', () => {
      initAndFlushTable();
      flushAwaiting([{ id: 'dl-phase1', source: 'HC_PROFESSIONAL', login: 'kquartey', activated: false }], '1');
      fixture.detectChanges();

      const row = fixture.nativeElement.querySelector('[data-cy="awaitingRow"]');
      expect(comp.hasProfile(comp.awaiting()[0])).toBe(false);
      expect(row.querySelector('[data-cy="awaitingVerified"]').textContent).toContain('hcAdminApp.directoryProfessional.awaiting.unknown');
      expect(row.querySelector('[data-cy="awaitingVerified"]').textContent).not.toContain('hcAdminApp.directoryProfessional.awaiting.no');
      expect(row.querySelector('[data-cy="awaitingComplete"]').textContent).toContain('hcAdminApp.directoryProfessional.awaiting.unknown');
      // And the account's OWN state, which is a fact and does render as No — the pair is what shows
      // the two are not being conflated.
      expect(row.querySelector('[data-cy="awaitingActivated"]').textContent).toContain('hcAdminApp.directoryProfessional.awaiting.no');
    });

    /**
     * A profile reported as incomplete renders as "No", which is the other half of that pair.
     *
     * Without it, "unknown is never no" would be satisfied by a table that never says no at all.
     */
    it('renders a profile reported incomplete as no', () => {
      initAndFlushTable();
      flushAwaiting(
        [
          {
            id: 'dl-incomplete',
            source: 'HC_PROFESSIONAL',
            login: 'kquartey',
            profileEventAt: '2026-09-02T14:47:05Z',
            profileComplete: false,
            profileVerified: false,
          },
        ],
        '1',
      );
      fixture.detectChanges();

      const row = fixture.nativeElement.querySelector('[data-cy="awaitingRow"]');
      expect(row.querySelector('[data-cy="awaitingComplete"]').textContent).toContain('hcAdminApp.directoryProfessional.awaiting.no');
      expect(row.querySelector('[data-cy="awaitingComplete"]').textContent).not.toContain(
        'hcAdminApp.directoryProfessional.awaiting.unknown',
      );
      expect(row.querySelector('[data-cy="awaitingVerified"]').textContent).toContain('hcAdminApp.directoryProfessional.awaiting.no');
    });

    /**
     * <b>Activation is never derived, in either direction.</b>
     *
     * A clinician can be activated with no profile at all, and can complete a verified profile on an
     * account somebody later deactivates. Both are asserted, because an implementation that read
     * activation off the profile would pass whichever one was written alone.
     */
    it('does not derive activation from the profile status', () => {
      initAndFlushTable();
      flushAwaiting(
        [
          { id: 'dl-a', source: 'HC_PROFESSIONAL', login: 'active-no-profile', activated: true },
          {
            id: 'dl-b',
            source: 'HC_PROFESSIONAL',
            login: 'complete-but-off',
            activated: false,
            profileEventAt: '2026-09-02T14:47:05Z',
            profileComplete: true,
            profileVerified: true,
          },
          { id: 'dl-c', source: 'HC_PROFESSIONAL', login: 'nobody-has-said' },
        ],
        '3',
      );
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll('[data-cy="awaitingRow"]');
      expect(rows[0].querySelector('[data-cy="awaitingActivated"]').textContent).toContain('hcAdminApp.directoryProfessional.awaiting.yes');
      expect(rows[1].querySelector('[data-cy="awaitingActivated"]').textContent).toContain('hcAdminApp.directoryProfessional.awaiting.no');
      expect(rows[2].querySelector('[data-cy="awaitingActivated"]').textContent).toContain(
        'hcAdminApp.directoryProfessional.awaiting.unknown',
      );
    });

    /**
     * <b>The dates say whose they are, per row, because the column falls back.</b>
     *
     * Both phases carry a created/modified pair. The profile's is shown when a `ProfileStatus` has
     * arrived and the account's when it has not — a clinician with no profile still has a registered-on
     * date worth showing. Showing the account's under a heading a reader takes for the profile's is
     * the quiet wrong answer, so the source is on the row.
     */
    it('says which pair of dates a row is showing', () => {
      initAndFlushTable();
      flushAwaiting(
        [
          {
            id: 'dl-acct',
            source: 'HC_PROFESSIONAL',
            login: 'kquartey',
            accountCreatedDate: '2026-08-19T10:04:00Z',
            accountModifiedDate: '2026-09-01T09:20:00Z',
          },
          {
            id: 'dl-prof',
            source: 'HC_PROFESSIONAL',
            login: 'yasante',
            accountCreatedDate: '2026-08-19T10:04:00Z',
            profileEventAt: '2026-09-02T14:47:05Z',
            profileCreatedDate: '2026-08-25T11:30:00Z',
            profileModifiedDate: '2026-09-02T14:47:00Z',
          },
        ],
        '2',
      );
      fixture.detectChanges();

      expect(comp.awaitingDates(comp.awaiting()[0]).source).toBe('account');
      expect(comp.awaitingDates(comp.awaiting()[1]).source).toBe('profile');

      const rows = fixture.nativeElement.querySelectorAll('[data-cy="awaitingRow"]');
      expect(rows[0].querySelector('[data-cy="awaitingCreated"]').textContent).toContain('19 Aug 2026');
      expect(rows[0].querySelector('[data-cy="awaitingCreated"]').textContent).toContain(
        'hcAdminApp.directoryProfessional.awaiting.dateSource.account',
      );
      // The profile's own date, NOT the account's, on a row that has both.
      expect(rows[1].querySelector('[data-cy="awaitingCreated"]').textContent).toContain('25 Aug 2026');
      expect(rows[1].querySelector('[data-cy="awaitingCreated"]').textContent).not.toContain('19 Aug 2026');
      expect(rows[1].querySelector('[data-cy="awaitingCreated"]').textContent).toContain(
        'hcAdminApp.directoryProfessional.awaiting.dateSource.profile',
      );
    });

    /**
     * <b>`firstSeenAt` and `lastEventAt` are never rendered as the account's dates.</b>
     *
     * They are when <em>this console's service</em> saw something — they move when the collection is
     * rebuilt from a backfill — so using either to fill an empty "created" cell would put a plausible
     * wrong date on the screen, which is item 45's defect with a timestamp instead of an id. The row
     * carries both and shows neither.
     */
    it('does not fall back to when this service first saw the account', () => {
      initAndFlushTable();
      flushAwaiting(
        [
          {
            id: 'dl-seen',
            source: 'HC_PROFESSIONAL',
            login: 'kquartey',
            firstSeenAt: '2026-09-06T09:47:00Z',
            lastEventAt: '2026-09-06T09:47:00Z',
          },
        ],
        '1',
      );
      fixture.detectChanges();

      const row = fixture.nativeElement.querySelector('[data-cy="awaitingRow"]');
      expect(row.querySelector('[data-cy="awaitingCreated"]').textContent).toContain('hcAdminApp.directoryProfessional.awaiting.unknown');
      expect(row.textContent).not.toContain('6 Sep 2026');
    });

    /**
     * <b>Phase 2 alone renders, keyed on nothing but the accountId.</b>
     *
     * A profile for an account this console has not been told about is not an error and must not be
     * held back until a name arrives: the topics are unordered and both groups read from the earliest
     * offset, so on a backfill this is ordinary. The row says its identity is not on file and shows
     * the profile it does have.
     */
    it('renders a profile that arrived before its account', () => {
      initAndFlushTable();
      flushAwaiting(
        [
          {
            id: 'dl-profile-only',
            source: 'HC_PROFESSIONAL',
            externalKey: '5e0b9a63-1d47-4c8a-93be-71ca8d6f2b05',
            profileEventAt: '2026-09-07T05:02:00Z',
            profileComplete: false,
            profileVerified: false,
            profileCreatedDate: '2026-09-07T05:01:30Z',
          },
        ],
        '1',
      );
      fixture.detectChanges();

      const row = fixture.nativeElement.querySelector('[data-cy="awaitingRow"]');
      expect(row.textContent).toContain('hcAdminApp.directoryProfessional.awaiting.unidentified');
      expect(row.textContent).not.toContain('5e0b9a63');
      expect(row.querySelector('[data-cy="awaitingActivated"]').textContent).toContain('hcAdminApp.directoryProfessional.awaiting.unknown');
      expect(row.querySelector('[data-cy="awaitingComplete"]').textContent).toContain('hcAdminApp.directoryProfessional.awaiting.no');
      expect(row.querySelector('[data-cy="awaitingCreated"]').textContent).toContain(
        'hcAdminApp.directoryProfessional.awaiting.dateSource.profile',
      );
    });

    /**
     * The state an `onboarding.state` frame leaves: an accountId and nothing else.
     *
     * The key is a UUID, and printing it would be item 45's defect — an opaque identifier where a
     * name goes — in a new panel on the day the panel was written.
     */
    it('says an unidentifiable row is unidentifiable rather than printing the accountId', () => {
      initAndFlushTable();
      flushAwaiting([{ id: 'dl-2', source: 'HC_PROFESSIONAL', externalKey: 'b7d21c04-9e63-4f18-8a77-2c5e9f04ab32' }], '1');

      const row = comp.awaiting()[0];
      expect(comp.awaitingName(row)).toBeNull();
      expect(comp.awaitingInitials(row)).toBe('—');
      expect(comp.awaitingInitials(row)).not.toBe('B7');
    });

    /**
     * A clinician who has just registered has no onboarding state, and the row must not invent one.
     *
     * The case backlog item 46 was reported for. `registration.created` carries no `state` field;
     * the api filled it with the event type until 2026-09-07, so this row rendered
     * "no record in this directory · registration.created" — a wire identifier where a status goes.
     * The suffix is now simply absent, which the template already handled and nothing exercised.
     */
    it('renders no onboarding state for a link that reports none', () => {
      initAndFlushTable();
      flushAwaiting([{ id: 'dl-3', source: 'HC_PROFESSIONAL', email: 'a.owusu@abofonsa.care', login: 'aowusu' }], '1');

      const row = comp.awaiting()[0];
      expect(row.state ?? null).toBeNull();
      fixture.detectChanges();
      const rendered = fixture.nativeElement.querySelector('[data-cy="awaitingRow"]').textContent;
      expect(rendered).toContain('aowusu');
      expect(rendered).not.toContain('registration.created');
      expect(rendered).not.toContain('·');
    });

    /**
     * A single-word login is one letter, and that is the answer rather than a shortfall.
     *
     * `kquartey` cannot be split into a forename and a surname by anything this console knows, so
     * the chip is `K`. Pinned because `awaitingInitials` reads as though it should produce two and
     * "fixing" it would mean taking the second character of one word — `Kq`, a monogram of one name
     * pretending to be a monogram of two, which is the guessing this panel exists to refuse.
     */
    it('makes a one-letter monogram from a login that is one word', () => {
      initAndFlushTable();
      flushAwaiting([{ id: 'dl-4', source: 'HC_PROFESSIONAL', login: 'kquartey' }], '1');

      expect(comp.awaitingInitials(comp.awaiting()[0])).toBe('K');
    });

    /**
     * "And N more" is a real number.
     *
     * The panel asks for five rows; counting what arrived would report five however many clinicians
     * are waiting, which is the truncated-list failure the approval card was fixed for.
     */
    it('reports the overflow from the server total, not from the rows it received', () => {
      initAndFlushTable();
      flushAwaiting([{ id: 'dl-1' }, { id: 'dl-2' }], '9');

      expect(comp.awaitingTotal()).toBe(9);
      expect(comp.awaitingOverflow()).toBe(7);
    });

    /**
     * Hidden under a filter and under Show archived.
     *
     * These rows carry no role, no verification, no status and no archived flag — nothing an event
     * publishes — so leaving the panel up beside a `role=DOCTOR` table would assert they are doctors.
     * That is the fabrication this whole change refuses to make, and it would be made by omission.
     */
    it('does not claim a filtered directory contains them', () => {
      initAndFlushTable();
      flushAwaiting([{ id: 'dl-1', email: 'k.quartey@abofonsa.care' }], '1');
      expect(comp.showAwaiting()).toBe(true);

      comp.role.set('DOCTOR');
      expect(comp.showAwaiting()).toBe(false);

      comp.role.set(null);
      comp.showArchived.set(true);
      expect(comp.showAwaiting()).toBe(false);
    });

    /** A failed lookup empties the panel; it does not leave stale rows under a live heading. */
    it('shows nothing when the lookup fails', () => {
      initAndFlushTable();
      flushAwaiting([{ id: 'dl-1', email: 'k.quartey@abofonsa.care' }], '1');
      expect(comp.awaiting()).toHaveLength(1);

      comp.refresh();
      TestBed.tick();
      expectListRequest();
      flushTiles();
      httpMock.expectOne(r => r.url.endsWith('/api/directory-links')).error(new ProgressEvent('network'));

      expect(comp.awaiting()).toEqual([]);
      expect(comp.awaitingTotal()).toBe(0);
    });

    /**
     * Refresh re-reads it, and a page turn does not.
     *
     * This is the one list on the screen that changes without anybody here doing anything — somebody
     * registers on another stack — so Refresh must ask again. Paging must not: it describes the whole
     * directory, like the role tiles beside it.
     */
    it('is re-read on Refresh and left alone on a page turn', () => {
      initAndFlushTable();
      flushAwaiting();

      comp.load();
      TestBed.tick();
      expectListRequest();
      httpMock.expectNone(r => r.url.endsWith('/api/directory-links'));

      comp.refresh();
      TestBed.tick();
      expectListRequest();
      flushTiles();
      httpMock.expectOne(r => r.url.endsWith('/api/directory-links')).flush([], { headers: { 'X-Total-Count': '0' } });
    });
  });
});
