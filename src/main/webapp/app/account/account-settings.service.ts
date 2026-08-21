import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { Account } from 'app/core/auth/account.model';
import { IProfile, NewProfile } from 'app/entities/directory/profile/profile.model';

/** What `POST /api/account` accepts: the account's own editable fields. */
export interface AccountSettings {
  firstName: string | null;
  lastName: string | null;
  email: string;
  langKey: string;
  login: string;
  imageUrl: string | null;
  activated: boolean;
  authorities: string[];
}

export interface PasswordChange {
  currentPassword: string;
  newPassword: string;
}

/**
 * The signed-in administrator's own account and profile.
 *
 * <p>Two backends, because the person is stored in two places and neither knows about the other.
 * The gateway owns the account — login, name, email, language, password — and is the only thing that
 * can change a credential. The admin service owns the Profile: title, date of birth, sex, ID, phone,
 * address. They are joined by `Profile.accountId`, which is the gateway's user id.
 *
 * This service is the only place that has to know that, so the screen above it can present one page.
 */
@Injectable({ providedIn: 'root' })
export class AccountSettingsService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  /** Gateway-relative. The admin service has no user records — see credential.model.ts. */
  private readonly accountUrl = this.applicationConfigService.getEndpointFor('api/account');
  private readonly passwordUrl = this.applicationConfigService.getEndpointFor('api/account/change-password');

  /**
   * The profile belonging to an account.
   *
   * `hcadminservice` here and gateway-relative above, in the same class. That asymmetry is the whole
   * point of this service: accounts live on the gateway, people live in the admin service.
   */
  private readonly profileByAccountUrl = this.applicationConfigService.getEndpointFor('api/profiles/by-account', 'hcadminservice');

  private readonly profilesUrl = this.applicationConfigService.getEndpointFor('api/profiles', 'hcadminservice');

  /** The account as the form needs it, from the one the session already holds. */
  static settingsFrom(account: Account): AccountSettings {
    return {
      firstName: account.firstName,
      lastName: account.lastName,
      email: account.email,
      langKey: account.langKey,
      login: account.login,
      imageUrl: account.imageUrl,
      activated: account.activated,
      authorities: account.authorities,
    };
  }

  /**
   * What `Profile.accountId` holds for a given account: the gateway **login**.
   *
   * Every method below goes through this rather than reading a field off the account at the call
   * site, because the mistake it prevents is silent in both directions. `Account` also carries `id`
   * — the gateway user id — and the two are interchangeable-looking opaque strings. Reading with the
   * wrong one returns 404, which this service translates to "no profile yet", so the screen offers
   * to create a record that already exists; writing with the wrong one stores a profile no resolver
   * on any of the three stacks can find. Neither raises anything.
   *
   * The login is the JWT subject, so it is the one identifier every stack's token carries. See the
   * api's `ProfileRepository.findByAccount`, and hc-professional's `OnboardingService`, which
   * force-sets the same field the same way for the same reason.
   */
  private static accountKey(account: Account): string {
    return account.login;
  }

  save(settings: AccountSettings): Observable<object> {
    return this.http.post(this.accountUrl, settings);
  }

  changePassword(change: PasswordChange): Observable<object> {
    return this.http.post(this.passwordUrl, change);
  }

  /**
   * Answers `null` when the account has no profile.
   *
   * The api returns 404 for that, which is a normal answer rather than an error — most accounts have
   * no profile and production has none at all. Translating it here means the screen can decide
   * between "edit" and "create" without treating a missing profile as a failure, and without every
   * caller having to know that a 404 is expected.
   */
  findProfile(account: Account): Observable<IProfile | null> {
    const key = AccountSettingsService.accountKey(account);
    return new Observable<IProfile | null>(subscriber => {
      const subscription = this.http.get<IProfile>(`${this.profileByAccountUrl}/${encodeURIComponent(key)}`).subscribe({
        next(profile) {
          subscriber.next(profile);
          subscriber.complete();
        },
        error(error) {
          if (error.status === 404) {
            subscriber.next(null);
            subscriber.complete();
          } else {
            subscriber.error(error);
          }
        },
      });
      return () => subscription.unsubscribe();
    });
  }

  /** `accountId` is set from the account, never from the form — see {@link accountKey}. */
  createProfile(account: Account, profile: NewProfile): Observable<IProfile> {
    return this.http.post<IProfile>(this.profilesUrl, { ...profile, accountId: AccountSettingsService.accountKey(account) });
  }

  /**
   * `accountId` is re-set on update as well as on create. A profile stored with the wrong key stays
   * wrong otherwise: `PUT` sends the whole document, and passing through what was read back would
   * preserve the bad link rather than correct it.
   */
  updateProfile(account: Account, profile: IProfile): Observable<IProfile> {
    const body = { ...profile, accountId: AccountSettingsService.accountKey(account) };
    return this.http.put<IProfile>(`${this.profilesUrl}/${encodeURIComponent(profile.id)}`, body);
  }
}
