import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';

/**
 * The two anonymous halves of a password reset.
 *
 * <p>Gateway-relative, like the rest of `AccountSettingsService` — the admin service has no user
 * records and cannot mint or redeem a reset key. Both endpoints are `permitAll` in the gateway's
 * `SecurityConfiguration`, and they have to be: whoever is calling them cannot sign in by
 * definition.
 *
 * <p>These two are the only route by which an account created through `/api/admin/users` ever
 * reaches a working password. There is no self-registration on this stack — `/api/register` and
 * `/api/activate` were removed deliberately — so a new administrator's creation email points at
 * `/account/reset/finish?key=…` and nothing else does. That screen did not exist until 2026-09-02
 * and the link 404ed, which meant no admin-created account could be activated at all.
 */
@Injectable({ providedIn: 'root' })
export class PasswordResetService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  private readonly initUrl = this.applicationConfigService.getEndpointFor('api/account/reset-password/init');
  private readonly finishUrl = this.applicationConfigService.getEndpointFor('api/account/reset-password/finish');

  /**
   * Asks for a reset mail.
   *
   * <p>The body is the bare address, not an object: `AccountResource.requestPasswordReset` declares
   * `@RequestBody String mail`, so a `{ email }` wrapper would be stored as the address verbatim and
   * match nobody. The gateway answers 200 whether or not the address exists — it says so in a
   * comment — so a caller cannot use this to test which addresses are registered, and the screen
   * above must not report anything that would.
   */
  init(mail: string): Observable<object> {
    return this.http.post(this.initUrl, mail);
  }

  /**
   * Redeems a key.
   *
   * <p>`KeyAndPasswordVM` is `{ key, newPassword }` — `newPassword`, not `password`, and a mismatch
   * binds to null rather than failing, which the gateway then rejects as an invalid password length.
   * A key is single-use and expires 24 hours after it was minted; both cases come back as an error
   * with no body, which is why the screen can only offer the one message `reset.finish.messages.error`
   * carries.
   */
  finish(key: string, newPassword: string): Observable<object> {
    return this.http.post(this.finishUrl, { key, newPassword });
  }
}
