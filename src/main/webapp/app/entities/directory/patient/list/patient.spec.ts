import { MockInstance, afterEach, beforeEach, describe, expect, it, vitest } from 'vitest';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
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
} from '@fortawesome/free-solid-svg-icons';
import { provideTranslateService } from '@ngx-translate/core';
import { Subject, of } from 'rxjs';

import { sampleWithRequiredData } from '../patient.test-samples';
import { PatientService } from '../service/patient.service';

import { Patient } from './patient';

vitest.useFakeTimers();

describe('Patient Management Component', () => {
  let httpMock: HttpTestingController;
  let comp: Patient;
  let fixture: ComponentFixture<Patient>;
  let service: PatientService;
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

    fixture = TestBed.createComponent(Patient);
    comp = fixture.componentInstance;
    service = TestBed.inject(PatientService);
    routerNavigateSpy = vitest.spyOn(comp.router, 'navigate');

    const library = TestBed.inject(FaIconLibrary);
    library.addIcons(faBoxArchive, faEye, faList, faPencilAlt, faPlus, faSort, faSortDown, faSortUp, faSync, faTimes);
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
    req.flush([{ id: '88928db1-656e-430d-95c0-5cde75285e55' }], {
      headers: { link: '<http://localhost/api/foo?page=1&size=20>; rel="next"' },
    });
    await vitest.runAllTimersAsync();

    // THEN
    expect(comp.isLoading()).toEqual(false);
    expect(comp.patients()[0]).toEqual(expect.objectContaining({ id: '88928db1-656e-430d-95c0-5cde75285e55' }));
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
    req2.flush([{ id: '88928db1-656e-430d-95c0-5cde75285e55' }], {
      headers: { link: '<http://localhost/api/foo?page=1&size=20>; rel="next"' },
    });
    await vitest.runAllTimersAsync();

    // THEN
    expect(req.cancelled).toBeTruthy();
    expect(comp.isLoading()).toEqual(false);
    expect(comp.patients()[0]).toEqual(expect.objectContaining({ id: '88928db1-656e-430d-95c0-5cde75285e55' }));
  });

  it('should not fail on resource error state', async () => {
    // GIVEN - first load triggers an HTTP error
    TestBed.tick();
    const errorReq = httpMock.expectOne({ method: 'GET' });
    errorReq.flush('error', { status: 500, statusText: 'Server Error' });
    await vitest.runAllTimersAsync();

    // THEN - loading state was reset and list is empty
    expect(comp.isLoading()).toBe(false);
    expect(comp.patients()).toEqual([]);

    // WHEN - second load should still work
    comp.load();
    TestBed.tick();
    const successReq = httpMock.expectOne({ method: 'GET' });
    successReq.flush([{ id: '88928db1-656e-430d-95c0-5cde75285e55' }], {
      headers: { link: '<http://localhost/api/foo?page=1&size=20>; rel="next"' },
    });
    await vitest.runAllTimersAsync();

    // THEN - subscription is still alive and second load succeeds
    expect(comp.patients()[0]).toEqual(expect.objectContaining({ id: '88928db1-656e-430d-95c0-5cde75285e55' }));
  });

  describe('trackId', () => {
    it('should forward to patientService', () => {
      const entity = { id: '88928db1-656e-430d-95c0-5cde75285e55' };
      vitest.spyOn(service, 'getPatientIdentifier');
      const id = comp.trackId(entity);
      expect(service.getPatientIdentifier).toHaveBeenCalledWith(entity);
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
    expect(service.patientsParams()).toMatchObject(expect.objectContaining({ sort: ['id,desc'] }));
  });

  describe('archived filter', () => {
    it('should ask for the un-archived half by default', () => {
      TestBed.tick();
      httpMock.expectOne({ method: 'GET' });

      // notEquals, not equals=false: a record saved before isArchived existed has no value at
      // all, and equals=false would not match it — the whole directory would read as empty.
      expect(service.patientsParams()).toMatchObject(expect.objectContaining({ 'isArchived.notEquals': true }));
      expect(service.patientsParams()).not.toMatchObject(expect.objectContaining({ 'isArchived.equals': true }));
    });

    it('should ask for the archived half when the route says so', () => {
      // Consume the load the component issues on init, or verify() in afterEach
      // sees two open requests and the failure reads as a leak rather than this.
      TestBed.tick();
      httpMock.expectOne({ method: 'GET' });

      comp.showArchived.set(true);
      comp.load();
      TestBed.tick();
      httpMock.expectOne({ method: 'GET' });

      expect(service.patientsParams()).toMatchObject(expect.objectContaining({ 'isArchived.equals': true }));
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
});
