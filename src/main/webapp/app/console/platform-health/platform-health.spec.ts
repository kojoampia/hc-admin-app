import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { IPlatformService } from 'app/entities/platform/platform-service/platform-service.model';

import PlatformHealth from './platform-health';

/**
 * The probe button, which is the first thing this screen has ever been able to do.
 *
 * <p>Item 22: the screen was read-only, so a service that recovered kept whatever health it was
 * last written with until somebody edited the document.
 *
 * <p>Two things are worth pinning. Only the probed row changes — reloading the list would also
 * discard twelve rows the operator did not ask about and make a single-row action look like a
 * whole-screen refresh. And a failed request leaves the row alone: the probe's own bad news arrives
 * as a *successful* response saying DOWN, so "could not ask" and "did not answer" must not render
 * the same way.
 */
describe('platform health probe', () => {
  let component: PlatformHealth;
  let httpMock: HttpTestingController;

  const service = (id: string, health: string, responseMs: number): Partial<IPlatformService> => ({
    id,
    name: `Service ${id}`,
    host: `host-${id}`,
    port: 5507,
    plane: 'ADMIN',
    health: health as IPlatformService['health'],
    responseMs,
  });

  const probeRequest = (id: string): { flush: (body: Record<string, unknown>) => void; error: () => void } => {
    const requests = httpMock.match((request: HttpRequest<unknown>) => request.url.endsWith(`/platform-services/${id}/probe`));
    expect(requests.length).toBe(1);
    return {
      flush: body => requests[0].flush(body),
      error: () => requests[0].flush(null, { status: 500, statusText: 'Server Error' }),
    };
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideTranslateService()],
    });
    component = TestBed.runInInjectionContext(() => new PlatformHealth());
    httpMock = TestBed.inject(HttpTestingController);
    component.services.set([service('s1', 'DOWN', 0), service('s2', 'HEALTHY', 41)] as IPlatformService[]);
  });

  it('replaces only the row it probed', () => {
    component.probe(component.services()[0]);
    probeRequest('s1').flush({ ...service('s1', 'HEALTHY', 37), lastProbedAt: '2026-08-21T10:15:00Z' });

    expect(component.services()[0].health).toBe('HEALTHY');
    expect(component.services()[0].responseMs).toBe(37);
    expect(component.services()[1]).toEqual(service('s2', 'HEALTHY', 41));
  });

  it('parses the probe timestamp rather than leaving it a string', () => {
    component.probe(component.services()[0]);
    probeRequest('s1').flush({ ...service('s1', 'HEALTHY', 37), lastProbedAt: '2026-08-21T10:15:00Z' });

    expect(component.services()[0].lastProbedAt?.toISOString()).toBe('2026-08-21T10:15:00.000Z');
  });

  /** DOWN is an answer, and it arrives as a 200. The row takes it. */
  it('stores a probe that found the service down', () => {
    component.probe(component.services()[1]);
    probeRequest('s2').flush({ ...service('s2', 'DOWN', 0), responseMs: null, lastProbedAt: '2026-08-21T10:15:00Z' });

    expect(component.services()[1].health).toBe('DOWN');
    expect(component.services()[1].responseMs).toBeNull();
  });

  it('leaves the row untouched when the request itself fails', () => {
    component.probe(component.services()[1]);
    probeRequest('s2').error();

    expect(component.services()[1]).toEqual(service('s2', 'HEALTHY', 41));
    expect(component.isProbing(component.services()[1])).toBe(false);
  });

  /** One at a time: the button disables while its own probe is out, and a second press does nothing. */
  it('marks the row in flight and refuses a second probe until it lands', () => {
    component.probe(component.services()[0]);

    expect(component.isProbing(component.services()[0])).toBe(true);
    component.probe(component.services()[1]);
    expect(httpMock.match((request: HttpRequest<unknown>) => request.url.endsWith('/platform-services/s2/probe')).length).toBe(0);

    probeRequest('s1').flush(service('s1', 'HEALTHY', 37));
    expect(component.isProbing(component.services()[0])).toBe(false);
  });
});
