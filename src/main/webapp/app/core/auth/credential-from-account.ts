import { CredentialRole } from 'app/entities/enumerations/credential-role.model';
import { ICredential } from 'app/entities/platform/credential/credential.model';

import { Account } from './account.model';

/**
 * The gateway's `Account`, projected into the shape the console calls a Credential.
 *
 * There is no Credential entity behind the admin service and there never will be. The console model
 * excluded `Credential` and `CredentialRole` on purpose — hc-admin-gateway owns user records, the
 * admin service owns everything else, and the two live in different databases with no join between
 * them. `/services/hcadminservice/api/credentials` would 404 forever.
 *
 * What does exist is `GET /api/account` on the gateway, called straight after authentication, which
 * returns exactly the basic user information and authorities this screen wants. This function is
 * the seam between the two vocabularies, so the rest of the console can keep saying "credential"
 * without anything pretending an entity is there.
 *
 * Three fields of the old mock shape are gone rather than faked:
 *
 *   phoneNumber   — not on Account. The gateway does not carry one.
 *   passwordHash  — never leaves the gateway, and should not. It was always null in the mock.
 *   lastLoginAt   — not on Account. The gateway does not publish a last-login timestamp.
 *
 * Inventing values for those would put the console back where it started: a screen showing numbers
 * with nothing behind them.
 */
export const credentialFromAccount = (account: Account): ICredential => ({
  // The login is the gateway's stable handle for an account and is what the `sub` claim carries.
  // The database id is minted by the gateway and reaches this client only as the `uid` claim on the
  // token, which the console never decodes — so login is the identifier available here.
  id: account.login,
  email: account.email,
  role: primaryRole(account.authorities),
  enabled: account.activated,
});

/**
 * The one authority a screen can show in a single "role" column.
 *
 * An account holds several — every account carries `ROLE_USER` as a baseline alongside whatever
 * else it has — so picking the most specific one is the only way a single-valued column can be
 * honest. Ordered most-privileged first, and `ROLE_USER` is deliberately last: an account that has
 * only that is a plain user, and an account that has it alongside `ROLE_ADMIN` is an admin.
 *
 * Returns null rather than guessing when nothing matches, so an unrecognised authority reads as
 * "unknown" instead of silently becoming a user.
 */
const ROLE_PRECEDENCE: readonly (keyof typeof CredentialRole)[] = [
  'ROLE_ADMIN',
  'ROLE_SUPERVISOR',
  'ROLE_DESK',
  'ROLE_PROFESSIONAL',
  'ROLE_VENDOR',
  'ROLE_PATIENT',
  'ROLE_USER',
];

export const primaryRole = (authorities: readonly string[]): keyof typeof CredentialRole | null =>
  ROLE_PRECEDENCE.find(role => authorities.includes(role)) ?? null;
