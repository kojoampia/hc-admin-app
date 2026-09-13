import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { describe, expect, it } from 'vitest';

import { MESSAGE_ALERT_HEADER_NAME, MESSAGE_ERROR_HEADER_NAME, MESSAGE_PARAM_HEADER_NAME } from 'app/shared/jhipster/constants';
import { getMessageFromHeaders } from 'app/shared/jhipster/headers';

/**
 * The console must read an alert header in whatever case the server sent it.
 *
 * <p>Backlog item 95 aligned `api` and `gateway` on `jhipster.clientApp.name: hcAdminApp`, so both now
 * emit `X-hcAdminApp-alert` / `-error` / `-params` — mixed case, as JHipster's `HeaderUtil` builds it.
 * The constants this console matches against are lower case, and `HttpHeaders.keys()` returns the name
 * in the case it was SET rather than a normalised one. Measured 2026-09-13, before the fix: a response
 * carrying `X-hcAdminApp-error` gave `keys() === ["X-hcAdminApp-error"]` and the lookup returned
 * `undefined`.
 *
 * <p><b>In a browser it worked anyway</b>, because XHR's `getAllResponseHeaders()` lower-cases names
 * before Angular ever sees them. That is a property of a layer this suite cannot reach, and the alert
 * path should not rest on it: item 95 exists because the two sides disagreed about a header name for
 * the entire life of this repository without anything failing loudly.
 *
 * <p>So the callers lower-case on the way in, and this pins it from both directions — the mixed case a
 * service actually sends, and the lower case a browser would deliver. <b>Both must resolve.</b>
 */
describe('alert header case', () => {
  const cases: { label: string; alert: string; error: string; param: string }[] = [
    {
      label: 'as the services emit it (mixed case, straight from HeaderUtil)',
      alert: 'X-hcAdminApp-alert',
      error: 'X-hcAdminApp-error',
      param: 'X-hcAdminApp-params',
    },
    {
      label: 'as a browser delivers it (XHR lower-cases before Angular sees it)',
      alert: MESSAGE_ALERT_HEADER_NAME,
      error: MESSAGE_ERROR_HEADER_NAME,
      param: MESSAGE_PARAM_HEADER_NAME,
    },
  ];

  /** The record the two interceptors build — kept identical to theirs on purpose. */
  const asTheCallersBuildIt = (headers: HttpHeaders): Record<string, any> =>
    Object.fromEntries(headers.keys().map(key => [key.toLowerCase(), headers.getAll(key)]));

  cases.forEach(({ label, alert, error, param }) => {
    it(`reads an error alert ${label}`, () => {
      const response = new HttpErrorResponse({
        status: 400,
        headers: new HttpHeaders({ [error]: 'error.idexists', [param]: 'platformHub' }),
      });

      const message = getMessageFromHeaders(asTheCallersBuildIt(response.headers));

      expect(message.errorKey, `${error} did not resolve. The constants are lower case and HttpHeaders.keys() is not normalised`).toBe(
        'error.idexists',
      );
      expect(message.param).toBe('platformHub');
    });

    it(`reads a success alert ${label}`, () => {
      const headers = new HttpHeaders({ [alert]: 'hcAdminApp.hub.created', [param]: '42' });

      const message = getMessageFromHeaders(asTheCallersBuildIt(headers));

      expect(message.alertKey, `${alert} did not resolve — this is the path that has never shown a toast`).toBe('hcAdminApp.hub.created');
      expect(message.param).toBe('42');
    });
  });
});
