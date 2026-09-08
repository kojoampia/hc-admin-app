import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { PLAN_STATUS_PENDING, hasPlanChoice, hasProfileStatus, resolveClinicianLogin, resolveLinkIdentity } from '../directory-link.model';
import { DirectoryLinkService } from './directory-link.service';

describe('DirectoryLinkService', () => {
  let service: DirectoryLinkService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DirectoryLinkService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('asks the gateway-routed microservice path, not the gateway itself', () => {
    service.findByLocalIds(['a1']).subscribe();

    const req = httpMock.expectOne(r => r.url.includes('directory-links'));
    // A request to `api/directory-links` reaches the gateway's own surface and 404s. Every entity
    // read has to go through `services/hcadminservice/`.
    expect(req.request.url).toContain('services/hcadminservice/api/directory-links');
    req.flush([]);
  });

  it('sends one request for many ids, and asks for as many rows as it named', () => {
    service.findByLocalIds(['a1', 'a2', 'a3']).subscribe();

    const req = httpMock.expectOne(r => r.url.includes('directory-links'));
    expect(req.request.params.getAll('localId.in')).toEqual(['a1', 'a2', 'a3']);
    // Without an explicit size the server returns 20, and a page of more than 20 nameless rows
    // would silently resolve the first 20 only — the RELATIONSHIP_OPTIONS_PAGE_SIZE trap.
    expect(req.request.params.get('size')).toBe('3');
    req.flush([]);
  });

  it('deduplicates and drops empties before asking', () => {
    service.findByLocalIds(['a1', 'a1', '', 'a2']).subscribe();

    const req = httpMock.expectOne(r => r.url.includes('directory-links'));
    expect(req.request.params.getAll('localId.in')).toEqual(['a1', 'a2']);
    req.flush([]);
  });

  /**
   * The empty case must not reach the network at all.
   *
   * `createRequestOption` drops empty values, so `localId.in: []` would build a URL carrying no
   * filter — and the server would answer with the first page of the whole link collection, which
   * the caller would then map onto rows it never asked about.
   */
  it('makes no request when there is nothing to resolve', async () => {
    const result = await new Promise(resolve => service.findByLocalIds([]).subscribe(resolve));

    expect(result).toEqual(new Map());
    httpMock.expectNone(() => true);
  });

  it('keys the answer by localId and skips a link that names no local record', () => {
    let resolved: Map<string, unknown> | undefined;
    service.findByLocalIds(['a1', 'a2']).subscribe(links => (resolved = links));

    httpMock
      .expectOne(r => r.url.includes('directory-links'))
      .flush([
        { id: 'link-1', localId: 'a1', email: 'ama@example.com' },
        // A care angel or a clinician keeps no local record; it can never match a patient row.
        { id: 'link-2', localId: null, email: 'angel@example.com' },
      ]);

    expect(resolved?.size).toBe(1);
    expect(resolved?.get('a1')).toEqual(expect.objectContaining({ email: 'ama@example.com' }));
  });
});

describe('findUnlinked', () => {
  let service: DirectoryLinkService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DirectoryLinkService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('asks for one source, unlinked only, newest first', () => {
    service.findUnlinked('HC_PROFESSIONAL', 5).subscribe();

    const req = httpMock.expectOne(r => r.url.includes('directory-links'));
    expect(req.request.params.get('source')).toBe('HC_PROFESSIONAL');
    // Without this the answer is every link, including hc-patient's care angels and erased
    // subjects, which are unlinked too and are not clinicians.
    expect(req.request.params.get('unlinked')).toBe('true');
    // Explicit, for the same reason findByLocalIds sends one: no size means 20.
    expect(req.request.params.get('size')).toBe('5');
    expect(req.request.params.get('sort')).toBe('firstSeenAt,desc');
    req.flush([]);
  });

  /**
   * The total is the server's, not the page's.
   *
   * A panel that shows five rows and counts what it received reports its own page size as the number
   * of clinicians waiting — a figure that stops moving at five however many register.
   */
  it('takes the total from X-Total-Count rather than from the rows it received', () => {
    let page: { total: number; links: unknown[] } | undefined;
    service.findUnlinked('HC_PROFESSIONAL', 2).subscribe(answer => (page = answer));

    httpMock.expectOne(r => r.url.includes('directory-links')).flush([{ id: 'l1' }, { id: 'l2' }], { headers: { 'X-Total-Count': '17' } });

    expect(page?.links).toHaveLength(2);
    expect(page?.total).toBe(17);
  });

  /**
   * A missing header falls back to the rows, not to zero.
   *
   * The header not arriving would mean pagination headers had stopped surviving the gateway and
   * nginx — which has happened to this stack before — and reporting that as "nobody is waiting" is
   * the quiet wrong answer. The rows in hand are a floor.
   */
  it('does not report zero when the count header is missing', () => {
    let page: { total: number } | undefined;
    service.findUnlinked('HC_PROFESSIONAL', 5).subscribe(answer => (page = answer));

    httpMock.expectOne(r => r.url.includes('directory-links')).flush([{ id: 'l1' }]);

    expect(page?.total).toBe(1);
  });
});

