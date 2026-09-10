import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { ADMIN_SERVICE } from 'app/config/microservice.constants';

/**
 * The two halves of the sign-in dashboard, and they come from two different services.
 *
 * That is not an accident of layout — it is where the data is. hc-admin-gateway owns
 * authentication and its own `jhi_user` collection and is the only thing that can see a sign-in
 * attempt at all. hc-admin-service owns `directory_link`, which is where a patient's or a
 * clinician's registration on a sibling stack arrives. Neither can answer the other's question:
 * the api runs `skipUserManagement: true` and has no route to the gateway's users, and the gateway
 * consumes no domain events.
 *
 * So the screen makes two requests, and each is addressed the way its owner is reached — see the
 * two `resourceUrl`s below, which are the whole reason this file has a comment.
 */

/**
 * Registrations across BridgeCare, from `directory_link` — **the headline figure.**
 *
 * These are the people who registered on hc-patient and hc-professional: patients, care angels and
 * clinicians. It is the number an operator means by "registrations".
 *
 * **Three buckets, not two.** `notReported` is not a synonym for `notActivated` and must never be
 * merged into it or rendered as it. `DirectoryLink.activated` is nullable because a clinician known
 * only from an `onboarding.state` frame has told this estate nothing either way — counting them as
 * barred from signing in would assert something no event has said, which is a defect the api has
 * already shipped once and records on that field.
 */
export interface RegistrationTotals {
  activated: number;
  notActivated: number;
  /** No event has said. A real, common and permanent state — see above. */
  notReported: number;
  /** Carried by the server rather than summed here, so a dropped bucket is visible. */
  total: number;
  bySource: SourceTotals[];
}

export interface SourceTotals {
  source: string;
  activated: number;
  notActivated: number;
  notReported: number;
  total: number;
}

/**
 * Sign-in activity on hc-admin-gateway.
 *
 * `accounts` counts **console staff accounts on this gateway** — administrators and operators an
 * administrator created. It is a small number by design: there is no self-registration on this
 * stack, deliberately. It is *not* the estate's registrations, and the screen labels both cards in
 * words so the two cannot be read as one figure.
 *
 * Everything under `logins` is over `windowDays`, which the server sends rather than the caption
 * assuming.
 */
export interface AuthActivity {
  accounts: GatewayAccounts;
  logins: LoginTotals;
  /** Render this. The caption must never claim a window nobody measured. */
  windowDays: number;
  /** How long the gateway keeps an attempt. Always at least `windowDays`. */
  retentionDays: number;
}

/**
 * Two buckets here, and that is correct rather than inconsistent with `RegistrationTotals`.
 *
 * `User.activated` on the gateway is a primitive boolean with a `false` default, so every staff
 * account has an answer. The nullable one is the estate-wide field, which is a different question
 * asked of a different collection.
 */
export interface GatewayAccounts {
  activated: number;
  notActivated: number;
}

export interface LoginTotals {
  succeeded: number;
  failed: number;
  /** One point per day of the window, oldest first, including the days nothing happened. */
  daily: DayCount[];
  /**
   * The logins most often failed against.
   *
   * **These are logins exactly as they were typed**, which on a failure is usually not the account
   * holder — a guess, a typo, or a password pasted into the wrong box. The gateway gates the whole
   * endpoint on `ROLE_ADMIN` alone for this reason, narrower than every other read this console
   * makes. Do not copy these values anywhere with a lifetime of its own.
   */
  topFailedLogins: FailedLogin[];
}

export interface DayCount {
  /** `YYYY-MM-DD`, in UTC — the aggregation buckets on an instant. */
  day: string;
  succeeded: number;
  failed: number;
}

export interface FailedLogin {
  login: string;
  failures: number;
}

@Injectable({ providedIn: 'root' })
export class AuthActivityService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  /**
   * Gateway-relative, with **no** microservice segment — the same shape as `CredentialService`.
   *
   * `login_attempt` and `jhi_user` live in the gateway's own Mongo and the api cannot see either,
   * so routing this through `services/hcadminservice/` would reach a service that has no such
   * endpoint. The inverse mistake is documented next door on `ConsoleMetricsService`, whose comment
   * records a gateway-relative call 404ing in production with no screen reporting it.
   */
  private readonly authActivityUrl = this.applicationConfigService.getEndpointFor('api/auth-activity');

  /** And this one is the api's, so it does carry the segment. */
  private readonly registrationsUrl = this.applicationConfigService.getEndpointFor('api/directory-links/registrations', ADMIN_SERVICE);

  authActivity(): Observable<AuthActivity> {
    return this.http.get<AuthActivity>(this.authActivityUrl);
  }

  registrations(): Observable<RegistrationTotals> {
    return this.http.get<RegistrationTotals>(this.registrationsUrl);
  }
}
