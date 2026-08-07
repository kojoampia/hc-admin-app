import { Account } from 'app/core/auth/account.model';
import { CONSOLE_ROLES, ConsoleRole, roleByKey } from 'app/shared/auth/console-role';

import { DEMO_ME } from './mock-db';

/**
 * `/api/authenticate` and `/api/account`.
 *
 * The prototype picks a role from a `<select>` on the login form and keeps it
 * in a JS variable. Here the same choice produces a real JWT-shaped token
 * whose `auth` claim carries the authorities, which is what makes
 * `*abfHasAnyAuthority` and `UserRouteAccessService` work unmodified.
 *
 * The token is SHAPED like a JWT — three base64url segments — but it is NOT
 * signed, and nothing verifies it. There is no server to verify against. It
 * exists so the client's storage, expiry and interceptor paths are exercised
 * for real rather than stubbed.
 */

const base64Url = (value: unknown): string => btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** Twenty-four hours, matching the console's own session expectation. */
const TOKEN_TTL_SECONDS = 24 * 60 * 60;

export interface MockLoginRequest {
  username?: string;
  password?: string;
  rememberMe?: boolean;
}

/**
 * Which role is signing in.
 *
 * The login form sends a username. Each console role has its own demo login,
 * so the username alone decides the role — there is no password check,
 * because there is no credential store and pretending otherwise would imply a
 * security boundary that does not exist. An unrecognised login gets the
 * read-only supervisor role rather than administrator: if the console is ever
 * pointed at something unexpected, the safe default is the one that cannot
 * change anything.
 */
export const resolveRole = (username: string | undefined): ConsoleRole => {
  const login = (username ?? '').trim().toLowerCase();
  const matched = CONSOLE_ROLES.find(role => role.login.toLowerCase() === login);
  if (matched) {
    return matched;
  }
  return login.length > 0 ? roleByKey('sup') : roleByKey('ops');
};

export const issueToken = (role: ConsoleRole, now: number): string => {
  const issuedAt = Math.floor(now / 1000);
  const header = { alg: 'HS512', typ: 'JWT' };
  const payload = {
    sub: role.login,
    auth: role.authorities.join(','),
    iat: issuedAt,
    exp: issuedAt + TOKEN_TTL_SECONDS,
  };
  // Third segment is a placeholder where a real signature would sit.
  return `${base64Url(header)}.${base64Url(payload)}.${base64Url('mock-signature-not-verified')}`;
};

export interface TokenClaims {
  sub?: string;
  auth?: string;
  exp?: number;
}

export const decodeToken = (token: string | null): TokenClaims | null => {
  if (!token) {
    return null;
  }
  const segments = token.split('.');
  if (segments.length !== 3) {
    return null;
  }
  try {
    const padded = segments[1].replace(/-/g, '+').replace(/_/g, '/');
    const claims: unknown = JSON.parse(atob(padded));
    return typeof claims === 'object' && claims !== null ? claims : null;
  } catch {
    return null;
  }
};

/** The account behind a role. Only the operator is a real person in the prototype. */
export const accountFor = (role: ConsoleRole): Account => {
  if (role.key === 'ops') {
    return {
      activated: true,
      authorities: [...role.authorities],
      email: DEMO_ME.email,
      firstName: DEMO_ME.first,
      langKey: 'en',
      lastName: DEMO_ME.name.split(' ').slice(1).join(' '),
      login: role.login,
      imageUrl: null,
    };
  }

  // The prototype names only the operator; the other two roles are desks, not
  // people. They get the desk's name and no surname — falling back to the
  // organisation's name produced "Supervisor Abofonsa BridgeCare", which
  // reads as a person who does not exist.
  return {
    activated: true,
    authorities: [...role.authorities],
    email: role.login,
    firstName: role.key === 'sup' ? 'Supervisor' : 'Message desk',
    langKey: 'en',
    lastName: null,
    login: role.login,
    imageUrl: null,
  };
};
