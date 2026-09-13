import { HttpEvent, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';

import { tap } from 'rxjs';

import { AlertService } from 'app/core/util/alert.service';
import { getMessageFromHeaders } from 'app/shared/jhipster/headers';

export const notificationInterceptor: HttpInterceptorFn = (req, next) => {
  const alertService = inject(AlertService);

  return next(req).pipe(
    tap((event: HttpEvent<any>) => {
      if (event instanceof HttpResponse) {
        // Lower-cased for the same reason as in `alert-error.ts`: the MESSAGE_*_HEADER_NAME constants
        // are lower case and `HttpHeaders.keys()` preserves the case the header was set in. This is the
        // SUCCESS path — the one that has never shown a toast, because until backlog item 95 no service
        // emitted a name this console reads at all.
        const headers = Object.fromEntries(event.headers.keys().map(key => [key.toLowerCase(), event.headers.getAll(key)]));
        const message = getMessageFromHeaders(headers);

        if (message.alertKey) {
          alertService.addAlert({
            type: 'success',
            translationKey: message.alertKey,
            translationParams: { param: message.param },
          });
        } else if (message.alertMessage) {
          alertService.addAlert({
            type: 'success',
            message: message.alertMessage,
          });
        }
      }
    }),
  );
};
