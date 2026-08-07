import { HttpParams } from '@angular/common/http';

import { CONSOLE_ROLES } from 'app/shared/auth/console-role';

import { DEMO_ME, DEMO_PATIENTS, DEMO_PROS, splitName, toIsoInstant } from './mock-db';
import { queryCollection } from './mock-query';

/**
 * `/api/admin/users` and `/api/authorities` — the GATEWAY's surface.
 *
 * These do not belong with the entity collections in `mock-db.ts`, and the
 * separation is the point: hc-admin-gateway owns Account and Authority,
 * hc-admin-service owns everything else. The console reaches the gateway
 * without a `/services/` segment, so these paths are the one place in the
 * mock where "which service answers this" is visible.
 *
 * Accounts are keyed by LOGIN, not by id, because that is the gateway's
 * contract: `GET /api/admin/users/{login}`.
 *
 * The seed mirrors `Profile.accountId`: every account here is one that some
 * profile in `mock-db` points at, so the cross-service reference resolves in
 * both directions rather than dangling.
 */

export const AUTHORITIES = [
  'ROLE_ADMIN',
  'ROLE_USER',
  'ROLE_SUPERVISOR',
  'ROLE_DESK',
  'ROLE_PROFESSIONAL',
  'ROLE_PATIENT',
  'ROLE_VENDOR',
] as const;

export interface MockUser {
  id: string;
  login: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  activated: boolean;
  langKey: string;
  authorities: string[];
  createdBy: string;
  createdDate: string;
  lastModifiedBy: string;
  lastModifiedDate: string;
}

const SYSTEM = 'system';
const CREATED = toIsoInstant('02 Feb 2021', '09:00');

const buildUsers = (): MockUser[] => {
  const users: MockUser[] = [];

  // The three console operators. Their logins are the ones the login form
  // offers, so signing in as a role and then finding that role's account in
  // this list are the same fact.
  for (const role of CONSOLE_ROLES) {
    const isOperator = role.key === 'ops';
    const name = isOperator ? splitName(DEMO_ME.name) : null;
    users.push({
      id: isOperator ? 'cred-me' : `cred-${role.key}`,
      login: role.login,
      firstName: name ? name.firstName : role.key === 'sup' ? 'Supervisor' : 'Message desk',
      lastName: name ? name.lastName : null,
      email: role.login,
      activated: true,
      langKey: 'en',
      authorities: [...role.authorities],
      createdBy: SYSTEM,
      createdDate: CREATED,
      lastModifiedBy: SYSTEM,
      lastModifiedDate: CREATED,
    });
  }

  // One account per professional and per patient — the records
  // Profile.accountId refers to.
  for (const pro of DEMO_PROS) {
    const name = splitName(pro.name);
    users.push({
      id: `cred-${pro.id}`,
      login: pro.email,
      firstName: name.firstName,
      lastName: name.lastName,
      email: pro.email,
      activated: pro.status === 'active',
      langKey: 'en',
      authorities: ['ROLE_PROFESSIONAL', 'ROLE_USER'],
      createdBy: SYSTEM,
      createdDate: CREATED,
      lastModifiedBy: SYSTEM,
      lastModifiedDate: CREATED,
    });
  }

  for (const patient of DEMO_PATIENTS) {
    const name = splitName(patient.name);
    users.push({
      id: `cred-${patient.id}`,
      login: patient.email,
      firstName: name.firstName,
      lastName: name.lastName,
      email: patient.email,
      activated: patient.status === 'active',
      langKey: 'en',
      authorities: ['ROLE_PATIENT', 'ROLE_USER'],
      createdBy: SYSTEM,
      createdDate: CREATED,
      lastModifiedBy: SYSTEM,
      lastModifiedDate: CREATED,
    });
  }

  return users;
};

let users: MockUser[] = buildUsers();
let createdCount = 0;

export const resetUsers = (): void => {
  users = buildUsers();
  createdCount = 0;
};

export const allUsers = (): MockUser[] => users;

export interface UserResult {
  status: number;
  body: unknown;
  total?: number;
}

/**
 * Answer a gateway user request, or undefined so the caller can 404.
 *
 * `path` has the `api/` prefix already stripped: 'admin/users',
 * 'admin/users/{login}', or 'authorities'.
 */
export const handleUsers = (method: string, path: string, params: HttpParams, body: any): UserResult | undefined => {
  if (path === 'authorities' && method === 'GET') {
    return { status: 200, body: [...AUTHORITIES] };
  }

  if (path === 'admin/users') {
    if (method === 'GET') {
      const page = queryCollection(users, params);
      return { status: 200, body: page.rows, total: page.total };
    }

    if (method === 'POST') {
      const login = String(body?.login ?? '').trim();
      if (!login) {
        return { status: 400, body: { title: 'A login is required' } };
      }
      if (users.some(user => user.login === login)) {
        // The gateway rejects a duplicate login with 400; a console that
        // silently created a second one would split a person in two.
        return { status: 400, body: { title: 'Login name already used', errorKey: 'userexists' } };
      }
      const now = new Date().toISOString();
      const user: MockUser = {
        id: `cred-new-${++createdCount}`,
        login,
        firstName: body?.firstName ?? null,
        lastName: body?.lastName ?? null,
        email: body?.email ?? login,
        activated: body?.activated ?? true,
        langKey: body?.langKey ?? 'en',
        authorities: body?.authorities?.length ? body.authorities : ['ROLE_USER'],
        createdBy: SYSTEM,
        createdDate: now,
        lastModifiedBy: SYSTEM,
        lastModifiedDate: now,
      };
      users.push(user);
      return { status: 201, body: user };
    }

    if (method === 'PUT') {
      const index = users.findIndex(user => user.login === body?.login || user.id === body?.id);
      if (index < 0) {
        return { status: 404, body: { title: 'No such user' } };
      }
      users[index] = { ...users[index], ...body, lastModifiedBy: SYSTEM, lastModifiedDate: new Date().toISOString() };
      return { status: 200, body: users[index] };
    }
  }

  if (path.startsWith('admin/users/')) {
    const login = decodeURIComponent(path.slice('admin/users/'.length));
    const index = users.findIndex(user => user.login === login);

    if (method === 'GET') {
      return index < 0 ? { status: 404, body: { title: `No user ${login}` } } : { status: 200, body: users[index] };
    }

    if (method === 'DELETE') {
      if (index < 0) {
        return { status: 404, body: { title: `No user ${login}` } };
      }
      users.splice(index, 1);
      return { status: 204, body: null };
    }
  }

  return undefined;
};
