import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { Account } from 'app/core/auth/account.model';
import { AccountService } from 'app/core/auth/account.service';

import { ShellCountersService } from './shell-counters.service';

/**
 * The two badges on the sidebar and the tab bar, and when they are first read.
 *
 * <p>Item 16: they never appeared. Every caller of `refresh()` was an action on the message desk or
 * the task board, so a session that never opened those two screens showed both at their initial
 * `0` — which is not "not loaded", it is "nothing to do", and the shell said it on every screen.
 *
 * <p>The fix deliberately is not one more call site. Sign-in drives the first read, so a shell
 * component added later inherits the behaviour instead of having to remember it, and sign-out
 * clears the numbers rather than leaving one user's backlog on the next one's chrome.
 */
describe('shell counters', () => {
  let service: ShellCountersService;
  let accountService: AccountService;
  let httpMock: HttpTestingController;

  const account = new Account(true, ['ROLE_ADMIN'], 'admin@localhost', 'Admin', 'en', 'User', 'admin', null);

  const counted = (fragment: string, total: number): void => {
    const requests = httpMock.match((request: HttpRequest<unknown>) => request.url.includes(fragment));
    expect(requests.length).toBe(1);
    requests[0].flush([], { headers: { 'X-Total-Count': String(total) } });
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideTranslateService()],
    });
    accountService = TestBed.inject(AccountService);
    service = TestBed.inject(ShellCountersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('reads both counts when an account arrives, with no screen having asked', () => {
    accountService.authenticate(account);
    TestBed.tick();

    counted('messages', 3);
    counted('tasks', 9);

    expect(service.unreadMessages()).toBe(3);
    expect(service.openTasks()).toBe(9);
  });

  /** Nothing is read for nobody: an anonymous shell must not query the two collections. */
  it('reads nothing while signed out', () => {
    TestBed.tick();

    expect(httpMock.match(() => true).length).toBe(0);
    expect(service.unreadMessages()).toBe(0);
  });

  it('clears both counts on sign-out rather than leaving the last numbers up', () => {
    accountService.authenticate(account);
    TestBed.tick();
    counted('messages', 3);
    counted('tasks', 9);

    accountService.authenticate(null);
    TestBed.tick();

    expect(service.unreadMessages()).toBe(0);
    expect(service.openTasks()).toBe(0);
    expect(httpMock.match(() => true).length).toBe(0);
  });

  /**
   * The counts are the header, never the body.
   *
   * <p>A badge that counted `body.length` would agree with the header at ten rows and disagree at
   * every number above the page size, reading `20` for a desk holding sixty.
   */
  it('counts from X-Total-Count with a one-row page', () => {
    accountService.authenticate(account);
    TestBed.tick();

    const messages = httpMock.match((request: HttpRequest<unknown>) => request.url.includes('messages'));
    expect(messages[0].request.params.get('size')).toBe('1');
    expect(messages[0].request.params.get('status.equals')).toBe('NEW');
    messages[0].flush([], { headers: { 'X-Total-Count': '42' } });
    counted('tasks', 0);

    expect(service.unreadMessages()).toBe(42);
  });
});
