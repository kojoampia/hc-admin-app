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

  afterEach(() => {
    flushTiles();
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
  });
});
