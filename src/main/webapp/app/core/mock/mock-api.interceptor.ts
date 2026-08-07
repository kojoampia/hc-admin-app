import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpParams, HttpRequest, HttpResponse } from '@angular/common/http';
import { InjectionToken, inject } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';

import { MockNotFoundError, MockStatusError, handleRequest } from './mock-router';

/**
 * Answers `/api/**` from memory. This is the only place the app knows there
 * is no backend.
 *
 * It is registered LAST, so every other interceptor — auth, error handling,
 * notifications — has already run against a real `HttpRequest` and will run
 * against a real `HttpResponse` on the way back. Nothing downstream is
 * stubbed; the request simply never reaches the network.
 */

/** Default latency, so skeletons and spinners are genuinely exercised. */
export const DEFAULT_MOCK_LATENCY_MS = 120;

/**
 * The applied latency, overridable through DI.
 *
 * Component specs drive real components against this interceptor, and they
 * cannot append `?abfLatency=0` to requests the component itself builds.
 * Providing `{ provide: MOCK_LATENCY, useValue: 0 }` makes those suites
 * deterministic instead of racing a timeout.
 */
export const MOCK_LATENCY = new InjectionToken<number>('abf.mock.latencyMs', {
  providedIn: 'root',
  factory: () => DEFAULT_MOCK_LATENCY_MS,
});

/**
 * Cypress passes `?abfLatency=0` to remove the wait for a single request. It
 * is read per request rather than from a global so a slow-path test can ask
 * for latency while the rest of a run goes without it.
 */
const latencyFor = (params: HttpParams, configured: number): number => {
  // A non-finite delay never fires, so every response would hang silently.
  const base = Number.isFinite(configured) && configured >= 0 ? configured : DEFAULT_MOCK_LATENCY_MS;
  const override = params.get('abfLatency');
  if (override === null) {
    return base;
  }
  const parsed = Number(override);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : base;
};

/**
 * Both surfaces the app talks to. `/api/**` is the entity contract; the
 * generated admin screens read `/management/**` instead, and leaving that one
 * out left four stock screens rendering an error where a table should be.
 */
const API_PREFIX = /^(?:.*\/)?(api|management)\//;

export const mockApiInterceptor = (request: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  // Read from DI first: inject() is only valid during this function's
  // synchronous run, and the early return below would otherwise skip it.
  const configuredLatency = inject(MOCK_LATENCY);

  const [pathPart, queryPart] = request.urlWithParams.split('?');
  const match = API_PREFIX.exec(pathPart);

  if (!match) {
    // Not an API call — webpack assets, i18n JSON, source maps. Let it go.
    return next(request);
  }

  // `urlWithParams` merges HttpParams into the URL, but a caller may also have
  // written the query into the URL string directly, in which case
  // `request.params` is empty. Re-parsing the merged query covers both, so a
  // hand-written `/api/patients?page=1` is not silently served page 0.
  const params = new HttpParams({ fromString: queryPart });

  // The regex only ever captures one of these two alternatives.
  const surface = match[1] as 'api' | 'management';
  const path = pathPart.slice(match.index + match[0].length);
  const url = pathPart;
  const wait = latencyFor(params, configuredLatency);

  let response: HttpResponse<unknown>;
  try {
    response = handleRequest({
      method: request.method.toUpperCase(),
      surface,
      path,
      params,
      url,
      body: request.body,
      authorization: request.headers.get('Authorization'),
    });
  } catch (error) {
    if (error instanceof MockStatusError) {
      return throwError(
        () =>
          new HttpErrorResponse({
            status: error.status,
            statusText: error.detail,
            url,
            error: { type: 'https://www.jhipster.tech/problem/problem-with-message', title: error.detail, status: error.status },
          }),
      ).pipe(delay(wait));
    }

    if (error instanceof MockNotFoundError) {
      // An unmocked endpoint is a 404, and a loud one. Falling through to
      // next() would send it at a dev server with no backend behind it and
      // stall, which reads as "the app is slow" rather than "that endpoint
      // was never mocked".

      console.warn(`[mock-api] no handler for ${request.method} ${path} — returning 404`);
      return throwError(
        () =>
          new HttpErrorResponse({
            status: 404,
            statusText: 'Not Found',
            url,
            error: { title: `No mock handler for ${request.method} ${path}`, status: 404 },
          }),
      ).pipe(delay(wait));
    }

    throw error;
  }

  // A zero wait emits synchronously rather than scheduling a timer: there is
  // nothing to wait for, and a scheduled tick is one more thing that can be
  // starved by whatever else owns the event loop.
  return wait > 0 ? of(response).pipe(delay(wait)) : of(response);
};
