import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { Account } from 'app/core/auth/account.model';
import { AccountService } from 'app/core/auth/account.service';

import { ConsoleIdentityService } from './console-identity.service';

/**
 * Who the console greets, and — the part that actually matters — what it says when it does not know.
 *
 * <p>Item 15 reads as "use the profile name", and doing only that would be a regression. Production
 * holds no profiles, so the lookup 404s for every account there; a greeting built on the profile
 * alone renders "Good morning " with a space where the name goes, on the first screen of a console
 * nobody has signed into yet.
 *
 * <p>So each case below is one rung of the chain — profile, then account, then login — and the last
 * one is the one worth having.
 */
describe('console identity', () => {
  let service: ConsoleIdentityService;
  let accountService: AccountService;
  let httpMock: HttpTestingController;

  const account = (firstName: string | null, lastName: string | null, login = 'admin'): Account =>
    new Account(true, ['ROLE_ADMIN'], 'admin@localhost', firstName, 'en', lastName, login, null);

  /** The by-login profile read, answered with a profile or with the 404 that means there is none. */
  const answerProfile = (profile: Record<string, string> | null): void => {
    const requests = httpMock.match((request: HttpRequest<unknown>) => request.url.includes('profiles/by-account'));
    expect(requests.length).toBe(1);
    if (profile) {
      requests[0].flush(profile);
    } else {
      requests[0].flush(null, { status: 404, statusText: 'Not Found' });
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideTranslateService()],
    });
    accountService = TestBed.inject(AccountService);
    service = TestBed.inject(ConsoleIdentityService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('greets by the profile name when the account has a profile', () => {
    accountService.authenticate(account('Admin', 'User'));
    TestBed.tick();
    answerProfile({ id: 'profile-me', accountId: 'admin', firstName: 'Efua', lastName: 'Mensah' });

    expect(service.firstName()).toBe('Efua');
    expect(service.displayName()).toBe('Efua Mensah');
    expect(service.initials()).toBe('EM');
  });

  /** The production case: no profile anywhere, and the account's own name is the next best answer. */
  it('falls back to the account name when there is no profile', () => {
    accountService.authenticate(account('Admin', 'User'));
    TestBed.tick();
    answerProfile(null);

    expect(service.firstName()).toBe('Admin');
    expect(service.displayName()).toBe('Admin User');
  });

  /** And the last rung: a login is a poor greeting, but it is never an empty one. */
  it('falls back to the login when the account carries no name either', () => {
    accountService.authenticate(account(null, null, 'operator'));
    TestBed.tick();
    answerProfile(null);

    expect(service.firstName()).toBe('operator');
    expect(service.displayName()).toBe('operator');
    expect(service.initials()).toBe('OP');
  });

  /** The name must be right before the profile answers, not blank until it does. */
  it('has an answer before the profile request comes back', () => {
    accountService.authenticate(account('Admin', 'User'));
    TestBed.tick();

    expect(service.displayName()).toBe('Admin User');
    answerProfile({ id: 'profile-me', accountId: 'admin', firstName: 'Efua', lastName: 'Mensah' });
    expect(service.displayName()).toBe('Efua Mensah');
  });

  it('clears the name on sign-out rather than leaving the last person on the chrome', () => {
    accountService.authenticate(account('Admin', 'User'));
    TestBed.tick();
    answerProfile({ id: 'profile-me', accountId: 'admin', firstName: 'Efua', lastName: 'Mensah' });

    accountService.authenticate(null);
    TestBed.tick();

    expect(service.displayName()).toBe('');
    expect(service.firstName()).toBe('');
  });

  /** A profile that cannot be read is the same as one that is not there: fall back, do not blank. */
  it('falls back when the profile read fails outright', () => {
    accountService.authenticate(account('Admin', 'User'));
    TestBed.tick();
    httpMock
      .match((request: HttpRequest<unknown>) => request.url.includes('profiles/by-account'))
      .forEach(request => request.flush(null, { status: 500, statusText: 'Server Error' }));

    expect(service.displayName()).toBe('Admin User');
  });
});
