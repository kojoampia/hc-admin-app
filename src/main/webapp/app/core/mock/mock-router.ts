import { HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';

import { Account } from 'app/core/auth/account.model';
// Type-only import. The dependency points mock -> console, which is the safe
// direction: deleting `core/mock` to go live removes the edge entirely.
import type { DashboardMetrics } from 'app/console/shared/console-metrics.service';

import { accountFor, decodeToken, issueToken, resolveRole } from './mock-auth';
import { DEMO_CAPS, DEMO_MESSAGE_VOLUME, DEMO_NET, DEMO_SPARKLINES, db, nextId, resetDatabase } from './mock-db';
import { handleManagement } from './mock-management';
import { handleUsers } from './mock-users';
import { buildLinkHeader, queryCollection } from './mock-query';

/**
 * Method + URL to handler.
 *
 * Everything under `/api/` is answered here. Collections are resolved by
 * name from `mock-db`, so adding an entity to the JDL needs no change in this
 * file — only a seed array in `mock-db.ts`.
 */

export const TOTAL_COUNT_HEADER = 'X-Total-Count';
const ALERT_HEADER = 'x-hcadminapp-alert';
const PARAMS_HEADER = 'x-hcadminapp-params';

export interface MockRequest {
  readonly method: string;
  /**
   * Which surface the request is on: the entity API or the actuator endpoints
   * the generated admin screens read. They share nothing but a host, so they
   * are dispatched separately rather than by guessing from the path.
   */
  readonly surface: 'api' | 'management';
  /** Path with the /api prefix already stripped, e.g. 'patients/3'. */
  readonly path: string;
  readonly params: HttpParams;
  readonly url: string;
  readonly body: any;
  /**
   * The `Authorization` header as `authInterceptor` set it. The signed-in
   * role rides on the token, so `/api/account` reads it from here — exactly
   * where a real resource server would look — rather than from remembered
   * state in the mock.
   */
  readonly authorization: string | null;
}

const json = <T>(status: number, body: T, headers?: Record<string, string>): HttpResponse<T> =>
  new HttpResponse({ status, body, headers: new HttpHeaders(headers ?? {}) });

const noContent = (headers?: Record<string, string>): HttpResponse<null> =>
  new HttpResponse<null>({ status: 204, body: null, headers: new HttpHeaders(headers ?? {}) });

export class MockNotFoundError extends Error {
  constructor(readonly path: string) {
    super(`No mock handler for ${path}`);
  }
}

export class MockStatusError extends Error {
  constructor(
    readonly status: number,
    readonly detail: string,
  ) {
    super(detail);
  }
}

/** Collections that reject writes, mirroring the JDL's `readOnly`. */
const READ_ONLY = new Set(['platform-services', 'audit-entries']);

const alertHeaders = (collection: string, id: unknown, kind: 'created' | 'updated' | 'deleted'): Record<string, string> => ({
  [ALERT_HEADER]: `hcAdminApp.${collection}.${kind}`,
  [PARAMS_HEADER]: String(id),
});

// ---- the dashboard aggregate --------------------------------------------

/**
 * `GET /api/dashboard/metrics`.
 *
 * The directory screens load a 12-record extract; these are the whole-network
 * figures the dashboard reports against. Keeping them a separate endpoint is
 * what lets the headers read "12 of 116 accounts loaded in this extract"
 * honestly instead of faking 116 rows.
 */
const dashboardMetrics = (): DashboardMetrics => {
  const data = db();
  const degraded = data['platform-services'].filter(service => service.health !== 'HEALTHY');
  const unread = data.messages.filter(message => message.status === 'NEW').length;
  const openTasks = data.tasks.filter(task => task.state !== 'DONE').length;
  const pendingApprovals =
    data.patients.filter(row => row.status === 'PENDING').length +
    data.professionals.filter(row => row.status === 'PENDING').length +
    data.vendors.filter(row => row.status === 'PENDING').length;

  const assignedShifts = data['shift-assignments'].filter(shift => shift.shift !== 'OFF').length;
  // Rosterable staff is everyone but pending applicants — the same rule the
  // duty-roster grid uses. Counting distinct professionals that happen to
  // have an assignment would omit anyone with an entirely empty week and
  // shrink the denominator, reporting better cover than there really is.
  const rosteredStaff = data.professionals.filter(pro => pro.status !== 'PENDING').length;
  const rosterSlots = rosteredStaff * 7;
  const filledSlots = data['shift-assignments'].length;

  return {
    network: {
      patients: DEMO_NET.patients,
      professionals: DEMO_NET.pros,
      vendors: DEMO_NET.vendors,
    },
    loaded: {
      patients: data.patients.length,
      professionals: data.professionals.length,
      vendors: data.vendors.length,
    },
    unreadMessages: unread,
    openTasks,
    pendingApprovals,
    roster: {
      coverPercent: rosterSlots === 0 ? 0 : Math.round((filledSlots / rosterSlots) * 100),
      unassignedSlots: Math.max(0, rosterSlots - filledSlots),
      rosteredStaff,
      shiftsThisWeek: assignedShifts,
    },
    degradedServices: degraded.map(service => ({ id: service.id, name: service.name, host: service.host, port: service.port })),
    platformServices: {
      total: data['platform-services'].length,
      healthy: data['platform-services'].length - degraded.length,
    },
    messageVolume: DEMO_MESSAGE_VOLUME.map(([month, count]) => ({ month, count })),
    accountMix: [
      { key: 'patients', value: DEMO_NET.patients },
      { key: 'professionals', value: DEMO_NET.pros },
      { key: 'vendors', value: DEMO_NET.vendors },
    ],
    caseLoad: data.professionals
      .filter(pro => pro.status !== 'PENDING')
      .map(pro => ({
        id: pro.id,
        name: [pro.profile?.firstName, pro.profile?.lastName].filter(Boolean).join(' '),
        cases: pro.caseCount,
        visits: pro.visitCount,
      })),
    sparklines: DEMO_SPARKLINES,
    capabilities: DEMO_CAPS.map(([name, icon, status]) => ({ name, icon, status })),
  };
};

// ---- routing -------------------------------------------------------------

export const handleRequest = (request: MockRequest): HttpResponse<any> => {
  const { method, path, params, url, body } = request;

  // ---- actuator ---------------------------------------------------------
  if (request.surface === 'management') {
    const answered = handleManagement(method, path, body);
    if (!answered) {
      throw new MockNotFoundError(`${method} management/${path}`);
    }
    return answered.status === 204 ? new HttpResponse<null>({ status: 204, body: null }) : json(answered.status, answered.body);
  }

  const segments = path.split('/').filter(Boolean);

  // ---- auth -------------------------------------------------------------
  if (path === 'authenticate' && method === 'POST') {
    const role = resolveRole(body?.username);
    return json(200, { id_token: issueToken(role, Date.now()) });
  }

  if (path === 'account' && method === 'GET') {
    const claims = decodeToken((request.authorization ?? '').replace(/^Bearer\s+/i, '') || null);
    if (!claims) {
      // No usable token is a 401, not an empty account — that is what drives
      // authExpiredInterceptor and keeps the signed-out shell honest.
      throw new MockStatusError(401, 'Unauthorized');
    }
    return json<Account>(200, accountFor(resolveRole(claims.sub)));
  }

  // ---- gateway-owned: Account and Authority -----------------------------
  // These are the only /api/ paths that hc-admin-gateway answers itself
  // rather than proxying to hc-admin-service.
  const gateway = handleUsers(method, path, params, body);
  if (gateway) {
    if (gateway.status >= 400) {
      throw new MockStatusError(gateway.status, (gateway.body as { title?: string }).title ?? 'Request failed');
    }
    if (gateway.status === 204) {
      return noContent();
    }
    return json(gateway.status, gateway.body, gateway.total === undefined ? {} : { [TOTAL_COUNT_HEADER]: String(gateway.total) });
  }

  if (path === 'dashboard/metrics' && method === 'GET') {
    return json(200, dashboardMetrics());
  }

  if (path === 'mock/reset' && method === 'POST') {
    resetDatabase();
    return noContent();
  }

  // ---- entity collections ----------------------------------------------
  const collection = segments[0];
  const data = db();

  if (!collection || !(collection in data)) {
    throw new MockNotFoundError(path);
  }

  const rows = data[collection];
  const rawId = segments[1];

  if (segments.length === 1) {
    if (method === 'GET') {
      const result = queryCollection(rows, params);
      return json(200, result.rows, {
        [TOTAL_COUNT_HEADER]: String(result.total),
        Link: buildLinkHeader(url, params, result),
      });
    }

    if (method === 'POST') {
      if (READ_ONLY.has(collection)) {
        throw new MockStatusError(405, `${collection} is read-only`);
      }
      // JHipster's contract: a create must not carry an id.
      if (body?.id != null) {
        throw new MockStatusError(400, 'A new entity cannot already have an ID');
      }
      const created = { ...body, id: nextId(collection) };
      rows.push(created);
      return json(201, created, {
        Location: `${url}/${created.id}`,
        ...alertHeaders(collection, created.id, 'created'),
      });
    }
  }

  if (segments.length === 2) {
    // Ids are Strings: the api is a MongoDB microservice, and coercing an
    // ObjectId through Number() yields NaN, which matches nothing.
    const id = rawId;
    const index = rows.findIndex(row => String(row.id) === id);

    if (method === 'GET') {
      if (index < 0) {
        throw new MockStatusError(404, `No ${collection} with id ${rawId}`);
      }
      return json(200, rows[index]);
    }

    if (READ_ONLY.has(collection)) {
      throw new MockStatusError(405, `${collection} is read-only`);
    }

    if (method === 'PUT' || method === 'PATCH') {
      // Path and body ids must agree, and the row must already exist.
      if (body?.id == null || String(body.id) !== id) {
        throw new MockStatusError(400, 'Invalid ID');
      }
      if (index < 0) {
        throw new MockStatusError(404, `No ${collection} with id ${rawId}`);
      }
      const updated =
        method === 'PUT'
          ? { ...body, id }
          : // PATCH copies only the fields the caller actually sent.
            {
              ...rows[index],
              ...Object.fromEntries(Object.entries(body).filter(([, value]) => value !== undefined && value !== null)),
              id,
            };
      rows[index] = updated;
      return json(200, updated, alertHeaders(collection, id, 'updated'));
    }

    if (method === 'DELETE') {
      if (index < 0) {
        throw new MockStatusError(404, `No ${collection} with id ${rawId}`);
      }
      rows.splice(index, 1);
      return noContent(alertHeaders(collection, id, 'deleted'));
    }
  }

  throw new MockNotFoundError(`${method} ${path}`);
};
