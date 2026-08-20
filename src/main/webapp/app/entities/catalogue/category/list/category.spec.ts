import { MockInstance, afterEach, beforeEach, describe, expect, it, vitest } from 'vitest';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, inject } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faEye, faPencilAlt, faPlus, faSort, faSortDown, faSortUp, faSync, faTimes } from '@fortawesome/free-solid-svg-icons';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap/modal';
import { provideTranslateService } from '@ngx-translate/core';
import { Subject, of } from 'rxjs';

import { sampleWithRequiredData } from '../category.test-samples';
import { CategoryService } from '../service/category.service';

import { Category } from './category';

vitest.useFakeTimers();

describe('Category Management Component', () => {
  let httpMock: HttpTestingController;
  let comp: Category;
  let fixture: ComponentFixture<Category>;
  let service: CategoryService;
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

    fixture = TestBed.createComponent(Category);
    comp = fixture.componentInstance;
    service = TestBed.inject(CategoryService);
    routerNavigateSpy = vitest.spyOn(comp.router, 'navigate');

    const library = TestBed.inject(FaIconLibrary);
    library.addIcons(faEye, faPencilAlt, faPlus, faSort, faSortDown, faSortUp, faSync, faTimes);
    httpMock = TestBed.inject(HttpTestingController);
  });

  /**
   * The card list's own request.
   *
   * `ngOnInit` also loads the activity counts, so a bare `expectOne({ method: 'GET' })` matches two
   * requests and fails.
   */
  function expectListRequest(): TestRequest {
    return httpMock.expectOne(req => req.url.endsWith('/api/categories'));
  }

  /**
   * Answer the count request. Not what most of these tests are about, but an unanswered request
   * makes `httpMock.verify()` fail in `afterEach`, so every test would report "open requests"
   * instead of whatever it was actually asserting.
   */
  function flushCounts(): void {
    for (const req of httpMock.match(r => r.url.endsWith('/api/categories/summary'))) {
      req.flush({ categories: [] });
    }
  }

  afterEach(() => {
    flushCounts();
    TestBed.resetTestingModule();
    httpMock.verify();
  });

  it('should call load all on init', async () => {
    // WHEN
    TestBed.tick();
    const req = expectListRequest();
    req.flush([{ id: '32948133-0615-4b7d-82d4-7d0e6b590fb7' }], {
      headers: { link: '<http://localhost/api/foo?page=1&size=20>; rel="next"' },
    });
    await vitest.runAllTimersAsync();

    // THEN
    expect(comp.isLoading()).toEqual(false);
    expect(comp.categories()[0]).toEqual(expect.objectContaining({ id: '32948133-0615-4b7d-82d4-7d0e6b590fb7' }));
  });

  describe('trackId', () => {
    it('should forward to categoryService', () => {
      const entity = { id: '32948133-0615-4b7d-82d4-7d0e6b590fb7' };
      vitest.spyOn(service, 'getCategoryIdentifier');
      const id = comp.trackId(entity);
      expect(service.getCategoryIdentifier).toHaveBeenCalledWith(entity);
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
    expect(service.categoriesParams()).toMatchObject(expect.objectContaining({ sort: ['id,desc'] }));
  });

  describe('activity counts', () => {
    it('should take counts from the server rather than from the cards on screen', () => {
      TestBed.tick();
      expectListRequest().flush([{ id: 'c1', name: 'Clinical visits' }]);

      httpMock
        .expectOne(r => r.url.endsWith('/api/categories/summary'))
        .flush({ categories: [{ categoryId: 'c1', activities: 4, live: 3 }] });

      expect(comp.countFor('c1')?.activities).toBe(4);
      // Carried separately because a card reading "4" when only three can be booked overstates it.
      expect(comp.countFor('c1')?.live).toBe(3);
    });

    it('should leave counts null when they fail rather than showing zeros', () => {
      TestBed.tick();
      expectListRequest().flush([{ id: 'c1' }]);

      httpMock.expectOne(r => r.url.endsWith('/api/categories/summary')).flush('nope', { status: 500, statusText: 'Server Error' });

      // "—" and "0" are different claims: an empty category and an unreadable one are not the same.
      expect(comp.summary()).toBeNull();
      expect(comp.countFor('c1')).toBeNull();
    });

    it('should report a genuinely empty category as zero', () => {
      TestBed.tick();
      expectListRequest().flush([{ id: 'c6' }]);

      httpMock
        .expectOne(r => r.url.endsWith('/api/categories/summary'))
        .flush({ categories: [{ categoryId: 'c6', activities: 0, live: 0 }] });

      expect(comp.countFor('c6')?.activities).toBe(0);
    });
  });

  describe('the activities table', () => {
    it('should ask the server for one category rather than filtering a page in the browser', () => {
      TestBed.tick();
      expectListRequest().flush([{ id: 'c1', name: 'Clinical visits' }]);
      flushCounts();

      comp.openCategoryId.set('c1');
      (comp as any).loadActivities();

      const req = httpMock.expectOne(r => r.url.endsWith('/api/service-activities'));
      expect(req.request.params.get('categoryId.equals')).toBe('c1');
      req.flush([]);
    });

    it('should hold activities null while in flight so the table can say so', () => {
      TestBed.tick();
      expectListRequest().flush([{ id: 'c1' }]);
      flushCounts();

      comp.openCategoryId.set('c1');
      (comp as any).loadActivities();

      // Null is "loading", an empty array is "this category has nothing". The template draws them
      // differently and must be able to tell them apart.
      expect(comp.activities()).toBeNull();

      httpMock.expectOne(r => r.url.endsWith('/api/service-activities')).flush([]);
      expect(comp.activities()).toEqual([]);
    });
  });

  describe('the live toggle', () => {
    /**
     * The direction that matters: on to off.
     *
     * `PATCH` skips fields that arrive null, and `false` is one keystroke away from being treated as
     * absent. If it ever were, the toggle would flip in the browser, save without error, and revert
     * on reload — which reads as a caching bug and is not one.
     */
    it('should PATCH published and take the new value from the response', () => {
      TestBed.tick();
      expectListRequest().flush([{ id: 'c1' }]);
      flushCounts();

      comp.activities.set([{ id: 'ac1', name: 'Routine nursing visit', published: true }]);
      comp.togglePublished({ id: 'ac1', name: 'Routine nursing visit', published: true });

      const req = httpMock.expectOne(r => r.url.endsWith('/api/service-activities/ac1') && r.method === 'PATCH');
      expect(req.request.body).toEqual({ id: 'ac1', published: false });
      req.flush({ id: 'ac1', name: 'Routine nursing visit', published: false });

      expect(comp.activities()![0].published).toBe(false);
      expect(comp.isSaving('ac1')).toBe(false);

      // The card's live count moved, and it is computed over the whole catalogue.
      httpMock
        .expectOne(r => r.url.endsWith('/api/categories/summary'))
        .flush({ categories: [{ categoryId: 'c1', activities: 1, live: 0 }] });
      expect(comp.countFor('c1')?.live).toBe(0);
    });

    it('should keep the old value when the PATCH fails', () => {
      TestBed.tick();
      expectListRequest().flush([{ id: 'c1' }]);
      flushCounts();

      comp.activities.set([{ id: 'ac1', name: 'Routine nursing visit', published: true }]);
      comp.togglePublished({ id: 'ac1', name: 'Routine nursing visit', published: true });

      httpMock
        .expectOne(r => r.url.endsWith('/api/service-activities/ac1') && r.method === 'PATCH')
        .flush('nope', { status: 500, statusText: 'Server Error' });

      // Not optimistic: a row that flipped locally would assert something untrue about what
      // patients can be booked onto, and the next reload would silently disagree with it.
      expect(comp.activities()![0].published).toBe(true);
      expect(comp.isSaving('ac1')).toBe(false);
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

    it('on confirm should reload the cards and their counts', inject([], () => {
      // GIVEN
      vitest.spyOn(comp, 'load');
      vitest.spyOn(comp, 'refresh');

      // WHEN
      comp.delete(sampleWithRequiredData);
      deleteModalMock.closed.next('deleted');

      // THEN — deleting a category changes the counts as well as the list.
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
