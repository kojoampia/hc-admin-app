import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { PasswordResetService } from './password-reset.service';

/**
 * The wire contract with `AccountResource`, which is the half of this feature a component spec
 * cannot see.
 *
 * <p>Both mistakes these cases pin are silent rather than loud. A `services/hcadminservice/` prefix
 * would reach a service that has no user records — and, being a `/services/**` path, would be
 * rejected by the gateway before it got there, for an anonymous caller with no token. And the two
 * body shapes are unusual enough to be worth writing down: `init` takes the bare address because the
 * handler declares `@RequestBody String`, and `finish` spells the field `newPassword`, which binds
 * to null under any other name and comes back as a password-length rejection.
 */
describe('PasswordResetService', () => {
  let service: PasswordResetService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PasswordResetService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('asks the gateway to send a reset mail, with the bare address as the body', () => {
    service.init('efua.mensah@abofonsa.care').subscribe();

    const req = httpMock.expectOne('api/account/reset-password/init');
    expect(req.request.method).toBe('POST');
    // Gateway-relative. `getEndpointFor(api, 'hcadminservice')` would produce a `services/` segment
    // and address the wrong stack entirely.
    expect(req.request.url).not.toContain('services/');
    // A string, not `{ email: … }`. The handler is `@RequestBody String mail`, so an object would be
    // looked up verbatim and match nobody — and the gateway answers 200 either way, so the screen
    // would report success for a mail it never sent.
    expect(req.request.body).toBe('efua.mensah@abofonsa.care');
    req.flush(null);
  });

  it('redeems a key as { key, newPassword }', () => {
    service.finish('cy1yCud5CkXb4PHsv78G', 'Admin@01234').subscribe();

    const req = httpMock.expectOne('api/account/reset-password/finish');
    expect(req.request.method).toBe('POST');
    expect(req.request.url).not.toContain('services/');
    // The field names `KeyAndPasswordVM` declares. `password` instead of `newPassword` binds to
    // null, which `AccountResource.finishPasswordReset` rejects for length before it ever looks the
    // key up — reported to the caller exactly as an expired key is.
    expect(req.request.body).toEqual({ key: 'cy1yCud5CkXb4PHsv78G', newPassword: 'Admin@01234' });
    req.flush(null);
  });
});