/**
 * The plan choices awaiting a decision — backlog item 48.
 *
 * The third question this endpoint answers, and the third for which "read everything and filter
 * here" is the wrong shape: the choice is on `directory_link` rather than on `Patient`, so
 * `GET /api/patients` cannot see it, and the collection grows at the rate two other stacks create
 * accounts.
 */
describe('findPlanChoices', () => {
  let service: DirectoryLinkService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DirectoryLinkService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('asks the server for one reported status, most recently heard first', () => {
    service.findPlanChoices(PLAN_STATUS_PENDING, 5).subscribe();

    const req = httpMock.expectOne(r => r.url.includes('directory-links'));
    expect(req.request.params.get('planStatus')).toBe('PENDING');
    // Explicit, for the reason the two methods above send one: no size means 20.
    expect(req.request.params.get('size')).toBe('5');
    // The queue is ordered by when the choice was HEARD, not by when the patient registered. Those
    // are years apart for somebody long on the network who has just changed tier — and `firstSeenAt`,
    // which the clinician panel sorts on, would bury every one of those at the bottom.
    expect(req.request.params.get('sort')).toBe('lastEventAt,desc');
    // Deliberately not asked: this is not the unlinked question. Every plan choice names a patient
    // this service already holds, so `unlinked=true` would answer with none of them.
    expect(req.request.params.has('unlinked')).toBe(false);
    req.flush([]);
  });

  it('takes the total from X-Total-Count rather than from the rows it received', () => {
    let page: { total: number; links: unknown[] } | undefined;
    service.findPlanChoices(PLAN_STATUS_PENDING, 5).subscribe(answer => (page = answer));

    httpMock.expectOne(r => r.url.includes('directory-links')).flush([{ id: 'l1' }, { id: 'l2' }], { headers: { 'X-Total-Count': '23' } });

    expect(page?.links).toHaveLength(2);
    expect(page?.total).toBe(23);
  });
});

describe('resolveLinkIdentity', () => {
  it('prefers the address, which is the handle the person themselves would give', () => {
    expect(resolveLinkIdentity({ id: 'l', email: 'ama@example.com', login: 'amensah' })).toBe('ama@example.com');
  });

  it('falls back to the login when there is no address', () => {
    expect(resolveLinkIdentity({ id: 'l', login: 'amensah' })).toBe('amensah');
  });

  /**
   * `externalKey` is deliberately not a third fallback.
   *
   * For a patient it equals `email` and adds nothing. For a professional it is an opaque
   * `accountId` — a UUID — which is the same unreadable-identifier-as-a-name defect backlog item 45
   * exists to remove, one field along.
   */
  it('never returns the correlation key', () => {
    expect(resolveLinkIdentity({ id: 'l', externalKey: '9f1c3e77-52aa-4a0b-9a5c-6b3f1d7e0a11' })).toBeNull();
  });

  it('treats blank and missing alike, so a whitespace field is not a name', () => {
    expect(resolveLinkIdentity({ id: 'l', email: '   ', login: '' })).toBeNull();
    expect(resolveLinkIdentity({ id: 'l' })).toBeNull();
    expect(resolveLinkIdentity(null)).toBeNull();
    expect(resolveLinkIdentity(undefined)).toBeNull();
  });
});

