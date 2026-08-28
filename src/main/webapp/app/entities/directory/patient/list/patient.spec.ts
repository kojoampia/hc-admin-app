import { readFileSync } from 'node:fs';
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
  faSort,
  faSortDown,
  faSortUp,
  faSync,
  faTimes,
  faUser,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { provideTranslateService } from '@ngx-translate/core';
import dayjs from 'dayjs/esm';
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
    // The tile icons go in alongside the table's: an icon missing from the library throws at
    // render, so every test fails on the tiles rather than on what it asserts.
    library.addIcons(faBoxArchive, faEye, faList, faPencilAlt, faSort, faSortDown, faSortUp, faSync, faTimes, faUser, faUsers);
    httpMock = TestBed.inject(HttpTestingController);
  });

  /**
   * The table's own request.
   *
   * `ngOnInit` loads the tiles as well — the directory total plus one count per status — so a bare
   * `expectOne({ method: 'GET' })` now matches seven requests and fails. The list request is the
   * one asking for a whole page rather than `size=1`.
   */
  function expectListRequest(): TestRequest {
    return httpMock.expectOne(req => req.url.endsWith('/api/patients') && req.params.get('size') !== '1');
  }

  /**
   * Answer the tile and clinical-lead requests.
   *
   * An unanswered request makes `httpMock.verify()` fail in `afterEach`, so every test would
   * report "open requests" instead of whatever it was actually asserting.
   */
  function flushTiles(): void {
    for (const req of httpMock.match(r => r.url.endsWith('/api/patients') && r.params.get('size') === '1')) {
      req.flush([], { headers: { 'X-Total-Count': '0' } });
    }
    for (const req of httpMock.match(r => r.url.includes('/api/professionals/'))) {
      req.flush({ id: 'unused' });
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
    const req = expectListRequest();
    await vitest.runAllTimersAsync();

    comp.page.set(3);
    comp.load();
    await vitest.runAllTimersAsync();
    const req2 = expectListRequest();
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
    const errorReq = expectListRequest();
    errorReq.flush('error', { status: 500, statusText: 'Server Error' });
    await vitest.runAllTimersAsync();

    // THEN - loading state was reset and list is empty
    expect(comp.isLoading()).toBe(false);
    expect(comp.patients()).toEqual([]);

    // WHEN - second load should still work
    comp.load();
    TestBed.tick();
    const successReq = expectListRequest();
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
    expectListRequest();

    // THEN
    expect(service.patientsParams()).toMatchObject(expect.objectContaining({ sort: ['id,desc'] }));
  });

  describe('archived filter', () => {
    it('should ask for the un-archived half by default', () => {
      TestBed.tick();
      expectListRequest();

      // notEquals, not equals=false: a record saved before isArchived existed has no value at
      // all, and equals=false would not match it — the whole directory would read as empty.
      expect(service.patientsParams()).toMatchObject(expect.objectContaining({ 'isArchived.notEquals': true }));
      expect(service.patientsParams()).not.toMatchObject(expect.objectContaining({ 'isArchived.equals': true }));
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

  describe('the name column the generated screen did not have', () => {
    it('should read the name from the linked profile', () => {
      const patient = { id: 'a1', profile: { id: 'profile-a1', firstName: 'Efua', lastName: 'Mensah' } } as never;

      expect(comp.displayName(patient)).toBe('Efua Mensah');
      expect(comp.initials(patient)).toBe('EM');
    });

    it('should fall back to the id rather than showing nothing', () => {
      // The finding was that rows read "a1", "profile-a1", "angel-a1" with no name anywhere. A
      // record with no profile still has to identify itself.
      expect(comp.displayName({ id: 'a1' })).toBe('a1');
    });
  });

  describe('age', () => {
    it('should parse a date of birth the service left as a string', () => {
      // PatientService converts joinedOn and lastActiveOn only; the nested profile is passed
      // through as the server sent it. So dateOfBirth is a string at runtime while the compiler
      // believes it is a dayjs.Dayjs — piping it straight to a date pipe throws.
      const born = dayjs().subtract(41, 'year').subtract(3, 'month');
      const patient = { id: 'a1', profile: { id: 'p', dateOfBirth: born.format('YYYY-MM-DD') } } as never;

      expect(comp.age(patient)).toBe(41);
    });

    it('should be null when there is no usable date of birth', () => {
      expect(comp.age({ id: 'a1' })).toBeNull();
      expect(comp.age({ id: 'a1', profile: { id: 'p', dateOfBirth: 'not-a-date' } } as never)).toBeNull();
    });
  });

  describe('clinical lead', () => {
    it('should show the licence number until the name arrives, and never a blank cell', () => {
      // GET /api/patients cannot supply the name: Patient.clinicalLead carries
      // @JsonIgnoreProperties({"profile", ...}) on the api, so the row has a licence and no name.
      const patient = { id: 'a1', clinicalLead: { id: 'p1', licenceNumber: 'MDC/RN/23-4471' } } as never;

      expect(comp.clinicalLead(patient)).toBe('MDC/RN/23-4471');

      comp.leadNames.set({ p1: 'Kwame Boateng' });
      expect(comp.clinicalLead(patient)).toBe('Kwame Boateng');
    });

    it('should be null when no lead is assigned', () => {
      expect(comp.clinicalLead({ id: 'a1' })).toBeNull();
    });

    it('should resolve each distinct lead on the page once, not once per row', async () => {
      TestBed.tick();
      const list = expectListRequest();
      list.flush(
        [
          { id: 'a1', clinicalLead: { id: 'p1' } },
          { id: 'a2', clinicalLead: { id: 'p1' } },
          { id: 'a3', clinicalLead: { id: 'p2' } },
          { id: 'a4' },
        ],
        { headers: { link: '<http://localhost/api/foo?page=1&size=20>; rel="next"' } },
      );
      await vitest.runAllTimersAsync();

      // Three rows name a lead but only two leads are distinct, and the fourth names none.
      const lookups = httpMock.match(r => r.url.includes('/api/professionals/'));
      expect(lookups).toHaveLength(2);
      expect(lookups.map(r => r.request.url.split('/').pop()).sort()).toEqual(['p1', 'p2']);
    });
  });

  describe('status tiles', () => {
    it('should cover every status, so no patient is reachable through no tile', () => {
      // The demo draws Active, Pending and Suspended beside an All, which leaves an on-leave or
      // under-review patient inside All and reachable by no tile of its own.
      expect(comp.STATUSES).toEqual(['ACTIVE', 'PENDING', 'SUSPENDED', 'ON_LEAVE', 'UNDER_REVIEW']);
    });

    it('should count each status and the directory total over the unarchived half', () => {
      TestBed.tick();
      expectListRequest();

      const tileRequests = httpMock.match(r => r.url.endsWith('/api/patients') && r.params.get('size') === '1');

      // One per status, plus the All tile.
      expect(tileRequests).toHaveLength(comp.STATUSES.length + 1);
      expect(tileRequests.every(r => r.request.params.get('isArchived.notEquals') === 'true')).toBe(true);
    });

    it('should not reload the tiles when turning a page', () => {
      TestBed.tick();
      expectListRequest();
      flushTiles();

      comp.load();
      TestBed.tick();
      expectListRequest();

      expect(httpMock.match(r => r.url.endsWith('/api/patients') && r.params.get('size') === '1')).toHaveLength(0);
    });
  });

  describe('status filter', () => {
    it('should send the selected status to the server rather than filtering a page', () => {
      TestBed.tick();
      expectListRequest();
      flushTiles();

      comp.status.set('SUSPENDED');
      comp.load();
      TestBed.tick();
      expectListRequest();

      expect(service.patientsParams()).toMatchObject(expect.objectContaining({ 'status.equals': 'SUSPENDED' }));
    });

    it('should ignore a status the enum does not have', () => {
      // A hand-edited URL would otherwise reach the api as an unknown enum value, which is a 400 —
      // and the screen would read as broken rather than as unfiltered.
      comp['fillComponentAttributeFromRoute'](convertToParamMap({ status: 'NONSENSE' }), {});

      expect(comp.status()).toBeNull();
    });
  });

  describe('export', () => {
    let downloads: { name: string; revoked: boolean }[];

    /**
     * jsdom implements neither half of the save path — `URL.createObjectURL` is undefined there.
     *
     * Without these stubs `saveDownload` throws a TypeError inside the subscriber, and every test
     * below still passes: they assert on the outgoing request, which has already happened by then.
     * That is the shape of bug this repo keeps meeting — a green check that stopped covering the
     * thing it names. Stubbing turns the save into something assertable instead.
     */
    beforeEach(() => {
      downloads = [];
      const urls = new Map<string, { name: string; revoked: boolean }>();
      let next = 0;

      (URL as any).createObjectURL = vitest.fn(() => {
        const url = `blob:test/${next++}`;
        urls.set(url, { name: '', revoked: false });
        return url;
      });
      (URL as any).revokeObjectURL = vitest.fn((url: string) => {
        const entry = urls.get(url);
        if (entry) {
          entry.revoked = true;
        }
      });
      vitest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        const entry = urls.get(this.href)!;
        entry.name = this.download;
        downloads.push(entry);
      });
    });

    afterEach(() => {
      delete (URL as any).createObjectURL;
      delete (URL as any).revokeObjectURL;
    });

    /**
     * The saved file is named by the server, not by the client.
     *
     * `Content-Disposition` carries a dated filename; parsing it rather than composing one here
     * keeps a single source for what the file is called, and the fallback covers a proxy that
     * strips the header.
     */
    it('should save the file under the name the server gave it, and release the blob', async () => {
      TestBed.tick();
      expectListRequest();
      flushTiles();

      comp.exportCsv();
      await vitest.runAllTimersAsync();

      httpMock
        .expectOne(r => r.url.endsWith('/api/patients/export'))
        .flush(new Blob(['x'], { type: 'text/csv' }), {
          headers: { 'Content-Disposition': 'attachment; filename="patients-2026-08-24.csv"' },
        });
      await vitest.runAllTimersAsync();

      expect(downloads).toHaveLength(1);
      expect(downloads[0].name).toBe('patients-2026-08-24.csv');
      // Revoked, or the blob is pinned for the life of the document — and a directory export is
      // not a small one.
      expect(downloads[0].revoked).toBe(true);
      expect(comp.isExporting()).toBe(false);
    });

    it('should fall back to a plain filename when the header is absent', async () => {
      TestBed.tick();
      expectListRequest();
      flushTiles();

      comp.exportCsv();
      await vitest.runAllTimersAsync();

      httpMock.expectOne(r => r.url.endsWith('/api/patients/export')).flush(new Blob(['x'], { type: 'text/csv' }));
      await vitest.runAllTimersAsync();

      expect(downloads[0].name).toBe('patients.csv');
    });

    /**
     * The file has to hold the rows the screen is showing.
     *
     * This is the whole property of the action and the one that cannot be seen from inside the
     * downloaded file, so it is asserted on the request rather than on what comes back: the same
     * `status.equals` and `isArchived.notEquals` the list just sent, and nothing else.
     */
    it('should export over the filters currently applied', async () => {
      TestBed.tick();
      expectListRequest();
      flushTiles();

      comp.status.set('SUSPENDED');
      comp.load();
      TestBed.tick();
      expectListRequest();

      comp.exportCsv();
      await vitest.runAllTimersAsync();

      const req = httpMock.expectOne(r => r.url.endsWith('/api/patients/export'));
      expect(req.request.params.get('status.equals')).toBe('SUSPENDED');
      expect(req.request.params.get('isArchived.notEquals')).toBe('true');
      req.flush(new Blob(['x'], { type: 'text/csv' }));
    });

    /**
     * Page and size are stripped.
     *
     * Left on, this would download the twenty rows currently visible under the name "export" —
     * which looks like it worked, and is the one failure a person checking the file cannot spot
     * unless the directory happens to be longer than a page.
     */
    it('should not send page or size', async () => {
      TestBed.tick();
      expectListRequest();
      flushTiles();

      comp.exportCsv();
      await vitest.runAllTimersAsync();

      const req = httpMock.expectOne(r => r.url.endsWith('/api/patients/export'));
      expect(req.request.params.get('page')).toBeNull();
      expect(req.request.params.get('size')).toBeNull();
      req.flush(new Blob(['x'], { type: 'text/csv' }));
    });

    it('should not start a second export while one is in flight', async () => {
      TestBed.tick();
      expectListRequest();
      flushTiles();

      comp.exportCsv();
      comp.exportCsv();
      await vitest.runAllTimersAsync();

      const requests = httpMock.match(r => r.url.endsWith('/api/patients/export'));
      expect(requests).toHaveLength(1);
      requests[0].flush(new Blob(['x'], { type: 'text/csv' }));
    });

    /** A failed export has to release the button, or the screen needs a reload to try again. */
    it('should clear the in-flight flag when the export fails', async () => {
      TestBed.tick();
      expectListRequest();
      flushTiles();

      comp.exportCsv();
      await vitest.runAllTimersAsync();

      httpMock.expectOne(r => r.url.endsWith('/api/patients/export')).flush(null, { status: 403, statusText: 'Forbidden' });
      await vitest.runAllTimersAsync();

      expect(comp.isExporting()).toBe(false);
    });
  });
});

/**
 * The Create button this screen deliberately does not have.
 *
 * <p>A patient registers on hc-patient and arrives in this directory with an account already, so
 * nothing the administrator can fill in here makes one. The button offered a patient it could not
 * make — a record with no account behind it, which is counted as a patient everywhere and can never
 * sign in.
 *
 * <p>Pinned rather than left to review, for the same reason the quick-add menu is: this is a
 * generated screen and its siblings all carry the button, so putting it back is a paste that reads
 * as consistency. The template is read rather than rendered because absence is what is being
 * asserted, and a query that finds nothing passes just as well against a component that failed to
 * render at all.
 */
describe('the patient list template', () => {
  const template = readFileSync('src/main/webapp/app/entities/directory/patient/list/patient.html', 'utf8');

  it.each(['entityCreateButton', 'jh-create-entity', '/patient/new'])('offers no %s', marker => {
    expect(template).not.toContain(marker);
  });

  /** The absence is only safe while it is explained: an unexplained gap gets filled back in. */
  it('says why, where the next person to edit it will look', () => {
    expect(template).toContain('There is no Create button here');
  });
});
