import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { ConsoleMetricsService } from './console-metrics.service';

/**
 * The URL, specifically.
 *
 * This service asked for `api/dashboard/metrics` with no microservice segment, which resolves to
 * the gateway's own surface. Nothing serves it there, so every caller got a 404 — and because the
 * dashboard, platform-health and the sign-in panel all swallow the error, the only symptom was
 * three blank screens in production.
 *
 * Asserting the path is the cheap guard the whole class of bug needed: it is the same mistake the
 * 23 entity services made before hc-admin-app#6.
 */
describe('ConsoleMetricsService', () => {
  let service: ConsoleMetricsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ConsoleMetricsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('requests the metrics through the admin service, not the gateway surface', () => {
    service.metrics().subscribe();

    const req = httpMock.expectOne(r => r.url.endsWith('api/dashboard/metrics'));
    expect(req.request.method).toEqual('GET');
    expect(req.request.url).toContain('services/hcadminservice/');
    req.flush({});
  });
});