/**
 * The clinician's name, which is a different rule from the patient's and is meant to be.
 *
 * Backlog item 47 names `login` as what the console shows for a clinician and says of `email` that
 * it is "for correlation, not for display"; item 43 had already taken the same value out of every log
 * line. The patient directory shows the address on purpose, and `DirectoryLinkResource`'s javadoc
 * argues why — so the two functions exist side by side rather than one being a refinement of the
 * other, and the pair of suites below is what stops either drifting onto the other's rule.
 */
describe('resolveClinicianLogin', () => {
  it('shows the login', () => {
    expect(resolveClinicianLogin({ id: 'l', login: 'kquartey' })).toBe('kquartey');
  });

  /**
   * The case that tells a preference from a rule.
   *
   * A row carrying both would be satisfied by either function, so only a row with an address and no
   * login can show that the address is refused rather than merely ranked second.
   */
  it('never falls back to the address, even when there is nothing else', () => {
    expect(resolveClinicianLogin({ id: 'l', email: 'k.quartey@abofonsa.care' })).toBeNull();
    expect(resolveClinicianLogin({ id: 'l', login: 'kquartey', email: 'k.quartey@abofonsa.care' })).toBe('kquartey');
  });

  /** And not the correlation key either, which for a clinician is an accountId — a UUID. */
  it('never returns the correlation key', () => {
    expect(resolveClinicianLogin({ id: 'l', externalKey: '9f1c3e77-52aa-4a0b-9a5c-6b3f1d7e0a11' })).toBeNull();
  });

  it('treats blank and missing alike, so a whitespace login is not a name', () => {
    expect(resolveClinicianLogin({ id: 'l', login: '   ' })).toBeNull();
    expect(resolveClinicianLogin({ id: 'l' })).toBeNull();
    expect(resolveClinicianLogin(null)).toBeNull();
    expect(resolveClinicianLogin(undefined)).toBeNull();
  });
});

/**
 * Whether phase 2 has arrived, which every "unknown" on the clinician row branches on.
 *
 * It reads `profileEventAt` rather than `profileComplete` or `profileId`, and that is the whole
 * content of the function: either of those can legitimately be absent from a `ProfileStatus` that did
 * arrive, so reading their absence as "no profile status" would report a clinician's profile as
 * unreported on the strength of one missing field.
 */
describe('hasProfileStatus', () => {
  it('is true once a profile event has been applied', () => {
    expect(hasProfileStatus({ id: 'l', profileEventAt: '2026-09-02T14:47:05Z' })).toBe(true);
  });

  it('is true for a status that arrived carrying nothing but the identifiers', () => {
    expect(hasProfileStatus({ id: 'l', profileEventAt: '2026-09-02T14:47:05Z', profileComplete: null, profileId: null })).toBe(true);
  });

  it('is false when no profile event has been applied, whatever else the link carries', () => {
    expect(hasProfileStatus({ id: 'l', login: 'kquartey', activated: true })).toBe(false);
    expect(hasProfileStatus({ id: 'l' })).toBe(false);
    expect(hasProfileStatus(null)).toBe(false);
    expect(hasProfileStatus(undefined)).toBe(false);
  });
});

/**
 * Whether a row carries a plan choice at all — backlog item 48.
 *
 * `planCode` and not `planStatus`, on the same reasoning `hasProfileStatus` gives one contract along:
 * the api writes each of the four fields only when the event carried it, and hc-patient's
 * administrative path can create a membership with no status on it. A choice with no tier is not
 * something to put under a heading naming tiers.
 */
describe('hasPlanChoice', () => {
  it('is true once a tier has been chosen', () => {
    expect(hasPlanChoice({ id: 'l', planCode: 'PAWPAW', planStatus: 'PENDING' })).toBe(true);
  });

  it('is true for a choice whose status never arrived', () => {
    expect(hasPlanChoice({ id: 'l', planCode: 'PAWPAW' })).toBe(true);
  });

  it('is false for every row that has not chosen one', () => {
    expect(hasPlanChoice({ id: 'l', planStatus: 'PENDING' })).toBe(false);
    expect(hasPlanChoice({ id: 'l', email: 'ama@example.com' })).toBe(false);
    expect(hasPlanChoice(null)).toBe(false);
    expect(hasPlanChoice(undefined)).toBe(false);
  });
});
