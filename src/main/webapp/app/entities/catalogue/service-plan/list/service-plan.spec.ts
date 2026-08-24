import { MockInstance, afterEach, beforeEach, describe, expect, it, vitest } from 'vitest';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, inject } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import {
  faCheck,
  faEye,
  faPencilAlt,
  faPlus,
  faSort,
  faSortDown,
  faSortUp,
  faSync,
  faTimes,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap/modal';
import { provideTranslateService } from '@ngx-translate/core';
import { Subject, of } from 'rxjs';

import { ServicePlanService } from '../service/service-plan.service';
import { sampleWithRequiredData } from '../service-plan.test-samples';

import { ServicePlan } from './service-plan';

vitest.useFakeTimers();

describe('ServicePlan Management Component', () => {
  let httpMock: HttpTestingController;
  let comp: ServicePlan;
  let fixture: ComponentFixture<ServicePlan>;
  let service: ServicePlanService;
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

    fixture = TestBed.createComponent(ServicePlan);
    comp = fixture.componentInstance;
    service = TestBed.inject(ServicePlanService);
    routerNavigateSpy = vitest.spyOn(comp.router, 'navigate');

    const library = TestBed.inject(FaIconLibrary);
    library.addIcons(faCheck, faEye, faPencilAlt, faPlus, faSort, faSortDown, faSortUp, faSync, faTimes, faUsers);
    httpMock = TestBed.inject(HttpTestingController);
  });

  /**
   * The card list's own request.
   *
   * `ngOnInit` also loads the mix, and each plan that arrives loads its feature list, so a bare
   * `expectOne({ method: 'GET' })` now matches several requests and fails.
   */
  function expectListRequest(): TestRequest {
    return httpMock.expectOne(req => req.url.endsWith('/api/service-plans'));
  }

  /**
   * Answer the mix and the per-card feature requests.
   *
   * They are not what most of these tests are about, but an unanswered request makes
   * `httpMock.verify()` fail in `afterEach` — so every test would report "open requests" instead of
   * whatever it was actually asserting.
   */
  function flushBoard(): void {
    for (const req of httpMock.match(r => r.url.endsWith('/api/service-plans/summary'))) {
      req.flush({ totalSubscribers: 0, mix: [] });
    }
    for (const req of httpMock.match(r => r.url.endsWith('/api/plan-features'))) {
      req.flush([], { headers: { 'X-Total-Count': '0' } });
    }
  }

  afterEach(() => {
    flushBoard();
    TestBed.resetTestingModule();
    httpMock.verify();
  });

  it('should call load all on init', async () => {
    // WHEN
    TestBed.tick();
    const req = expectListRequest();
    req.flush([{ id: 'b5e0e540-7a57-41f1-8c7d-7faaae191154' }], {
      headers: { link: '<http://localhost/api/foo?page=1&size=20>; rel="next"' },
    });
    await vitest.runAllTimersAsync();

    // THEN
    expect(comp.isLoading()).toEqual(false);
    expect(comp.servicePlans()[0]).toEqual(expect.objectContaining({ id: 'b5e0e540-7a57-41f1-8c7d-7faaae191154' }));
  });

  /**
   * The list asks the server for a page, and takes its total from the response.
   *
   * `/api/service-plans` returned the whole collection until 2026-08-17, and this screen rendered
   * all of it with no pager. Paginating the endpoint without this half would have been the worse
   * failure of the two: the screen would show the first 20 rows, report nothing, and offer no way
   * to reach row 21.
   */
  it('should request a page and read the total from the header', async () => {
    TestBed.tick();
    const req = expectListRequest();
    req.flush([{ id: 'b5e0e540-7a57-41f1-8c7d-7faaae191154' }], { headers: { 'X-Total-Count': '57' } });
    await vitest.runAllTimersAsync();

    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('20');
    expect(comp.totalItems()).toBe(57);
  });

  it('should navigate when a page is chosen', () => {
    comp.navigateToPage(3);

    expect(routerNavigateSpy).toHaveBeenCalledWith(
      ['./'],
      expect.objectContaining({ queryParams: expect.objectContaining({ page: 3, size: 20 }) }),
    );
  });

  describe('trackId', () => {
    it('should forward to servicePlanService', () => {
      const entity = { id: 'b5e0e540-7a57-41f1-8c7d-7faaae191154' };
      vitest.spyOn(service, 'getServicePlanIdentifier');
      const id = comp.trackId(entity);
      expect(service.getServicePlanIdentifier).toHaveBeenCalledWith(entity);
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

  it('should calculate the sort attribute for an id', () => {
    // WHEN
    TestBed.tick();
    expectListRequest();

    // THEN
    expect(service.servicePlansParams()).toMatchObject(expect.objectContaining({ sort: ['id,desc'] }));
  });

  describe('the plan mix', () => {
    it('should take subscribers and share from the server, not from the plan rows', () => {
      TestBed.tick();
      // `subscriberCount` was deleted from the model on 2026-08-24, and this row still sends one —
      // deliberately, and deliberately wrong: 41 against a directory of four. The field is gone from
      // the interface, but a server or a stale document could still put it on the wire, and the
      // assertion below is that the screen reads the mix regardless of what arrives beside it.
      expectListRequest().flush([{ id: 'pl1', name: 'Bridge Essential', monthlyPrice: 320, subscriberCount: 41 }]);

      httpMock
        .expectOne(r => r.url.endsWith('/api/service-plans/summary'))
        .flush({
          totalSubscribers: 6,
          mix: [
            {
              planId: 'pl1',
              name: 'Bridge Essential',
              monthlyPrice: 320,
              currency: 'GHS',
              subscribers: 4,
              share: 66.7,
              monthlyRevenue: 1280,
            },
          ],
        });

      expect(comp.mixFor('pl1')?.subscribers).toBe(4);
      expect(comp.mixFor('pl1')?.share).toBe(66.7);
      // The denormalised counter is not what reaches the screen.
      expect(comp.mixFor('pl1')?.subscribers).not.toBe(41);
    });

    it('should total revenue from the rows the server sent', () => {
      TestBed.tick();
      expectListRequest().flush([{ id: 'pl1' }, { id: 'pl2' }]);

      httpMock
        .expectOne(r => r.url.endsWith('/api/service-plans/summary'))
        .flush({
          totalSubscribers: 7,
          mix: [
            { planId: 'pl1', name: 'A', monthlyPrice: 320, currency: 'GHS', subscribers: 4, share: 57.1, monthlyRevenue: 1280 },
            { planId: 'pl2', name: 'B', monthlyPrice: 680, currency: 'GHS', subscribers: 3, share: 42.9, monthlyRevenue: 2040 },
          ],
        });

      // Summed from the server's rows so the total agrees with the shares above it by construction.
      expect(comp.totalRevenue()).toBe(3320);
    });

    /**
     * The distinction the whole screen turns on.
     *
     * A failed summary leaves every computed cell null, which the template renders as "—". Zeros
     * would be the console asserting that no plan has any subscribers — a claim, not an absence —
     * and `deploy/TODO.md` §5 records that a zero on screen being trustworthy is what made
     * verification possible without a token.
     */
    it('should leave the mix null when it fails rather than showing zeros', () => {
      TestBed.tick();
      expectListRequest().flush([{ id: 'pl1' }]);

      httpMock.expectOne(r => r.url.endsWith('/api/service-plans/summary')).flush('nope', { status: 500, statusText: 'Server Error' });

      expect(comp.summary()).toBeNull();
      expect(comp.mixFor('pl1')).toBeNull();
      expect(comp.totalRevenue()).toBeNull();
    });

    it('should distinguish an undefined share from a zero one', () => {
      TestBed.tick();
      expectListRequest().flush([{ id: 'pl1' }]);

      // Nobody subscribed to anything: a share of an empty directory is undefined, and the server
      // says so with null. Revenue genuinely is nought.
      httpMock
        .expectOne(r => r.url.endsWith('/api/service-plans/summary'))
        .flush({
          totalSubscribers: 0,
          mix: [{ planId: 'pl1', name: 'A', monthlyPrice: 320, currency: 'GHS', subscribers: 0, share: null, monthlyRevenue: 0 }],
        });

      expect(comp.mixFor('pl1')?.share).toBeNull();
      expect(comp.mixFor('pl1')?.monthlyRevenue).toBe(0);
      // The summary itself arrived, so this is "answered zero" rather than "no answer".
      expect(comp.summary()).not.toBeNull();
    });
  });

  /**
   * The feature requests are fired by the effect that receives the loaded plans, not by `ngOnInit`,
   * so they do not exist until the list response has propagated through the `httpResource` signal.
   * Every test below has to let the timers run before matching them, or it matches nothing and
   * reports it as "the request was never made".
   */
  describe('feature lists', () => {
    it('should fetch each card its own features rather than one page for all of them', async () => {
      TestBed.tick();
      expectListRequest().flush([{ id: 'pl1' }, { id: 'pl2' }]);
      await vitest.runAllTimersAsync();

      const featureRequests = httpMock.match(r => r.url.endsWith('/api/plan-features'));

      // One per card, each filtered server-side. Reading a single unfiltered page works only while
      // the catalogue of features is smaller than a page, and drops a bullet silently after that.
      expect(featureRequests).toHaveLength(2);
      expect(featureRequests.map(r => r.request.params.get('planId.equals')).sort()).toEqual(['pl1', 'pl2']);
    });

    it('should order features by position', async () => {
      TestBed.tick();
      expectListRequest().flush([{ id: 'pl1' }]);
      await vitest.runAllTimersAsync();

      httpMock
        .expectOne(r => r.url.endsWith('/api/plan-features'))
        .flush([
          { id: 'pf-3', label: 'third', position: 2 },
          { id: 'pf-1', label: 'first', position: 0 },
          { id: 'pf-2', label: 'second', position: 1 },
        ]);

      expect(comp.features()['pl1'].map(f => f.label)).toEqual(['first', 'second', 'third']);
    });

    /**
     * A failed feature request leaves the key absent, so the card says the list is missing.
     *
     * An empty array would render as a plan that includes nothing, which is a different and worse
     * statement about something being sold to a patient.
     */
    it('should leave the list absent rather than empty when it fails', async () => {
      TestBed.tick();
      expectListRequest().flush([{ id: 'pl1' }]);
      await vitest.runAllTimersAsync();

      httpMock.expectOne(r => r.url.endsWith('/api/plan-features')).flush('nope', { status: 500, statusText: 'Server Error' });

      expect(comp.features()['pl1']).toBeUndefined();
    });
  });

  describe('delete', () => {
    let ngbModal: NgbModal;
    let deleteModalMock: any;

    beforeEach(() => {
      deleteModalMock = { componentInstance: {}, closed: new Subject() };
      // NgbModal is not a singleton using TestBed.inject.
      // ngbModal = TestBed.inject(NgbModal);
      ngbModal = (comp as any).modalService;
      vitest.spyOn(ngbModal, 'open').mockReturnValue(deleteModalMock);
    });

    it('on confirm should reload both the cards and the mix', inject([], () => {
      // GIVEN
      vitest.spyOn(comp, 'load');
      vitest.spyOn(comp, 'refresh');

      // WHEN
      comp.delete(sampleWithRequiredData);
      deleteModalMock.closed.next('deleted');

      // THEN — a stale mix after a deletion would leave shares summing to more than 100.
      expect(ngbModal.open).toHaveBeenCalled();
      expect(comp.refresh).toHaveBeenCalled();
      expect(comp.load).toHaveBeenCalled();
    }));

    it('on dismiss should call load', inject([], () => {
      // GIVEN
      vitest.spyOn(comp, 'load');

      // WHEN
      comp.delete(sampleWithRequiredData);
      deleteModalMock.closed.next();

      // THEN
      expect(ngbModal.open).toHaveBeenCalled();
      expect(comp.load).not.toHaveBeenCalled();
    }));
  });
});
