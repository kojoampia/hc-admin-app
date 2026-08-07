import { beforeEach, describe, expect, it } from 'vitest';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { firstValueFrom } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { MOCK_LATENCY, mockApiInterceptor } from 'app/core/mock/mock-api.interceptor';
import { resetDatabase } from 'app/core/mock/mock-db';

import { ApiModeService } from './api-mode.service';

/**
 * The two halves of the switch have to move together.
 *
 * Flipping the interceptor without the endpoint prefix aims real requests at
 * the dev server; flipping the prefix without the interceptor leaves the mock
 * answering a gateway URL. Either alone looks fine until the first request,
 * so these assert both at once.
 */
describe('ApiModeService', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    window.localStorage.clear();
    resetDatabase();
  });

  describe('mode selection', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({ providers: [provideHttpClientTesting()] });
    });

    it('should default to the mock', () => {
      const service = TestBed.inject(ApiModeService);
      service.restore();

      expect(service.mode()).toBe('mock');
      expect(service.isMock()).toBe(true);
    });

    it('should leave the endpoint prefix empty in mock mode', () => {
      const service = TestBed.inject(ApiModeService);
      const config = TestBed.inject(ApplicationConfigService);
      service.set('mock');

      // Relative, so the interceptor's ^(api|management)/ match still holds.
      expect(config.getEndpointFor('api/patients')).toBe('api/patients');
    });

    it('should keep requests same-origin in network mode by default', () => {
      const service = TestBed.inject(ApiModeService);
      const config = TestBed.inject(ApplicationConfigService);
      service.set('network');

      // Blank gateway URL means the dev proxy forwards it — no CORS needed.
      expect(config.getEndpointFor('api/patients')).toBe('api/patients');
    });

    it('should call an absolute gateway directly when one is configured', () => {
      const service = TestBed.inject(ApiModeService);
      const config = TestBed.inject(ApplicationConfigService);
      service.set('network', 'https://gateway.example');

      // Trailing slash added: getEndpointFor concatenates without a separator.
      expect(config.getEndpointFor('api/patients')).toBe('https://gateway.example/api/patients');
    });

    it('should persist the choice so a reload does not silently revert it', () => {
      TestBed.inject(ApiModeService).set('network', 'https://gateway.example/');

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [provideHttpClientTesting()] });
      const restored = TestBed.inject(ApiModeService);
      restored.restore();

      expect(restored.mode()).toBe('network');
      expect(restored.gatewayUrl()).toBe('https://gateway.example/');
    });

    it('should let a query parameter override the stored mode', () => {
      TestBed.inject(ApiModeService).set('network');

      const search = window.location.search;
      // jsdom allows replaceState; restore it afterwards so no other spec sees it.
      window.history.replaceState({}, '', '?apiMode=mock');
      try {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({ providers: [provideHttpClientTesting()] });
        const service = TestBed.inject(ApiModeService);
        service.restore();
        expect(service.mode()).toBe('mock');
      } finally {
        window.history.replaceState({}, '', search || '/');
      }
    });
  });

  describe('the interceptor follows the mode', () => {
    let http: HttpClient;
    let service: ApiModeService;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(withInterceptors([mockApiInterceptor])),
          provideHttpClientTesting(),
          { provide: MOCK_LATENCY, useValue: 0 },
        ],
      });
      http = TestBed.inject(HttpClient);
      service = TestBed.inject(ApiModeService);
    });

    it('should answer from the mock in mock mode, without touching the network', async () => {
      service.set('mock');

      const patients = await firstValueFrom(http.get<unknown[]>('/api/patients?size=50'));
      expect(patients.length).toBe(12);

      // Nothing reached the HTTP backend.
      TestBed.inject(HttpTestingController).verify();
    });

    it('should let the request through untouched in network mode', () => {
      service.set('network');

      http.get('/api/patients').subscribe();

      // It reached the backend, which is the whole point: the mock stood aside.
      const controller = TestBed.inject(HttpTestingController);
      const request = controller.expectOne('/api/patients');
      request.flush([]);
      controller.verify();
    });

    it('should stand aside for the gateway user endpoints too', () => {
      service.set('network');

      http.get('/api/admin/users').subscribe();

      const controller = TestBed.inject(HttpTestingController);
      controller.expectOne('/api/admin/users').flush([]);
      controller.verify();
    });

    it('should stand aside for /management in network mode', () => {
      service.set('network');

      http.get('/management/health').subscribe();

      const controller = TestBed.inject(HttpTestingController);
      controller.expectOne('/management/health').flush({ status: 'UP' });
      controller.verify();
    });
  });
});
