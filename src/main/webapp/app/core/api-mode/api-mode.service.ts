import { Injectable, computed, inject, signal } from '@angular/core';

import { ApplicationConfigService } from 'app/core/config/application-config.service';

/**
 * Where the console gets its data: the in-browser mock, or the real
 * hc-admin-gateway.
 *
 * Two things have to move together, which is why they live in one service
 * rather than two settings:
 *
 *  1. whether `mockApiInterceptor` answers a request or lets it through, and
 *  2. what `ApplicationConfigService` prefixes onto every endpoint.
 *
 * Setting only the first gives you real requests aimed at the dev server;
 * setting only the second gives you a gateway URL that the mock still
 * intercepts. Either half alone looks like it works until the first request.
 *
 * The choice is persisted and read back at bootstrap, because a mode that
 * resets on reload is not a mode — you would flip to network, hit refresh to
 * see it, and be back on the mock.
 */
export type ApiMode = 'mock' | 'network';

/**
 * Empty means SAME ORIGIN: requests stay relative and the dev server's proxy
 * forwards `/api` and `/management` to the gateway (see proxy.config.mjs,
 * ABF_GATEWAY_HOST / ABF_GATEWAY_PORT). That is the default because it works
 * with no CORS configuration on the gateway and keeps the JWT same-site.
 *
 * Setting an absolute URL here instead — 'https://gateway.example/' — calls
 * the gateway directly and BYPASSES the proxy, which then requires the
 * gateway to CORS-allow this origin. That is the deployed-console case.
 */
export const DEFAULT_GATEWAY_URL = '';

const MODE_KEY = 'abf-api-mode';
const GATEWAY_KEY = 'abf-gateway-url';

@Injectable({ providedIn: 'root' })
export class ApiModeService {
  private readonly applicationConfigService = inject(ApplicationConfigService);

  // Network by default. The console talks to a real gateway unless someone asks otherwise.
  //
  // This was 'mock' while there was no backend to talk to. There is now: hc-admin-service seeds the
  // console dataset under `spring.profiles.active=test`, and the entity services address it through
  // `services/hcadminservice/**`. Leaving the default at 'mock' means a deployed container renders a
  // complete, fabricated directory without making a single request — healthy-looking whether or not
  // anything is behind it, which is the worst possible failure mode for a deployment.
  //
  // `?apiMode=mock` still selects the mock, and the choice is still persisted, so local work with no
  // backend is one query parameter away. The specs that exercise the mock now pin the mode
  // explicitly — they inherited it before, and flipping this failed 61 of them until they did.
  private readonly currentMode = signal<ApiMode>('network');
  private readonly currentGateway = signal<string>(DEFAULT_GATEWAY_URL);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly mode = this.currentMode.asReadonly();
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly gatewayUrl = this.currentGateway.asReadonly();
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly isMock = computed(() => this.currentMode() === 'mock');

  /**
   * Read the stored choice and apply it. Called once at bootstrap, before
   * anything issues a request.
   *
   * A `?apiMode=` query parameter overrides the stored value and is written
   * back, so a link can put someone straight into network mode — which is how
   * Cypress pins the mode for a run without depending on what a previous spec
   * happened to leave behind.
   */
  restore(): void {
    const fromQuery = new URLSearchParams(window.location.search).get('apiMode');
    const stored = window.localStorage.getItem(MODE_KEY);
    const gateway = window.localStorage.getItem(GATEWAY_KEY);

    if (gateway) {
      this.currentGateway.set(gateway);
    }

    const requested = fromQuery ?? stored;
    this.set(requested === 'network' ? 'network' : 'mock');
  }

  set(mode: ApiMode, gatewayUrl?: string): void {
    if (gatewayUrl !== undefined) {
      this.currentGateway.set(this.normalise(gatewayUrl));
      window.localStorage.setItem(GATEWAY_KEY, this.currentGateway());
    }

    this.currentMode.set(mode);
    window.localStorage.setItem(MODE_KEY, mode);

    // In mock mode the prefix stays empty so requests keep their relative
    // form and the interceptor's `^(api|management)/` match still holds.
    this.applicationConfigService.setEndpointPrefix(mode === 'network' ? this.currentGateway() : '');
  }

  /**
   * Switching data source mid-session leaves every loaded screen showing rows
   * from the other one, and the stored JWT was minted by whichever side was
   * answering `/api/authenticate`. A full reload from the login page is the
   * honest way through.
   */
  switchAndReload(mode: ApiMode, gatewayUrl?: string): void {
    this.set(mode, gatewayUrl);
    window.localStorage.removeItem('abf-authenticationToken');
    window.sessionStorage.removeItem('abf-authenticationToken');
    window.location.assign('/login');
  }

  private normalise(url: string): string {
    const trimmed = url.trim();
    if (trimmed.length === 0) {
      return '';
    }
    // getEndpointFor concatenates without inserting a separator.
    return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
  }
}
