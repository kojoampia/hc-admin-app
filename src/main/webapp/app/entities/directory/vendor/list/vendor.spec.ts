import { MockInstance, afterEach, beforeEach, describe, expect, it, vitest } from 'vitest';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, inject } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import {
  faBoxArchive,
  faEye,
  faFileLines,
  faLayerGroup,
  faList,
  faMoneyBill,
  faPencilAlt,
  faPlus,
  faSort,
  faSortDown,
  faSortUp,
  faSync,
  faTimes,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { provideTranslateService } from '@ngx-translate/core';
import { Subject, of } from 'rxjs';

import { VendorService } from '../service/vendor.service';
import { sampleWithRequiredData } from '../vendor.test-samples';

import { Vendor } from './vendor';

vitest.useFakeTimers();

describe('Vendor Management Component', () => {
  let httpMock: HttpTestingController;
  let comp: Vendor;
  let fixture: ComponentFixture<Vendor>;
  let service: VendorService;
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

    fixture = TestBed.createComponent(Vendor);
    comp = fixture.componentInstance;
    service = TestBed.inject(VendorService);
    routerNavigateSpy = vitest.spyOn(comp.router, 'navigate');

    const library = TestBed.inject(FaIconLibrary);
    // The four tile icons go in alongside the table's: an icon missing from the library throws at
    // render, so every test in the file fails on the tiles rather than on what it asserts.
    library.addIcons(
      faBoxArchive,
      faEye,
      faFileLines,
      faLayerGroup,
      faList,
      faMoneyBill,
      faPencilAlt,
      faPlus,
      faSort,
      faSortDown,
      faSortUp,
      faSync,
      faTimes,
      faTriangleExclamation,
    );
    httpMock = TestBed.inject(HttpTestingController);
  });

  /**
   * The table's own request.
   *
   * `ngOnInit` loads the tiles as well — one GET for the summary and one per status — so a bare
   * `expectOne({ method: 'GET' })` now matches seven requests and fails.
   *
   * Discriminated on page size, not on the absence of `status.equals`: once a status tile is
   * selected the list request carries that parameter too, and only the tiles ask for `size=1`.
   */
  function expectListRequest(): TestRequest {
    return httpMock.expectOne(req => req.url.endsWith('/api/vendors') && req.params.get('size') !== '1');
  }

  /**
   * Answer the tile requests.
   *
   * They are not what most of these tests are about, but an unanswered request makes
   * `httpMock.verify()` fail in `afterEach` — so every test would report "open requests" instead of
   * whatever it was actually asserting.
   */
  function flushTiles(): void {
    for (const req of httpMock.match(r => r.url.endsWith('/api/vendors/summary'))) {
      req.flush({ spendToDate: 0, categoryCount: 0, activeContracts: 0, underReview: 0 });
    }
    for (const req of httpMock.match(r => r.url.endsWith('/api/vendors') && r.params.get('size') === '1')) {
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
    req.flush([{ id: '478690b5-4f10-43b0-b67e-1148991a8421' }], {
      headers: { link: '<http://localhost/api/foo?page=1&size=20>; rel="next"' },
    });
    await vitest.runAllTimersAsync();

    // THEN
    expect(comp.isLoading()).toEqual(false);
    expect(comp.vendors()[0]).toEqual(expect.objectContaining({ id: '478690b5-4f10-43b0-b67e-1148991a8421' }));
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
    req2.flush([{ id: '478690b5-4f10-43b0-b67e-1148991a8421' }], {
      headers: { link: '<http://localhost/api/foo?page=1&size=20>; rel="next"' },
    });
    await vitest.runAllTimersAsync();

    // THEN
    expect(req.cancelled).toBeTruthy();
    expect(comp.isLoading()).toEqual(false);
    expect(comp.vendors()[0]).toEqual(expect.objectContaining({ id: '478690b5-4f10-43b0-b67e-1148991a8421' }));
  });

  it('should not fail on resource error state', async () => {
    // GIVEN - first load triggers an HTTP error
    TestBed.tick();
    const errorReq = expectListRequest();
    errorReq.flush('error', { status: 500, statusText: 'Server Error' });
    await vitest.runAllTimersAsync();

    // THEN - loading state was reset and list is empty
    expect(comp.isLoading()).toBe(false);
    expect(comp.vendors()).toEqual([]);

    // WHEN - second load should still work
    comp.load();
    TestBed.tick();
    const successReq = expectListRequest();
    successReq.flush([{ id: '478690b5-4f10-43b0-b67e-1148991a8421' }], {
      headers: { link: '<http://localhost/api/foo?page=1&size=20>; rel="next"' },
    });
    await vitest.runAllTimersAsync();

    // THEN - subscription is still alive and second load succeeds
    expect(comp.vendors()[0]).toEqual(expect.objectContaining({ id: '478690b5-4f10-43b0-b67e-1148991a8421' }));
  });

  describe('trackId', () => {
    it('should forward to vendorService', () => {
      const entity = { id: '478690b5-4f10-43b0-b67e-1148991a8421' };
      vitest.spyOn(service, 'getVendorIdentifier');
      const id = comp.trackId(entity);
      expect(service.getVendorIdentifier).toHaveBeenCalledWith(entity);
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
    expect(service.vendorsParams()).toMatchObject(expect.objectContaining({ sort: ['id,desc'] }));
  });

  describe('archived filter', () => {
    it('should ask for the un-archived half by default', () => {
      TestBed.tick();
      expectListRequest();

      // notEquals, not equals=false: a record saved before isArchived existed has no value at
      // all, and equals=false would not match it — the whole directory would read as empty.
      expect(service.vendorsParams()).toMatchObject(expect.objectContaining({ 'isArchived.notEquals': true }));
      expect(service.vendorsParams()).not.toMatchObject(expect.objectContaining({ 'isArchived.equals': true }));
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

      expect(service.vendorsParams()).toMatchObject(expect.objectContaining({ 'isArchived.equals': true }));
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

  describe('tiles', () => {
    it('should take the two computed figures from the server, not from the rows on screen', () => {
      TestBed.tick();
      expectListRequest();

      httpMock
        .expectOne(r => r.url.endsWith('/api/vendors/summary'))
        .flush({ spendToDate: 669400, categoryCount: 8, activeContracts: 7, underReview: 2 });

      // The point of the endpoint: a sum and a distinct count over the whole collection, neither of
      // which a page of rows can produce.
      expect(comp.summary()?.spendToDate).toBe(669400);
      expect(comp.summary()?.categoryCount).toBe(8);
    });

    it('should leave the summary null when it fails rather than showing zeros', () => {
      TestBed.tick();
      expectListRequest();

      httpMock.expectOne(r => r.url.endsWith('/api/vendors/summary')).flush('nope', { status: 500, statusText: 'Server Error' });

      // "—" and "0" are different claims. A failed request must not be reported as "no spend".
      expect(comp.summary()).toBeNull();
    });

    it('should count each status from X-Total-Count over the unarchived directory', () => {
      TestBed.tick();
      expectListRequest();

      const counts = httpMock.match(r => r.url.endsWith('/api/vendors') && r.params.get('size') === '1');

      // One per status, and every one of them scoped to the unarchived half — the tiles describe
      // the directory the table shows, so they must not move when Show archived is on.
      expect(counts).toHaveLength(comp.STATUSES.length);
      expect(counts.every(r => r.request.params.get('isArchived.notEquals') === 'true')).toBe(true);

      counts[0].flush([], { headers: { 'X-Total-Count': '9' } });
      expect(comp.counts()[counts[0].request.params.get('status.equals')!]).toBe(9);
    });

    it('should cover every status, so no vendor is reachable through no tile', () => {
      // The demo draws four tiles against five AccountStatus values, which leaves a suspended or
      // on-leave vendor counted nowhere. Listing the enum is what closes that.
      expect(comp.STATUSES).toEqual(['ACTIVE', 'PENDING', 'SUSPENDED', 'ON_LEAVE', 'UNDER_REVIEW']);
    });

    it('should not reload the tiles when turning a page', () => {
      TestBed.tick();
      expectListRequest();
      flushTiles();

      comp.load();
      TestBed.tick();
      expectListRequest();

      // Turning a page repaints the table, not the six numbers above it.
      expect(httpMock.match(r => r.url.endsWith('/api/vendors/summary'))).toHaveLength(0);
    });
  });

  describe('status filter', () => {
    it('should send the selected status to the server', () => {
      TestBed.tick();
      expectListRequest();
      flushTiles();

      comp.status.set('SUSPENDED');
      comp.load();
      TestBed.tick();
      expectListRequest();

      // Server-side, not a filter over the current page: filtering a slice would search 20 rows
      // and report it as though it had searched the directory.
      expect(service.vendorsParams()).toMatchObject(expect.objectContaining({ 'status.equals': 'SUSPENDED' }));
    });

    it('should ignore a status the enum does not have', () => {
      // A hand-edited URL would otherwise reach the api as an unknown enum value, which is a 400 —
      // and the screen would read as broken rather than as unfiltered.
      // Bracket access because the method is protected; the guard is what is under test and
      // widening its visibility for a test would be the wrong trade.
      comp['fillComponentAttributeFromRoute'](convertToParamMap({ status: 'NONSENSE' }), {});

      expect(comp.status()).toBeNull();
    });

    it('should drop the filter when the selected tile is chosen again', () => {
      comp.status.set('ACTIVE');
      const navigate = vitest.spyOn(comp.router, 'navigate');

      comp.toggleStatus('ACTIVE');

      expect(navigate).toHaveBeenCalledWith(['./'], expect.objectContaining({ queryParams: expect.objectContaining({ status: null }) }));
    });
  });
});
