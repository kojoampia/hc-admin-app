import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of } from 'rxjs';

import dayjs from 'dayjs/esm';

import { DATE_FORMAT } from 'app/config/input.constants';
import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { Account } from 'app/core/auth/account.model';
import { IProfile, NewProfile } from 'app/entities/directory/profile/profile.model';

/**
 * The wire shape. `dateOfBirth` is a `LocalDate` on the api and a string in JSON; `IProfile` declares
 * a `dayjs.Dayjs`, and the form calls `.format()` on it.
 *
 * <p>Converting was missed when this service was written and could not be noticed: the read always
 * 404ed — see {@link AccountSettingsService.accountKey} — so the branch that touches a returned
 * profile had never once run. The first request that succeeded threw
 * `dateOfBirth.format is not a function` inside the subscriber, which Angular reports to the console
 * and nowhere else, so the screen quietly showed the empty create form it had always shown.
 */
type RestProfile = Omit<IProfile, 'dateOfBirth'> & { dateOfBirth?: string | null };

type NewRestProfile = Omit<NewProfile, 'dateOfBirth'> & { dateOfBirth?: string | null };

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
   * What `Profile.accountId` holds for a given account: the gateway **user id** — item 123's
   * migration, which turned this function's previous answer exactly around.
   *
   * Every method below goes through this rather than reading a field off the account at the call
   * site, because the mistake it prevents is silent in both directions. `Account` also carries
   * `login`, and the two are interchangeable-looking opaque strings. Reading with the wrong one
   * returns 404, which this service translates to "no profile yet", so the screen offers to create
   * a record that already exists; writing with the wrong one stores a profile no resolver on any
   * stack can find. Neither raises anything. This function returned the login until 2026-09-24 for
   * precisely that reason — the api's seed then held logins — and flipped when the api's item 123
   * translated the field to the account's `User.id` (estate rule: `account.id = profile.accountId`).
   *
   * **No fallback to the login.** That is the second join key item 123 exists to remove, and a
   * fallback would resolve against the migrated rows to nothing — or, worse, to whoever most
   * recently took a freed login. An account without an id cannot be joined at all: reads treat
   * that as "no profile" (see {@link findProfile}), writes refuse here, loudly, because storing a
   * profile under a blank key is the unfindable-record defect this function exists to prevent.
   * `GET /api/account` carries `id` on every response — see `account.model.ts` — so the refusal is
   * a contract violation being surfaced, not a state a real session reaches.
   */
  private static accountKey(account: Account): string {
    const id = account.id;
    if (!id) {
      throw new Error('This account carries no id, so it cannot be joined to a profile — see account.model.ts.');
    }
    return id;
  }

  /**
   * Wire shape to model, as every generated entity service does it.
   *
   * `dateOfBirth` is a `LocalDate` and arrives as `"1900-01-01"`; `IProfile` declares a
   * `dayjs.Dayjs` and the form calls `.format()` on it. Without this the first successful read
   * throws `dateOfBirth.format is not a function` in the subscriber — which Angular logs and
   * nothing else surfaces, so the screen shows the same empty create form as a missing profile.
   */
  private static fromServer(profile: RestProfile): IProfile {
    return { ...profile, dateOfBirth: profile.dateOfBirth ? dayjs(profile.dateOfBirth) : undefined };
  }

  /** And back. `dayjs.toJSON()` would send an instant where the api parses a `LocalDate`. */
  private static toServer<T extends IProfile | NewProfile>(profile: T): Omit<T, 'dateOfBirth'> & { dateOfBirth?: string | null } {
    return { ...profile, dateOfBirth: profile.dateOfBirth?.format(DATE_FORMAT) ?? null };
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
    // An account with no id can have no profile here: the join key does not exist, so there is
    // nothing to ask. Answering null keeps the greeting chain and the account screen on their
    // fallbacks instead of crashing the chrome over a contract violation a read cannot repair.
    // The write paths refuse instead — see accountKey.
    if (!account.id) {
      return of(null);
    }
    const key = AccountSettingsService.accountKey(account);
    return new Observable<RestProfile | null>(subscriber => {
      const subscription = this.http.get<RestProfile>(`${this.profileByAccountUrl}/${encodeURIComponent(key)}`).subscribe({
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
    }).pipe(map(profile => (profile ? AccountSettingsService.fromServer(profile) : null)));
  }

  /** `accountId` is set from the account, never from the form — see {@link accountKey}. */
  createProfile(account: Account, profile: NewProfile): Observable<IProfile> {
    const body: NewRestProfile = {
      ...AccountSettingsService.toServer(profile),
      accountId: AccountSettingsService.accountKey(account),
    };
    return this.http.post<RestProfile>(this.profilesUrl, body).pipe(map(AccountSettingsService.fromServer));
  }

  /**
   * `accountId` is re-set on update as well as on create. A profile stored with the wrong key stays
   * wrong otherwise: `PUT` sends the whole document, and passing through what was read back would
   * preserve the bad link rather than correct it.
   */
  updateProfile(account: Account, profile: IProfile): Observable<IProfile> {
    const body: RestProfile = {
      ...AccountSettingsService.toServer(profile),
      accountId: AccountSettingsService.accountKey(account),
    };
    return this.http
      .put<RestProfile>(`${this.profilesUrl}/${encodeURIComponent(profile.id)}`, body)
      .pipe(map(AccountSettingsService.fromServer));
  }
}
