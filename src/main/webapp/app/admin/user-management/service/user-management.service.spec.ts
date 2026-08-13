import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { UserManagementService } from './user-management.service';

/**
 * The role picker on `admin/user-management/new|edit` is populated from `GET /api/authorities`.
 *
 * That path is the Authority entity's CRUD surface, so it answers with documents —
 * `[{"name":"ROLE_ADMIN"}, …]` — not the bare strings the service was typed for. TypeScript believed
 * the declaration, the template rendered each element directly, and every option in the select read
 * `[object Object]`.
 *
 * Nothing failed: not the request, not the form, not the save. It was wrong only on screen, which is
 * why a type annotation on an untyped HTTP response is worth this little suite.
 */
describe('UserManagementService authorities', () => {
  let service: UserManagementService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(UserManagementService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('turns authority documents into names', () => {
    let received: string[] | undefined;
    service.authorities().subscribe(authorities => (received = authorities));

    httpMock
      .expectOne(req => req.url.endsWith('api/authorities'))
      .flush([{ name: 'ROLE_ADMIN' }, { name: 'ROLE_USER' }, { name: 'ROLE_OPERATOR' }]);

    expect(received).toEqual(['ROLE_ADMIN', 'ROLE_USER', 'ROLE_OPERATOR']);
  });

  /** A document with no usable name would otherwise become an empty option nobody can pick. */
  it('drops entries with no name', () => {
    let received: string[] | undefined;
    service.authorities().subscribe(authorities => (received = authorities));

    httpMock.expectOne(req => req.url.endsWith('api/authorities')).flush([{ name: 'ROLE_ADMIN' }, {}, { name: '' }]);

    expect(received).toEqual(['ROLE_ADMIN']);
  });

  /**
   * The names go straight back to `/api/admin/users`, whose `AdminUserDTO.authorities` is a
   * `Set<String>`. The write side always wanted names; only the read side was wrapped.
   */
  it('produces values the write side accepts', () => {
    let received: string[] | undefined;
    service.authorities().subscribe(authorities => (received = authorities));

    httpMock.expectOne(req => req.url.endsWith('api/authorities')).flush([{ name: 'ROLE_ADMIN' }]);

    expect(received!.every(name => typeof name === 'string')).toBe(true);
  });
});
