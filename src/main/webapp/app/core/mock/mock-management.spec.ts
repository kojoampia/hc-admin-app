import { beforeEach, describe, expect, it } from 'vitest';
import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { firstValueFrom } from 'rxjs';

import { HealthModel } from 'app/admin/health/health.model';
import { LoggersResponse } from 'app/admin/logs/log.model';
import { ConfigProps, Env } from 'app/admin/configuration/configuration.model';
import { MetricsModel } from 'app/admin/metrics/metrics.model';

import { MOCK_LATENCY, mockApiInterceptor } from './mock-api.interceptor';
import { resetDatabase } from './mock-db';
import { resetLoggers } from './mock-management';

/**
 * The actuator surface behind JHipster's stock admin screens.
 *
 * These assert the SHAPES those untouched generated components destructure —
 * a missing key there is a blank table, not an error — and the one invariant
 * that matters: Health and Platform health must not disagree about which
 * service is down.
 */
describe('mock management endpoints', () => {
  let http: HttpClient;

  beforeEach(() => {
    TestBed.resetTestingModule();
    resetDatabase();
    resetLoggers();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([mockApiInterceptor])), { provide: MOCK_LATENCY, useValue: 0 }],
    });
    http = TestBed.inject(HttpClient);
  });

  describe('health', () => {
    it('should report every mapped service as a component', async () => {
      const health = await firstValueFrom(http.get<HealthModel>('/management/health'));
      const components = health.components as Record<string, { status: string }>;

      // The thirteen services plus ping, diskSpace, liveness and readiness.
      expect(Object.keys(components).length).toBe(17);
      expect(components['hc-admin-gateway'].status).toBe('UP');
    });

    it('should agree with the platform-service catalogue about what is degraded', async () => {
      const health = await firstValueFrom(http.get<HealthModel>('/management/health'));
      const services = await firstValueFrom(http.get<{ host: string; health: string }[]>('/api/platform-services?size=50'));

      const downHere = Object.entries(health.components as Record<string, { status: string }>)
        .filter(([, component]) => component.status === 'DOWN')
        .map(([key]) => key);
      const degradedThere = services.filter(service => service.health !== 'HEALTHY').map(service => service.host);

      expect(downHere.sort()).toEqual(degradedThere.sort());
      // One degraded service must drag the aggregate down with it.
      expect(health.status).toBe('DOWN');
    });
  });

  describe('metrics', () => {
    it('should return every section the generated screen reads', async () => {
      const metrics = await firstValueFrom(http.get<MetricsModel>('/management/jhimetrics'));

      // The template destructures each of these; a missing key blanks a panel.
      expect(Object.keys(metrics.jvm).length).toBeGreaterThan(0);
      expect(metrics['http.server.requests'].all.count).toBeGreaterThan(0);
      expect(metrics.garbageCollector['jvm.gc.pause'].mean).toBeGreaterThan(0);
      expect(metrics.processMetrics['system.cpu.count']).toBeGreaterThan(0);
      expect(Object.keys(metrics.services).length).toBeGreaterThan(0);
    });

    it('should report endpoint counts derived from the seeded collections', async () => {
      const metrics = await firstValueFrom(http.get<MetricsModel>('/management/jhimetrics'));
      const patients = await firstValueFrom(http.get<unknown[]>('/api/patients?size=50'));

      expect(metrics.services['/api/patients'].GET.count).toBe(patients.length * 9);
    });

    it('should return a thread dump the modal can render', async () => {
      const dump = await firstValueFrom(http.get<{ threads: { threadName: string; threadState: string }[] }>('/management/threaddump'));

      expect(dump.threads.length).toBeGreaterThan(0);
      expect(dump.threads[0].threadName).toBeTruthy();
      expect(['RUNNABLE', 'WAITING', 'TIMED_WAITING', 'BLOCKED']).toContain(dump.threads[0].threadState);
    });
  });

  describe('configuration', () => {
    it('should return contexts with beans', async () => {
      const config = await firstValueFrom(http.get<ConfigProps>('/management/configprops'));
      const context = Object.values(config.contexts)[0];

      expect(Object.keys(context.beans).length).toBeGreaterThan(0);
      expect(context.beans['abofonsa.console'].prefix).toBe('abofonsa.console');
    });

    it('should report the seed sizes it actually holds', async () => {
      const env = await firstValueFrom(http.get<Env>('/management/env'));
      const console = env.propertySources.find(source => source.name === 'console')!;
      const patients = await firstValueFrom(http.get<unknown[]>('/api/patients?size=50'));

      expect(console.properties['abofonsa.console.seed.patients'].value).toBe(String(patients.length));
      // And says plainly that there is no backend.
      expect(console.properties['abofonsa.console.api'].value).toContain('no backend');
    });
  });

  describe('loggers', () => {
    it('should return levels and loggers in the shape the screen expects', async () => {
      const response = await firstValueFrom(http.get<LoggersResponse>('/management/loggers'));

      expect(response.levels).toContain('DEBUG');
      expect(response.loggers.ROOT.effectiveLevel).toBe('INFO');
    });

    it('should persist a level change rather than accepting and discarding it', async () => {
      await firstValueFrom(http.post('/management/loggers/care.abofonsa', { configuredLevel: 'ERROR' }));

      const response = await firstValueFrom(http.get<LoggersResponse>('/management/loggers'));
      expect(response.loggers['care.abofonsa'].configuredLevel).toBe('ERROR');
      expect(response.loggers['care.abofonsa'].effectiveLevel).toBe('ERROR');
    });

    it('should fall back to the ROOT level when a logger is set to inherit', async () => {
      await firstValueFrom(http.post('/management/loggers/care.abofonsa', { configuredLevel: null }));

      const response = await firstValueFrom(http.get<LoggersResponse>('/management/loggers'));
      expect(response.loggers['care.abofonsa'].effectiveLevel).toBe(response.loggers.ROOT.effectiveLevel);
    });

    it('should reset between tests so one spec cannot leak into the next', async () => {
      const response = await firstValueFrom(http.get<LoggersResponse>('/management/loggers'));
      expect(response.loggers['care.abofonsa'].configuredLevel).toBe('DEBUG');
    });
  });

  describe('info', () => {
    it('should answer the profile call the shell makes on boot', async () => {
      const info = await firstValueFrom(http.get<{ activeProfiles: string[] }>('/management/info'));
      expect(info.activeProfiles).toContain('dev');
    });
  });

  describe('unknown actuator paths', () => {
    it('should 404 rather than fall through to a network that is not there', async () => {
      await expect(firstValueFrom(http.get('/management/nope'))).rejects.toSatisfy((error: HttpErrorResponse) => error.status === 404);
    });
  });
});
