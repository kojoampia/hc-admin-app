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
  findProfile(accountId: string): Observable<IProfile | null> {
    return new Observable<IProfile | null>(subscriber => {
      const subscription = this.http.get<IProfile>(`${this.profileByAccountUrl}/${encodeURIComponent(accountId)}`).subscribe({
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

  createProfile(profile: NewProfile): Observable<IProfile> {
    return this.http.post<IProfile>(this.profilesUrl, profile);
  }

  updateProfile(profile: IProfile): Observable<IProfile> {
    return this.http.put<IProfile>(`${this.profilesUrl}/${encodeURIComponent(profile.id)}`, profile);
  }
}
