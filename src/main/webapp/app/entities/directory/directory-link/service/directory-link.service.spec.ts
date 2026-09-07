import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { resolveLinkIdentity } from '../directory-link.model';
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
