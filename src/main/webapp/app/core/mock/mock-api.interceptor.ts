import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpParams, HttpRequest, HttpResponse } from '@angular/common/http';
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
export const MOCK_LATENCY_MS = 120;

/**
 * Cypress and unit tests pass `?abfLatency=0` to remove the wait. It is read
 * per request rather than from a global so a single slow-path test can ask
 * for latency while the rest of the suite runs without it.
 */
const latencyFor = (params: HttpParams): number => {
  const override = params.get('abfLatency');
  if (override === null) {
    return MOCK_LATENCY_MS;
  }
  const parsed = Number(override);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : MOCK_LATENCY_MS;
};

const API_PREFIX = /^(?:.*\/)?api\//;

export const mockApiInterceptor = (request: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  // Split the query off; Angular has already parsed it into request.params.
  const [pathPart] = request.urlWithParams.split('?');
  const match = API_PREFIX.exec(pathPart);

  if (!match) {
    // Not an API call — webpack assets, i18n JSON, source maps. Let it go.
    return next(request);
  }

  const path = pathPart.slice(match.index + match[0].length);
  const url = pathPart;
  const wait = latencyFor(request.params);

  let response: HttpResponse<unknown>;
  try {
    response = handleRequest({
      method: request.method.toUpperCase(),
      path,
      params: request.params,
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

  return of(response).pipe(delay(wait));
};
