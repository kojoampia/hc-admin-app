import { beforeEach, describe, expect, it } from 'vitest';
import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { firstValueFrom } from 'rxjs';

import { ApiModeService } from 'app/core/api-mode/api-mode.service';
import { MOCK_LATENCY, mockApiInterceptor } from './mock-api.interceptor';
import { resetDatabase } from './mock-db';
import { issueToken } from './mock-auth';
import { roleByKey } from 'app/shared/auth/console-role';

/**
 * The interceptor's HTTP contract.
 *
 * These assertions are the reason no generated `*.service.ts` or
 * `*-list.component.ts` needed editing: they check the status codes and
 * headers those components already expect, rather than checking that the
 * mock returns some data.
 *
 * Every request carries `abfLatency=0` so the suite is not 120ms slower per
 * call; the latency path itself is exercised by the app, not here.
 */
describe('mockApiInterceptor', () => {
  let http: HttpClient;

  const fast = (url: string): string => `${url}${url.includes('?') ? '&' : '?'}abfLatency=0`;

  beforeEach(() => {
    // Reconfiguring an already-instantiated TestBed leaves the zone dirty,
    // and a stranded zone is what makes a scheduled response never arrive.
    TestBed.resetTestingModule();
    resetDatabase();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([mockApiInterceptor])), { provide: MOCK_LATENCY, useValue: 0 }],
    });
    // These specs exercise the interceptor itself, so the mode is pinned rather than inherited:
    // the application default is 'network' now, and the interceptor stands aside in that mode.
    TestBed.inject(ApiModeService).set('mock');
    http = TestBed.inject(HttpClient);
  });

  describe('collections', () => {
    it('should return X-Total-Count and Link on a list', async () => {
      const response = await firstValueFrom(http.get('/api/patients', { params: { page: 0, size: 5 }, observe: 'response' }));

      expect(response.status).toBe(200);
      expect(response.headers.get('X-Total-Count')).toBe('12');
      expect(response.headers.get('Link')).toContain('rel="last"');
      expect((response.body as unknown[]).length).toBe(5);
    });

    it('should page rather than return the whole collection', async () => {
      const page2 = await firstValueFrom(http.get<{ id: string }[]>(fast('/api/patients?page=1&size=5')));
      expect(page2.length).toBe(5);
      expect(page2[0].id).toBe('a6');
    });

    it('should honour a sort parameter', async () => {
      const rows = await firstValueFrom(http.get<{ id: string }[]>(fast('/api/patients?sort=id,desc&size=3')));
      // Numeric-aware string sort: a12 > a11 > a10 > a9.
      expect(rows.map(row => row.id)).toEqual(['a12', 'a11', 'a10']);
    });
  });

  describe('single records', () => {
    it('should return 404 for a missing id', async () => {
      await expect(firstValueFrom(http.get(fast('/api/patients/nope')))).rejects.toSatisfy(
        (error: HttpErrorResponse) => error.status === 404,
      );
    });

    it('should return the record for a known id', async () => {
      const patient = await firstValueFrom(http.get<{ id: string }>(fast('/api/patients/a1')));
      expect(patient.id).toBe('a1');
    });
  });

  describe('create', () => {
    it('should return 201 with a Location header and a fresh id', async () => {
      const response = await firstValueFrom(
        http.post('/api/tasks?abfLatency=0', { title: 'A new task', state: 'TODO', priority: 'HIGH' }, { observe: 'response' }),
      );

      expect(response.status).toBe(201);
      const created = response.body as { id: string; title: string };
      expect(created.id).toMatch(/^tasks-new-\d+$/);
      expect(response.headers.get('Location')).toContain(`/api/tasks/${created.id}`);
    });

    it('should reject a create that already carries an id', async () => {
      // JHipster's REST contract: POST with an ID is a client error.
      await expect(
        firstValueFrom(http.post(fast('/api/tasks'), { id: 't5', title: 'Nope', state: 'TODO', priority: 'LOW' })),
      ).rejects.toSatisfy((error: HttpErrorResponse) => error.status === 400);
    });

    it('should emit the alert header the notification interceptor reads', async () => {
      const response = await firstValueFrom(
        http.post('/api/tasks?abfLatency=0', { title: 'Another', state: 'TODO', priority: 'LOW' }, { observe: 'response' }),
      );
      expect(response.headers.get('x-hcadminapp-alert')).toContain('tasks');
    });
  });

  describe('update', () => {
    it('should reject a PUT whose body id disagrees with the path', async () => {
      await expect(firstValueFrom(http.put(fast('/api/tasks/t1'), { id: 't2', title: 'Mismatched' }))).rejects.toSatisfy(
        (error: HttpErrorResponse) => error.status === 400,
      );
    });

    it('should copy only the fields a PATCH actually sends', async () => {
      const before = await firstValueFrom(http.get<{ title: string; tag: string }>(fast('/api/tasks/t1')));
      const patched = await firstValueFrom(http.patch<{ title: string; tag: string }>(fast('/api/tasks/t1'), { id: 't1', state: 'DONE' }));

      expect(patched.title).toBe(before.title);
      expect(patched.tag).toBe(before.tag);
    });

    it('should return 404 when updating a record that does not exist', async () => {
      await expect(firstValueFrom(http.put(fast('/api/tasks/nope'), { id: 'nope' }))).rejects.toSatisfy(
        (error: HttpErrorResponse) => error.status === 404,
      );
    });
  });

  describe('delete', () => {
    it('should return 204 and actually remove the row', async () => {
      const response = await firstValueFrom(http.delete(fast('/api/tasks/t1'), { observe: 'response' }));
      expect(response.status).toBe(204);

      await expect(firstValueFrom(http.get(fast('/api/tasks/t1')))).rejects.toSatisfy((error: HttpErrorResponse) => error.status === 404);
    });

    it('should return 404 when deleting something already gone', async () => {
      await expect(firstValueFrom(http.delete(fast('/api/tasks/nope')))).rejects.toSatisfy(
        (error: HttpErrorResponse) => error.status === 404,
      );
    });
  });

  describe('read-only collections', () => {
    it('should reject writes to a collection the JDL marks readOnly', async () => {
      await expect(firstValueFrom(http.post(fast('/api/platform-services'), { name: 'Rogue' }))).rejects.toSatisfy(
        (error: HttpErrorResponse) => error.status === 405,
      );
      await expect(firstValueFrom(http.delete(fast('/api/audit-entries/audit-1')))).rejects.toSatisfy(
        (error: HttpErrorResponse) => error.status === 405,
      );
    });

    it('should still allow reads of them', async () => {
      const services = await firstValueFrom(http.get<unknown[]>(fast('/api/platform-services?size=50')));
      expect(services.length).toBe(13);
    });
  });

  describe('auth', () => {
    it('should issue a token whose authorities come from the chosen login', async () => {
      const response = await firstValueFrom(
        http.post<{ id_token: string }>(fast('/api/authenticate'), { username: 'supervisor@abofonsa.care', password: 'anything' }),
      );
      const claims = JSON.parse(atob(response.id_token.split('.')[1])) as { auth: string };
      expect(claims.auth).toContain('ROLE_SUPERVISOR');
      expect(claims.auth).not.toContain('ROLE_ADMIN');
    });

    it('should return 401 from /api/account without a token', async () => {
      await expect(firstValueFrom(http.get(fast('/api/account')))).rejects.toSatisfy((error: HttpErrorResponse) => error.status === 401);
    });

    it('should derive the account from the token, not from remembered state', async () => {
      const token = issueToken(roleByKey('desk'), 1_700_000_000_000);
      const account = await firstValueFrom(
        http.get<{ authorities: string[] }>(fast('/api/account'), { headers: { Authorization: `Bearer ${token}` } }),
      );
      expect(account.authorities).toContain('ROLE_DESK');
    });
  });

  describe('unmocked endpoints', () => {
    it('should 404 loudly rather than fall through to a dev server with no backend', async () => {
      await expect(firstValueFrom(http.get(fast('/api/no-such-thing')))).rejects.toSatisfy(
        (error: HttpErrorResponse) => error.status === 404,
      );
    });
  });

  describe('non-API requests', () => {
    it('should not intercept anything outside /api/', async () => {
      // i18n JSON, assets and source maps must reach the network untouched.
      // A 404 here would mean the mock had swallowed them.
      await expect(firstValueFrom(http.get('/content/images/hc-logo.png'))).rejects.toSatisfy(
        (error: HttpErrorResponse) => error.status !== 404 || !String(error.error).includes('No mock handler'),
      );
    });
  });
});
