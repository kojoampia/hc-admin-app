import { CredentialRole } from 'app/entities/enumerations/credential-role.model';

/**
 * A user account, as the console talks about it.
 *
 * Sourced from hc-admin-gateway's `Account` via `GET /api/account` — not from an entity. The admin
 * service has no Credential collection and the console model excluded `Credential` and
 * `CredentialRole` on purpose: the gateway owns user records, the admin service owns everything
 * else, and the two live in different databases with no join between them. Requesting
 * `/services/hcadminservice/api/credentials` would 404 forever.
 *
 * See `core/auth/credential-from-account.ts` for the projection.
 *
 * `phoneNumber`, `passwordHash` and `lastLoginAt` were on this interface while it was backed by an
 * in-browser mock. They are gone rather than left nullable: `Account` carries none of them, and a
 * field that can only ever be null is a column that can only ever be blank.
 */
export interface ICredential {
  /** The gateway login. The database id reaches this client only as a JWT claim, never as a body. */
  id: string;
  email?: string | null;
  /** The most specific of the account's authorities — see `primaryRole`. */
  role?: keyof typeof CredentialRole | null;
  /** The gateway's `activated`. */
  enabled?: boolean | null;
}
