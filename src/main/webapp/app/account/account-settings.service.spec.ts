import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { AccountSettingsService } from './account-settings.service';
import { Account } from 'app/core/auth/account.model';

/**
 * One page, two backends.
 *
 * The gateway owns the account and is the only thing that can change a credential; the admin service
 * owns the person. The addressing difference between them is the detail most likely to be got wrong
 * later, and it fails in opposite ways: a gateway path sent to the admin service 404s, and an
 * entity path sent gateway-relative reaches the gateway's own surface, which is how 23 entity
 * services broke before hc-admin-app#6.
 */
describe('AccountSettingsService', () => {
  let service: AccountSettingsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AccountSettingsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('addressing', () => {
    it('asks the gateway about the account, without a microservice segment', () => {
      service.save(AccountSettingsService.settingsFrom(anAccount())).subscribe();

      const req = httpMock.expectOne(r => r.url.endsWith('api/account'));
      expect(req.request.url).not.toContain('services/');
      req.flush({});
    });

    it('asks the admin service about the profile, with one', () => {
      service.findProfile('acct-1').subscribe();

      const req = httpMock.expectOne(r => r.url.includes('api/profiles/by-account'));
      expect(req.request.url).toContain('services/hcadminservice/');
      req.flush({}, { status: 404, statusText: 'Not Found' });
    });
  });

  describe('finding a profile', () => {
    /**
     * The case that decides what the screen offers. Production holds no profiles at all, so this is
     * the path every administrator hits first — and if a 404 surfaced as an error the page would
     * report a failure instead of offering to create one.
     */
    it('answers null when the account has no profile, rather than failing', () => {
      let result: unknown = 'untouched';
      let errored = false;
      service.findProfile('acct-with-none').subscribe({ next: value => (result = value), error: () => (errored = true) });

      httpMock.expectOne(r => r.url.includes('by-account')).flush(null, { status: 404, statusText: 'Not Found' });

      expect(errored).toBe(false);
      expect(result).toBeNull();
    });

    it('returns the profile when there is one', () => {
      let result: any;
      service.findProfile('acct-1').subscribe(value => (result = value));

      httpMock.expectOne(r => r.url.includes('by-account')).flush({ id: 'p1', firstName: 'Ama', accountId: 'acct-1' });

      expect(result.firstName).toEqual('Ama');
    });

    /** A real failure must still be a failure — swallowing every error would hide an outage. */
    it('still reports errors that are not a missing profile', () => {
      let errored = false;
      service.findProfile('acct-1').subscribe({ error: () => (errored = true) });

      httpMock.expectOne(r => r.url.includes('by-account')).flush('boom', { status: 500, statusText: 'Server Error' });

      expect(errored).toBe(true);
    });
  });

  describe('saving', () => {
    it('posts the whole account, not just the edited fields', () => {
      // The gateway replaces the record, so omitting authorities or activated would strip them.
      service.save({ ...AccountSettingsService.settingsFrom(anAccount()), firstName: 'Changed' }).subscribe();

      const req = httpMock.expectOne(r => r.url.endsWith('api/account'));
      expect(req.request.body.authorities).toEqual(['ROLE_ADMIN']);
      expect(req.request.body.login).toEqual('admin');
      expect(req.request.body.firstName).toEqual('Changed');
      req.flush({});
    });

    it('creates a profile with POST and updates one with PUT', () => {
      service.createProfile({ id: null, accountId: 'acct-1' }).subscribe();
      const created = httpMock.expectOne(r => r.method === 'POST' && r.url.endsWith('api/profiles'));
      expect(created.request.body.accountId).toEqual('acct-1');
      created.flush({ id: 'p1' });

      service.updateProfile({ id: 'p1', accountId: 'acct-1' }).subscribe();
      const updated = httpMock.expectOne(r => r.method === 'PUT');
      expect(updated.request.url).toContain('api/profiles/p1');
      updated.flush({ id: 'p1' });
    });
  });

  function anAccount(): Account {
    return new Account(true, ['ROLE_ADMIN'], 'admin@abofonsa.com', 'Administrator', 'en', 'Account', 'admin', null, 'acct-1');
  }
});
