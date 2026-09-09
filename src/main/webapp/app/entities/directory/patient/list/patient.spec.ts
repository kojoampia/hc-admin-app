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
    // Any row without a name provokes one batched link read. Seeded rows carry no profile, so most
    // tests in this file make it without being about it. This also mops up the plan-choice read,
    // which `ngOnInit` and `refresh` fire unconditionally — see `isLinkLookup` for why the two are
    // told apart everywhere it matters.
    for (const req of httpMock.match(r => r.url.endsWith('/api/directory-links'))) {
      req.flush([]);
    }
    // The plan catalogue, read once so a chosen tier can be shown with its price.
    for (const req of httpMock.match(r => r.url.endsWith('/api/service-plans'))) {
      req.flush([]);
    }
  }

  /**
   * The batched read that names the nameless rows of the page — `localId.in`.
   *
   * **Told apart from the plan-choice read by its parameters, and it has to be.** Both address
   * `/api/directory-links`, so from backlog item 48 onwards a bare `endsWith` matcher matches two
   * requests and `expectOne` fails on every case in this file that was about neither. The
   * distinction is not cosmetic either: the two answer different questions and a test that flushed
   * the wrong one would assert against a page it never asked for.
   */
  function isLinkLookup(req: { url: string; params: { has(name: string): boolean } }): boolean {
    return req.url.endsWith('/api/directory-links') && req.params.has('localId.in');
  }

  /** Its counterpart: the plan choices awaiting a decision, filtered on the reported status. */
  function isPlanChoiceLookup(req: { url: string; params: { has(name: string): boolean } }): boolean {
    return req.url.endsWith('/api/directory-links') && req.params.has('planStatus');
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

    /**
     * A patient learned from a sibling domain event, which is backlog item 45.
     *
     * The streams carry no name, date of birth, phone number or document number — hc-patient's
     * publisher refuses them at runtime — and hc-admin's `Profile` requires all four, so such a
     * patient has no profile and never can from the wire. The row used to fall back to
     * `patient.id`: a 24-character Mongo ObjectId under a chip reading its first two hex
     * characters, which an operator reported from production as a corrupted record.
     */
    describe('a patient with no profile', () => {
      const learned = { id: '68b4f2a19c3d5e7f81a02c44' } as never;

      it('never renders the ObjectId as a name, and never two hex characters as initials', () => {
        // Asserted as an absence rather than against the replacement, because the defect is the id
        // appearing at all — any future fallback that reintroduces it fails here too.
        expect(comp.displayName(learned)).not.toBe('68b4f2a19c3d5e7f81a02c44');
        expect(comp.initials(learned)).not.toBe('68');
      });

      it('reads as an honestly incomplete record while nothing names them', () => {
        expect(comp.displayName(learned)).toBeNull();
        expect(comp.isUnidentified(learned)).toBe(true);
        expect(comp.initials(learned)).toBe('—');
      });

      it('shows the address from the directory link once it lands', () => {
        comp.links.set({ '68b4f2a19c3d5e7f81a02c44': { id: 'link-1', email: 'Ama.Mensah@example.com' } });

        expect(comp.displayName(learned)).toBe('Ama.Mensah@example.com');
        expect(comp.isUnidentified(learned)).toBe(false);
        // The mailbox's letters, not the id's.
        expect(comp.initials(learned)).toBe('AM');
      });

      it('falls back to the login when the link carries no address', () => {
        // A professional-sourced link keys on an opaque accountId, so there may be no email.
        comp.links.set({ '68b4f2a19c3d5e7f81a02c44': { id: 'link-1', login: 'amensah' } });

        expect(comp.displayName(learned)).toBe('amensah');
        expect(comp.initials(learned)).toBe('A');
      });

      it('does not fall back to the correlation key, which for a clinician is a UUID', () => {
        // externalKey equals email for a patient and adds nothing; for a professional it is the
        // same unreadable-identifier-as-a-name defect one field along.
        comp.links.set({
          '68b4f2a19c3d5e7f81a02c44': { id: 'link-1', externalKey: '9f1c3e77-52aa-4a0b-9a5c-6b3f1d7e0a11' },
        });

        expect(comp.displayName(learned)).toBeNull();
        expect(comp.isUnidentified(learned)).toBe(true);
      });

      /**
       * **The hint under "Identity not on file" says what is known, not what is likely.**
       *
       * There was one hint until 2026-09-07 and it read "Registered on the patient app; no name has
       * been recorded here yet" for every unidentified row — including the row `loadLinks`'s own
       * javadoc describes as having neither profile nor link, "a permanent state, not a pending
       * one". For those rows it sent an operator looking for an account on hc-patient that never
       * existed, which is worse than the blank it replaced because it is confidently wrong.
       */
      describe('the hint under the label', () => {
        it('claims a patient-app registration only when a link actually says so', () => {
          comp.links.set({ '68b4f2a19c3d5e7f81a02c44': { id: 'link-1', source: 'HC_PATIENT' } });

          expect(comp.isUnidentified(learned)).toBe(true);
          expect(comp.unidentifiedHintKey(learned)).toBe('hcAdminApp.directoryPatient.unidentifiedHintLinked');
        });

        it('says only that no name is recorded when the lookup found no link', () => {
          // Asked, and there is none — the key is present with an undefined value.
          comp.links.set({ '68b4f2a19c3d5e7f81a02c44': undefined });

          expect(comp.unidentifiedHintKey(learned)).toBe('hcAdminApp.directoryPatient.unidentifiedHintUnknown');
        });

        it('says the same while the lookup is still out, rather than guessing ahead of it', () => {
          expect(comp.unidentifiedHintKey(learned)).toBe('hcAdminApp.directoryPatient.unidentifiedHintUnknown');
        });
      });

      /**
       * The sub-label under a name that came off a link follows the link's own source.
       *
       * `resolveLinkIdentity`'s login fallback was documented as being for a professional-sourced
       * link, and the case above asserts it — while the single label said "From the patient app
       * account" for every such row. Unreachable today, since no hc-professional link carries a
       * `localId`, but a label contradicting a covered branch is a label that is wrong the moment
       * the branch is reached. (The professional directory stopped using `resolveLinkIdentity` on
       * 2026-09-07 — backlog item 47 — so the fallback is this screen's own now. The branch and the
       * reason for covering it are unchanged.)
       */
      /**
       * **The name hc-patient holds, which is backlog item 50.**
       *
       * Item 45 stopped this row printing an ObjectId and put the address on it; the address is what
       * an operator then reported from production as an email where a name should be. hc-patient
       * owns the name and answers for it — `GET /api/profiles/email/{email}`, asked by the api with
       * the administrator's own token — and the row shows what comes back.
       *
       * **Nothing below the name changed.** The address, the login, "Identity not on file" and the
       * refusal to print an id are item 45's and are asserted above; these cases are about the rung
       * added on top of them.
       */
      describe('the name resolved from the patient app', () => {
        it('prefers the resolved name over the address it would otherwise show', () => {
          comp.links.set({
            '68b4f2a19c3d5e7f81a02c44': {
              id: 'link-1',
              source: 'HC_PATIENT',
              email: 'kojo@jac.net',
              resolvedName: 'Kojo Ampia-Addison',
              nameResolution: 'RESOLVED',
            },
          });

          expect(comp.displayName(learned)).toBe('Kojo Ampia-Addison');
          expect(comp.isUnidentified(learned)).toBe(false);
          // One rule serves both: the `@` split leaves a name whole, so the word initials come out
          // of the same code path as a mailbox's.
          expect(comp.initials(learned)).toBe('KA');
        });

        it('says the name came from the patient app rather than claiming a profile exists here', () => {
          comp.links.set({
            '68b4f2a19c3d5e7f81a02c44': { id: 'link-1', source: 'HC_PATIENT', email: 'kojo@jac.net', resolvedName: 'Kojo Ampia-Addison' },
          });

          expect(comp.isNameFromPatientApp(learned)).toBe(true);
        });

        it('falls back to the address when hc-patient does not name them, and says nothing extra', () => {
          // NOT_FOUND covers both "no profile there" and "this caller may not see it" — their
          // endpoint answers the same 404 for each — so the row must not explain which.
          comp.links.set({
            '68b4f2a19c3d5e7f81a02c44': { id: 'link-1', source: 'HC_PATIENT', email: 'naa.adjeley@mail.gh', nameResolution: 'NOT_FOUND' },
          });

          expect(comp.displayName(learned)).toBe('naa.adjeley@mail.gh');
          expect(comp.isNameUnavailable(learned)).toBe(false);
          expect(comp.isNameFromPatientApp(learned)).toBe(false);
        });

        it('says a name could not be looked up when the lookup did not come back', () => {
          comp.links.set({
            '68b4f2a19c3d5e7f81a02c44': { id: 'link-1', source: 'HC_PATIENT', email: 'kojo@jac.net', nameResolution: 'UNAVAILABLE' },
          });

          expect(comp.displayName(learned)).toBe('kojo@jac.net');
          expect(comp.isNameUnavailable(learned)).toBe(true);
        });

        /**
         * **And that sentence names no stack, which is the wording rather than a preference.**
         *
         * `UNAVAILABLE` has four causes and three of them are on *this* side: a base url naming a
         * container that does not exist in this environment, the lookup configured off, or a request
         * carrying no token to relay. Only the fourth is hc-patient being unreachable. A row reading
         * "the patient app could not be checked" therefore sends an operator to go and look at a
         * system that is working — item 24's wrong-machine pointer, on a screen — and it is the
         * *likeliest* reading, because the default base url is the production container's name and
         * every other environment has to override it.
         *
         * Asserted against the catalogue rather than the component, because the component only picks
         * a key: the thing that can quietly go wrong is somebody making the sentence more helpful.
         */
        it('blames nobody, because three of the four causes are on this side', () => {
          const catalogue = JSON.parse(readFileSync('src/main/webapp/i18n/en/directoryPatient.json', 'utf8'));
          const sentence: string = catalogue.hcAdminApp.directoryPatient.nameUnavailable;

          expect(sentence).toBeTruthy();
          expect(sentence.toLowerCase()).not.toContain('patient app');
          expect(sentence.toLowerCase()).not.toContain('hc-patient');
        });

        it('says nothing about a row nobody could have asked about', () => {
          // An absent outcome is "never a candidate", not "asked and failed". A clinician's link and
          // a patient link with no address carry none, and telling a reader their name could not be
          // checked would be true of nothing.
          comp.links.set({ '68b4f2a19c3d5e7f81a02c44': { id: 'link-1', source: 'HC_PROFESSIONAL', login: 'kquartey' } });

          expect(comp.isNameUnavailable(learned)).toBe(false);
        });

        it('does not print a blank as somebody name when the resolved name is whitespace', () => {
          // hc-patient's Profile requires neither name, so a resolved lookup can carry nothing. An
          // empty string is falsy but not nullish, which is how it would reach the cell.
          comp.links.set({
            '68b4f2a19c3d5e7f81a02c44': { id: 'link-1', source: 'HC_PATIENT', email: 'kojo@jac.net', resolvedName: '   ' },
          });

          expect(comp.displayName(learned)).toBe('kojo@jac.net');
          expect(comp.isNameFromPatientApp(learned)).toBe(false);
        });
      });

      describe('where a linked name came from', () => {
        it('names the patient app for an hc-patient link', () => {
          comp.links.set({ '68b4f2a19c3d5e7f81a02c44': { id: 'link-1', source: 'HC_PATIENT', email: 'ama@example.com' } });

          expect(comp.identityFromLinkKey(learned)).toBe('hcAdminApp.directoryPatient.identityFromLinkPatientApp');
        });

        it('does not name the patient app for a link from anywhere else', () => {
          comp.links.set({ '68b4f2a19c3d5e7f81a02c44': { id: 'link-1', source: 'HC_PROFESSIONAL', login: 'kquartey' } });

          expect(comp.identityFromLinkKey(learned)).toBe('hcAdminApp.directoryPatient.identityFromLinkOther');
        });
      });
    });
  });

  describe('resolving the links behind the nameless rows', () => {
    it('asks once for the whole page rather than once per row, and only about the nameless', async () => {
      TestBed.tick();
      const req = expectListRequest();
      req.flush([{ id: 'learned-1' }, { id: 'learned-2' }, { id: 'named-1', profile: { id: 'p', firstName: 'Efua', lastName: 'Mensah' } }]);
      await vitest.runAllTimersAsync();

      const linkReq = httpMock.expectOne(isLinkLookup);
      expect(linkReq.request.params.getAll('localId.in')).toEqual(['learned-1', 'learned-2']);
      // Explicit, because a list endpoint with no size returns 20 and would silently leave the
      // 21st row of a page unresolved.
      expect(linkReq.request.params.get('size')).toBe('2');
      // And the api is asked to name them — backlog item 50. Without this parameter the response is
      // exactly what it was before that item, which is a screen that looks right and is a rung
      // short. The fan-out to hc-patient is deliberately on that side: their lookup takes one
      // address at a time, so doing it here would be one request per nameless row.
      expect(linkReq.request.params.get('resolveNames')).toBe('true');

      linkReq.flush([{ id: 'link-1', localId: 'learned-1', email: 'ama@example.com' }]);
      await vitest.runAllTimersAsync();

      expect(comp.displayName({ id: 'learned-1' })).toBe('ama@example.com');
      // Asked about and not found: a real, permanent state, recorded so it is not asked again.
      expect(comp.isUnidentified({ id: 'learned-2' })).toBe(true);
      expect('learned-2' in comp.links()).toBe(true);
    });

    it('sends no request at all when every row on the page has a name', async () => {
      TestBed.tick();
      const req = expectListRequest();
      req.flush([{ id: 'named-1', profile: { id: 'p', firstName: 'Efua', lastName: 'Mensah' } }]);
      await vitest.runAllTimersAsync();

      httpMock.expectNone(isLinkLookup);
    });

    it('leaves a failed lookup unrecorded, so it is retried rather than fixed as "there is none"', async () => {
      TestBed.tick();
      const req = expectListRequest();
      req.flush([{ id: 'learned-1' }]);
      await vitest.runAllTimersAsync();

      httpMock.expectOne(isLinkLookup).error(new ProgressEvent('network'));
      await vitest.runAllTimersAsync();

      expect(comp.isUnidentified({ id: 'learned-1' })).toBe(true);
      expect('learned-1' in comp.links()).toBe(false);
    });

    /**
     * **Refresh has to forget "asked, and there is none", because that is what Refresh is for.**
     *
     * The map records an unresolved id as a present `undefined` so a page turn does not re-ask, and
     * that is right for paging. It is wrong for the button, because the operation an administrator
     * presses Refresh *after* is `POST /api/directory-links/reconcile` — the one operation that
     * turns "there is none" into "there is one". Without this the row went on reading "Identity not
     * on file" until the component was destroyed and recreated.
     */
    it('asks again after a refresh, so a reconciliation is visible without a reload', async () => {
      TestBed.tick();
      expectListRequest().flush([{ id: 'learned-1' }]);
      await vitest.runAllTimersAsync();
      httpMock.expectOne(isLinkLookup).flush([]);
      await vitest.runAllTimersAsync();
      expect('learned-1' in comp.links()).toBe(true);

      comp.refresh();
      await vitest.runAllTimersAsync();
      expect(comp.links()).toEqual({});

      expectListRequest().flush([{ id: 'learned-1' }]);
      await vitest.runAllTimersAsync();

      const again = httpMock.expectOne(isLinkLookup);
      expect(again.request.params.getAll('localId.in')).toEqual(['learned-1']);
      again.flush([{ id: 'link-1', localId: 'learned-1', email: 'ama@example.com' }]);
      await vitest.runAllTimersAsync();

      expect(comp.displayName({ id: 'learned-1' })).toBe('ama@example.com');
    });

    /**
     * An id already asked about is not asked about again while the answer is still out.
     *
     * The map cannot record it — an unanswered id has no value to put in, and writing `undefined`
     * early would fix the row as "there is none" before anybody had asked — so the guard is a set
     * beside it. Two responses landing close together is ordinary: a sort and a page turn, or
     * Refresh pressed twice.
     */
    it('does not send a second request for ids already in flight', async () => {
      TestBed.tick();
      expectListRequest().flush([{ id: 'learned-1' }]);
      await vitest.runAllTimersAsync();

      const first = httpMock.expectOne(isLinkLookup);

      // A second page lands naming the same nameless row while the first answer is still out.
      comp.load();
      TestBed.tick();
      expectListRequest().flush([{ id: 'learned-1' }]);
      await vitest.runAllTimersAsync();

      httpMock.expectNone(isLinkLookup);

      first.flush([{ id: 'link-1', localId: 'learned-1', email: 'ama@example.com' }]);
      await vitest.runAllTimersAsync();
      expect(comp.displayName({ id: 'learned-1' })).toBe('ama@example.com');
    });
  });

  /**
   * **Plan choices awaiting a decision — backlog item 48.**
   *
   * hc-patient publishes `PlanChosen` when a patient picks a membership tier, the api writes it onto
   * the `DirectoryLink`, and this panel is where an administrator finds out there is anything to act
   * on. The cases below cover the three things that can go quietly wrong with it: asking the wrong
   * question of the server, showing the tier a patient *holds* instead of the one they asked for,
   * and turning "the catalogue has not answered" into "there is no such tier".
   */
  describe('plan choices awaiting a decision', () => {
    const pending = {
      id: 'link-plan-1',
      source: 'HC_PATIENT' as const,
      localId: 'a6',
      email: 'k.darkwa@mail.gh',
      planMembershipId: 'mem-a6-0117',
      planCode: 'PAWPAW',
      planName: 'PAWPAW Plan',
      planStatus: 'PENDING',
    };

    /**
     * The question is asked of the server, in the shape the api's filter answers.
     *
     * Every parameter here is load-bearing and each has cost this repository something before.
     * `planStatus` because the choice is on `directory_link` and `GET /api/patients` cannot see it.
     * `size` because a list endpoint with no size returns 20. `sort` on `lastEventAt` because this
     * is a queue — what puts a row at the top is the choice having been heard recently, not the
     * patient having registered recently, and those are years apart for somebody who has been on the
     * network a while.
     */
    it('asks the server for the pending choices rather than filtering a page here', async () => {
      TestBed.tick();
      expectListRequest().flush([]);
      await vitest.runAllTimersAsync();

      const req = httpMock.expectOne(isPlanChoiceLookup);
      expect(req.request.params.get('planStatus')).toBe('PENDING');
      expect(req.request.params.get('size')).toBe('5');
      expect(req.request.params.get('sort')).toBe('lastEventAt,desc');

      req.flush([pending], { headers: { 'X-Total-Count': '9' } });
      await vitest.runAllTimersAsync();

      expect(comp.planChoices()).toHaveLength(1);
      // The count is the queue, not the page: four rows are shown and nine are waiting.
      expect(comp.planChoiceTotal()).toBe(9);
      expect(comp.planChoiceOverflow()).toBe(8);
    });

    /**
     * The panel is hidden under a filter, under Show archived, and when there is nothing in it.
     *
     * The first two because the chips and the archive toggle describe the table below and this panel
     * is not part of it — leaving it up beside a directory filtered to SUSPENDED would read as a
     * claim that these are suspended patients' choices. The third because a queue with nothing in it
     * is not information, and a quiet day's directory should be the screen it was before this
     * existed.
     */
    it('shows only when there is something to act on and no filter is narrowing the table', async () => {
      TestBed.tick();
      expectListRequest().flush([]);
      await vitest.runAllTimersAsync();
      httpMock.expectOne(isPlanChoiceLookup).flush([pending], { headers: { 'X-Total-Count': '1' } });
      await vitest.runAllTimersAsync();

      expect(comp.showPlanChoices()).toBe(true);

      comp.status.set('SUSPENDED');
      expect(comp.showPlanChoices()).toBe(false);
      comp.status.set(null);
      comp.showArchived.set(true);
      expect(comp.showPlanChoices()).toBe(false);

      comp.showArchived.set(false);
      comp.planChoices.set([]);
      expect(comp.showPlanChoices()).toBe(false);
    });

    /**
     * A row is named from the link, exactly as the directory below names a patient with no profile.
     *
     * Both states reach this panel — the `test` fixture has `a13`, a patient learned from an event,
     * choosing a tier for exactly this reason — and neither may fall back to an id. Item 45 was
     * reported from production as a corrupted record because a 24-character ObjectId was rendered
     * where a name goes; a second surface doing it is the same defect one screen along.
     */
    it('names a row from the link and never from an id', () => {
      expect(comp.planChoiceName(pending)).toBe('k.darkwa@mail.gh');
      expect(comp.planChoiceName({ id: 'link-2', localId: 'a14', planCode: 'PEAR' })).toBeNull();
      // Not the externalKey either, which for an hc-professional link is a UUID.
      expect(comp.planChoiceName({ id: 'link-3', externalKey: '9f1c3e77-52aa-4a0b-9a5c-6b3f1d7e0a11' })).toBeNull();
    });

    /**
     * The tier resolves against this console's catalogue, and its three absences stay distinct.
     *
     * `undefined` while the catalogue is out, `null` once it has answered and holds nothing by that
     * code, and a plan with a null `monthlyPrice` for the tier item 51 leaves unpriced. Collapsing
     * any two of them is the failure: "not in this catalogue" said about every row because a request
     * has not come back is a confident wrong answer, and a zero where a price is unknown reads as
     * free.
     */
    it('tells "still asking" from "no such tier" from "no price set"', async () => {
      TestBed.tick();
      expectListRequest().flush([]);
      await vitest.runAllTimersAsync();

      // Before the catalogue answers, nothing is claimed about any tier.
      expect(comp.chosenPlan(pending)).toBeUndefined();
      expect(comp.isUncataloguedPlan(pending)).toBe(false);

      httpMock.expectOne(isPlanChoiceLookup).flush([]);
      httpMock
        .expectOne(r => r.url.endsWith('/api/service-plans'))
        .flush([
          { id: 'pl2', name: 'PAWPAW Plan', code: 'PAWPAW', currency: 'GHS', monthlyPrice: 5000 },
          // Item 51's own fixture state: a tier the sync created that nobody has priced.
          { id: 'pl3', name: 'MELON Plan', code: 'MELON', currency: 'GHS', monthlyPrice: null },
          // A plan an administrator made before the catalogue was reconciled. It has no code, and it
          // must not become the answer for every choice whose code is missing.
          { id: 'pl9', name: 'A legacy plan', code: null, currency: 'GHS', monthlyPrice: 120 },
        ]);
      await vitest.runAllTimersAsync();

      expect(comp.chosenPlan(pending)?.monthlyPrice).toBe(5000);
      expect(comp.isUncataloguedPlan(pending)).toBe(false);

      const unpriced = { id: 'link-melon', planCode: 'MELON' };
      expect(comp.chosenPlan(unpriced)?.monthlyPrice).toBeNull();
      expect(comp.isUncataloguedPlan(unpriced)).toBe(false);

      // The tier Abofonsa has published and this catalogue has not synced. Said in words, and
      // nothing is invented for it.
      const unknown = { id: 'link-soursop', planCode: 'SOURSOP' };
      expect(comp.chosenPlan(unknown)).toBeNull();
      expect(comp.isUncataloguedPlan(unknown)).toBe(true);
    });

    /**
     * **A membership that names no tier says so, and claims nothing about the catalogue.**
     *
     * The state is real, not half-written: `Membership.plan` and `.name` carry no `@NotNull` on
     * hc-patient and their administrative CRUD path can create a membership with neither, so
     * `PlanChosen` publishes a real `membershipId` and `status` with nulls under the tier keys. The
     * api stores that as it arrives — the four fields move as a group — and this panel has to render
     * it.
     *
     * Before the item 48 review it rendered **two** wrong things for such a row: a blank cell where
     * the tier goes, and then "Not in this catalogue" beside it, which asserts something about
     * Abofonsa's catalogue for a membership that named nothing to look up. The second is the worse
     * one — it is a confident claim rather than an empty cell, which is the distinction item 45 was
     * reported for.
     */
    it('says a membership named no tier rather than blanking the cell or blaming the catalogue', async () => {
      TestBed.tick();
      expectListRequest().flush([]);
      await vitest.runAllTimersAsync();

      const noTier = { id: 'link-no-tier', localId: 'a5', email: 'yaa.a@mail.gh', planMembershipId: 'mem-a5-0204', planStatus: 'PENDING' };
      httpMock.expectOne(isPlanChoiceLookup).flush([noTier], { headers: { 'X-Total-Count': '1' } });
      httpMock
        .expectOne(r => r.url.endsWith('/api/service-plans'))
        .flush([{ id: 'pl2', name: 'PAWPAW Plan', code: 'PAWPAW', currency: 'GHS', monthlyPrice: 5000 }]);
      await vitest.runAllTimersAsync();

      expect(comp.hasTierNamed(noTier)).toBe(false);
      // And the catalogue is not blamed for it. This was true before the guard and is the assertion
      // that fails if somebody reverts isUncataloguedPlan to `chosenPlan(link) === null`.
      expect(comp.isUncataloguedPlan(noTier)).toBe(false);
      expect(comp.isUncataloguedPlan({ id: 'l', planCode: 'SOURSOP' })).toBe(true);
      // The row still belongs in the queue — it is a membership awaiting a decision, and dropping it
      // would lose the prompt and make the count disagree with the rows.
      expect(comp.planChoices()).toHaveLength(1);
      expect(comp.planChoiceTotal()).toBe(1);
      // And a row that DOES name a tier is unaffected by the guard.
      expect(comp.hasTierNamed({ id: 'l', planCode: 'PAWPAW' })).toBe(true);
    });

    /**
     * A failed catalogue read leaves every row saying "checking", never "not in this catalogue".
     *
     * The two sentences are different claims: one is this console not knowing yet, the other is an
     * assertion about Abofonsa's catalogue. `planCatalogueLoaded` is only set on success for exactly
     * this reason.
     */
    it('claims nothing about a tier when the catalogue read fails', async () => {
      TestBed.tick();
      expectListRequest().flush([]);
      await vitest.runAllTimersAsync();

      httpMock.expectOne(isPlanChoiceLookup).flush([]);
      httpMock.expectOne(r => r.url.endsWith('/api/service-plans')).error(new ProgressEvent('network'));
      await vitest.runAllTimersAsync();

      expect(comp.planCatalogueLoaded()).toBe(false);
      expect(comp.chosenPlan(pending)).toBeUndefined();
      expect(comp.isUncataloguedPlan(pending)).toBe(false);
    });

    /**
     * A failed read empties the queue rather than leaving yesterday's rows up.
     *
     * A stale prompt is worse than none here: acting on it means opening a record whose choice may
     * already have been dealt with.
     */
    it('empties the panel when the read fails rather than showing a stale queue', async () => {
      TestBed.tick();
      expectListRequest().flush([]);
      await vitest.runAllTimersAsync();
      httpMock.expectOne(isPlanChoiceLookup).flush([pending], { headers: { 'X-Total-Count': '1' } });
      await vitest.runAllTimersAsync();
      expect(comp.planChoices()).toHaveLength(1);

      comp.refresh();
      await vitest.runAllTimersAsync();
      expectListRequest().flush([]);
      httpMock.expectOne(isPlanChoiceLookup).error(new ProgressEvent('network'));
      await vitest.runAllTimersAsync();

      expect(comp.planChoices()).toEqual([]);
      expect(comp.planChoiceTotal()).toBe(0);
    });

    /**
     * **Refresh re-reads both the queue and the catalogue.**
     *
     * The queue because it is the part of this screen that changes without anybody here doing
     * anything — a patient picks a tier on another product. The catalogue because the sync is the
     * other thing that moves underneath: a row reading "not in this catalogue" becomes a resolvable
     * one the moment `ServicePlanCatalogueSyncService` brings the tier across, and without the second
     * read it would go on saying otherwise until a reload.
     */
    it('re-reads the queue and the catalogue on refresh', async () => {
      TestBed.tick();
      expectListRequest().flush([]);
      await vitest.runAllTimersAsync();
      httpMock.expectOne(isPlanChoiceLookup).flush([]);
      httpMock.expectOne(r => r.url.endsWith('/api/service-plans')).flush([]);
      await vitest.runAllTimersAsync();

      comp.refresh();
      await vitest.runAllTimersAsync();
      expectListRequest().flush([]);

      const again = httpMock.expectOne(isPlanChoiceLookup);
      expect(again.request.params.get('planStatus')).toBe('PENDING');
      again.flush([pending], { headers: { 'X-Total-Count': '1' } });
      httpMock.expectOne(r => r.url.endsWith('/api/service-plans')).flush([]);
      await vitest.runAllTimersAsync();

      expect(comp.planChoices()).toHaveLength(1);
    });

    /**
     * **The panel offers no action, and that absence is the decision rather than an omission.**
     *
     * Item 54 owns the outbound leg that tells hc-patient a choice was verified and it is
     * deliberately not built — it is blocked on their inbound consumer, which is blocked on this. A
     * control that recorded nothing anywhere would be the worst kind of working screen, and this
     * console has already removed one for the same reason (the patient Create button, 2026-08-28).
     * The row links to the record instead, which is where a decision is taken.
     *
     * Read off the template, like the Create-button absence one screen along: the way this goes wrong
     * is somebody adding a plausible "Approve" beside the View, and a component-level assertion
     * cannot see markup.
     */
    it('offers no approve control, because there is nowhere for the decision to go yet', () => {
      const template = readFileSync('src/main/webapp/app/entities/directory/patient/list/patient.html', 'utf8');
      const panel = template.slice(template.indexOf('data-cy="planChoices"'), template.indexOf('@if (hasFilter())'));

      expect(panel).toContain('data-cy="planChoiceViewButton"');
      expect(panel).not.toMatch(/planChoiceApprove|planChoiceVerify|approveChoice/);
      // And the reason is written where somebody would add it.
      expect(panel).toContain('item 54');
    });

    /**
     * **The tier cell is guarded, read off the template.**
     *
     * The component method is covered above; this is the other half. `{{ choice.planName ??
     * choice.planCode }}` outside the guard renders an empty cell for a membership that named no
     * tier, and the guard is one deletion away from being removed as redundant by somebody who has
     * only seen rows that have one. Every fixture short of production had only those rows until this
     * review added `dl-plan-a5`.
     */
    it('guards the tier cell rather than binding the tier unconditionally', () => {
      const template = readFileSync('src/main/webapp/app/entities/directory/patient/list/patient.html', 'utf8');
      const panel = template.slice(template.indexOf('data-cy="planChoices"'), template.indexOf('@if (hasFilter())'));

      expect(panel).toContain('hasTierNamed(choice)');
      expect(panel).toContain('hcAdminApp.directoryPatient.planChoices.noTier');
      // The tier binding must sit inside the guard, never before it.
      expect(panel.indexOf('hasTierNamed(choice)')).toBeLessThan(panel.indexOf('choice.planName ?? choice.planCode'));
    });

    /**
     * **The status is labelled "Reported", not "Status".**
     *
     * hc-patient's `MembershipResource` publishes on `POST` alone — `PUT` and `PATCH` write the
     * status and announce nothing — so a decision taken on their side afterwards reaches no topic and
     * this value goes on reading PENDING. A heading saying "Status" over it would be this screen
     * asserting a live state it cannot see, which is the shape of item 26's and item 25's failures:
     * a healthy service and a screen that is simply wrong.
     */
    it('labels the reported status as reported rather than as a live one', () => {
      const template = readFileSync('src/main/webapp/app/entities/directory/patient/list/patient.html', 'utf8');

      expect(template).toContain('hcAdminApp.directoryPatient.planChoices.column.reported');
      expect(template).not.toContain('hcAdminApp.directoryPatient.planChoices.column.status');
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

  /**
   * Backlog item 45: the name cell must never bind the record id.
   *
   * Read off the template rather than rendered, because the component method is already covered
   * and this is the other half — a future edit that puts `patient.id` back in the cell would leave
   * `displayName` correct and the screen wrong.
   */
  it('binds no record id in the name cell', () => {
    // Anchored on the directory table rather than on the first `dir-who` in the file, which is what
    // it was until backlog item 48 put a panel above the table. That panel has a name cell of its
    // own, so an unanchored search found it and asserted against the wrong markup — and had it
    // happened to contain `displayName(patient)` the case would have passed while covering nothing.
    // The rule is about the row an administrator clicks through to a record.
    const table = template.indexOf('data-cy="entityTable"');
    const cell = template.indexOf('class="dir-who"', table);
    const nameCell = template.slice(cell, template.indexOf('</td>', cell));

    expect(table).toBeGreaterThan(-1);
    expect(nameCell).toContain('displayName(patient)');
    expect(nameCell).not.toContain('{{ patient.id }}');
  });

  it('renders the incomplete-record label instead, and says why underneath', () => {
    expect(template).toContain('isUnidentified(patient)');
    expect(template).toContain('hcAdminApp.directoryPatient.unidentified');
    // The hint is chosen by the component rather than hard-coded, which is the fix for a single
    // hint that claimed "registered on the patient app" for rows with no link at all.
    expect(template).toContain('unidentifiedHintKey(patient)');
    expect(template).toContain('identityFromLinkKey(patient)');
  });

  /**
   * The old single hint must be gone from the template, not merely unreferenced.
   *
   * Asserted as an absence because the failure mode is a paste: both keys still exist as strings in
   * a reviewer's memory, and either one back in the template is a claim the code cannot support.
   */
  it.each(['hcAdminApp.directoryPatient.unidentifiedHint"', 'hcAdminApp.directoryPatient.identityFromLink"'])(
    'no longer states %s unconditionally',
    key => {
      expect(template).not.toContain(key);
    },
  );
});
