import { MockInstance, afterEach, beforeEach, describe, expect, it, vitest } from 'vitest';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faEye, faPencilAlt, faPlus, faSort, faSortDown, faSortUp, faSync, faTimes } from '@fortawesome/free-solid-svg-icons';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

import { AuditEntryService } from '../service/audit-entry.service';

import { AuditEntry } from './audit-entry';

vitest.useFakeTimers();

describe('AuditEntry Management Component', () => {
  let httpMock: HttpTestingController;
  let comp: AuditEntry;
  let fixture: ComponentFixture<AuditEntry>;
  let service: AuditEntryService;
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

    fixture = TestBed.createComponent(AuditEntry);
    comp = fixture.componentInstance;
    service = TestBed.inject(AuditEntryService);
    routerNavigateSpy = vitest.spyOn(comp.router, 'navigate');

    const library = TestBed.inject(FaIconLibrary);
    library.addIcons(faEye, faPencilAlt, faPlus, faSort, faSortDown, faSortUp, faSync, faTimes);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    httpMock.verify();
  });

  it('should call load all on init', async () => {
    // WHEN
    TestBed.tick();
    const req = httpMock.expectOne({ method: 'GET' });
    req.flush([{ id: 2778 }], { headers: { link: '<http://localhost/api/foo?page=1&size=20>; rel="next"' } });
    await vitest.runAllTimersAsync();

    // THEN
    expect(comp.isLoading()).toEqual(false);
    expect(comp.auditEntries()[0]).toEqual(expect.objectContaining({ id: 2778 }));
  });

  it('should cancel previous requests when loading a new page', async () => {
    // WHEN
    TestBed.tick();
    const req = httpMock.expectOne({ method: 'GET' });
    await vitest.runAllTimersAsync();

    comp.page.set(3);
    comp.load();
    await vitest.runAllTimersAsync();
    const req2 = httpMock.expectOne({ method: 'GET' });
    req2.flush([{ id: 2778 }], { headers: { link: '<http://localhost/api/foo?page=1&size=20>; rel="next"' } });
    await vitest.runAllTimersAsync();

    // THEN
    expect(req.cancelled).toBeTruthy();
    expect(comp.isLoading()).toEqual(false);
    expect(comp.auditEntries()[0]).toEqual(expect.objectContaining({ id: 2778 }));
  });

  it('should not fail on resource error state', async () => {
    // GIVEN - first load triggers an HTTP error
    TestBed.tick();
    const errorReq = httpMock.expectOne({ method: 'GET' });
    errorReq.flush('error', { status: 500, statusText: 'Server Error' });
    await vitest.runAllTimersAsync();

    // THEN - loading state was reset and list is empty
    expect(comp.isLoading()).toBe(false);
    expect(comp.auditEntries()).toEqual([]);

    // WHEN - second load should still work
    comp.load();
    TestBed.tick();
    const successReq = httpMock.expectOne({ method: 'GET' });
    successReq.flush([{ id: 2778 }], { headers: { link: '<http://localhost/api/foo?page=1&size=20>; rel="next"' } });
    await vitest.runAllTimersAsync();

    // THEN - subscription is still alive and second load succeeds
    expect(comp.auditEntries()[0]).toEqual(expect.objectContaining({ id: 2778 }));
  });

  describe('trackId', () => {
    it('should forward to auditEntryService', () => {
      const entity = { id: 2778 };
      vitest.spyOn(service, 'getAuditEntryIdentifier');
      const id = comp.trackId(entity);
      expect(service.getAuditEntryIdentifier).toHaveBeenCalledWith(entity);
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
    httpMock.expectOne({ method: 'GET' });

    // THEN
    expect(service.auditEntriesParams()).toMatchObject(expect.objectContaining({ sort: ['id,desc'] }));
  });
});
