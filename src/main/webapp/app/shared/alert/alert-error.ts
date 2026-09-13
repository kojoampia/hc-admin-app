import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';

import { NgbAlert } from '@ng-bootstrap/ng-bootstrap/alert';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

import { AlertModel, AlertService } from 'app/core/util/alert.service';
import { EventManager, EventWithContent } from 'app/core/util/event-manager.service';
import { getMessageFromHeaders } from 'app/shared/jhipster/headers';

import { AlertErrorModel } from './alert-error.model';

/** The four groups `app/entities/` is filed under, and so the four i18n namespaces. */
const ENTITY_GROUPS = ['directory', 'platform', 'operations', 'catalogue'] as const;

/** `licenceNumber` -> `Licence number`. A last resort, but never a translation key. */
function humanise(value: string): string {
  const spaced = value.replaceAll(/([a-z0-9])([A-Z])/g, '$1 $2').replaceAll('_', ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

@Component({
  selector: 'abf-alert-error',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './alert-error.html',
  imports: [NgbAlert],
})
export class AlertError implements OnDestroy {
  readonly alerts = signal<AlertModel[]>([]);
  errorListener: Subscription;
  httpErrorListener: Subscription;

  private readonly alertService = inject(AlertService);
  private readonly eventManager = inject(EventManager);

  private readonly translateService = inject(TranslateService);

  constructor() {
    this.errorListener = this.eventManager.subscribe('hcAdminApp.error', (response: EventWithContent<unknown> | string) => {
      const errorResponse = (response as EventWithContent<AlertErrorModel>).content;
      this.addErrorAlert(errorResponse.message, errorResponse.key, errorResponse.params);
    });

    this.httpErrorListener = this.eventManager.subscribe('hcAdminApp.httpError', (response: EventWithContent<unknown> | string) => {
      this.handleHttpError(response);
    });
  }

  setClasses(alert: AlertModel): Record<string, boolean> {
    const classes = { 'jhi-toast': Boolean(alert.toast) };
    if (alert.position) {
      return { ...classes, [alert.position]: true };
    }
    return classes;
  }

  ngOnDestroy(): void {
    this.eventManager.destroy(this.errorListener);
    this.eventManager.destroy(this.httpErrorListener);
  }

  close(alert: AlertModel): void {
    alert.close?.(this.alerts());
  }

  private addErrorAlert(message?: string, translationKey?: string, translationParams?: Record<string, unknown>): void {
    this.alertService.addAlert({ type: 'danger', message, translationKey, translationParams }, this.alerts());
  }

  private handleHttpError(response: EventWithContent<unknown> | string): void {
    const httpErrorResponse = (response as EventWithContent<HttpErrorResponse>).content;
    switch (httpErrorResponse.status) {
      // connection refused, server not reachable
      case 0:
        this.addErrorAlert('Server not reachable', 'error.server.not.reachable');
        break;

      case 400: {
        this.handleBadRequest(httpErrorResponse);
        break;
      }

      case 404:
        this.addErrorAlert('Not found', 'error.url.not.found');
        break;

      default:
        this.handleDefaultError(httpErrorResponse);
    }
  }

  private handleBadRequest(httpErrorResponse: HttpErrorResponse): void {
    // LOWER-CASED ON THE WAY IN, because the lookup below is an exact string match against
    // MESSAGE_*_HEADER_NAME and those constants are lower case. `HttpHeaders.keys()` returns the name
    // in whatever case it was SET, not normalised — measured 2026-09-13: a response carrying
    // `X-hcAdminApp-error` yields `keys() === ["X-hcAdminApp-error"]`, and `headers['x-hcadminapp-error']`
    // is then `undefined`.
    //
    // In a browser this happened to work anyway: XHR's `getAllResponseHeaders()` lower-cases names, so
    // Angular builds the map from already-lower-cased keys. **That is a property of a layer this suite
    // cannot reach**, and betting the alert path on it is the kind of assumption backlog item 95 exists
    // to close — the services and the console disagreed about a header name for the whole life of this
    // repository and nobody noticed, because nothing failed loudly.
    const headers = Object.fromEntries(
      httpErrorResponse.headers.keys().map(key => [key.toLowerCase(), httpErrorResponse.headers.getAll(key)]),
    );
    const message = getMessageFromHeaders(headers);
    if (message.errorKey) {
      const alertData = message.param ? { entityName: this.entityName(message.param) } : undefined;
      this.addErrorAlert(message.errorKey, message.errorKey, alertData);
    } else if (message.errorMessage) {
      this.addErrorAlert(message.errorMessage);
    } else if (httpErrorResponse.error !== '' && httpErrorResponse.error.fieldErrors) {
      this.handleFieldsError(httpErrorResponse);
    } else if (httpErrorResponse.error !== '' && httpErrorResponse.error.message) {
      this.addErrorAlert(
        httpErrorResponse.error.detail ?? httpErrorResponse.error.message,
        httpErrorResponse.error.message,
        httpErrorResponse.error.params,
      );
    } else {
      this.addErrorAlert(httpErrorResponse.error, httpErrorResponse.error);
    }
  }

  /**
   * Everything that is not a 0, 400 or 404 — in practice 401, 403, 405, 409, 500 and Spring's own
   * 406/413/415/503 family.
   *
   * `error.params` is handed to ngx-translate as the interpolation argument, so a `{{ … }}` in the
   * message key resolves only if `params` is a MAP. Since backlog item 89 (`api` `4f5d0ad`) the
   * server guarantees that: `ExceptionTranslator.buildInterpolationParams` wraps a non-map `params`
   * as `{ entityName: … }` on every non-400 status, so both branches of this class now receive the
   * same shape and a placeholder works on any key.
   *
   * Before that it did not, and the symptom was silent: `AmbiguousAccountException` set `params` to
   * the bare string `"directoryVendor"`, a string is not a parameter map, and so a `{{ … }}` rendered
   * literally while the bundle looked identical to a key that worked. `error.accountidambiguous` is
   * worded without a placeholder because of it — see backlog item 86 — and is left that way
   * deliberately: the value is the raw api entity name, not the console's label, because the
   * translation through `global.menu.entities.<param>` happens in `handleBadRequest` above and the
   * server cannot do it.
   *
   * WHAT WOULD BREAK IT AGAIN: an exception setting `params` to a map whose keys are not the ones the
   * message interpolates, or a future default-path handler bypassing `customizeProblem`. The server
   * side is pinned by `ExceptionTranslatorIT.testDefaultPathCarriesParamsAsAMap`.
   *
   * ⚠ THE 400 PATH ABOVE IS NOT THE HEALTHY COUNTEREXAMPLE IT LOOKS LIKE. `buildHeaders` never runs
   * for a `BadRequestAlertException` — see backlog item 91 — so `getMessageFromHeaders` finds no
   * `errorKey`, control falls to the `error.message` branch, and the body's `params` is read there
   * instead. `error.idexists`'s `{{ entityName }}` therefore renders literally today. Do not reason
   * from "the 400 branch builds a proper object" — it does, and nothing reads it.
   */
  private handleDefaultError(httpErrorResponse: HttpErrorResponse): void {
    if (httpErrorResponse.error !== '' && httpErrorResponse.error.message) {
      this.addErrorAlert(
        httpErrorResponse.error.detail ?? httpErrorResponse.error.message,
        httpErrorResponse.error.message,
        httpErrorResponse.error.params,
      );
    } else {
      this.addErrorAlert(httpErrorResponse.error, httpErrorResponse.error);
    }
  }

  /**
   * The entity is named by the api, in the api's own `ENTITY_NAME`, which for
   * five collections is not the spelling the console uses for them —
   * `hcAdminServiceOrganisation`, not `platformOrganisation`. Both are mapped
   * now, but `instant()` returns the key on a miss, so anything unmapped would
   * put `global.menu.entities.<whatever>` in front of the user inside an error
   * toast. Miss to the entity name in readable form instead.
   */
  private entityName(param: string): string {
    const key = `global.menu.entities.${param}`;
    const translated: string = this.translateService.instant(key);
    if (translated !== key) {
      return translated;
    }
    return humanise(param.replace(/^(?:hcAdminService|directory|platform|operations|catalogue)(?=[A-Z])/, '') || param);
  }

  /**
   * The field is named by the api as `<objectName>.<field>`, where `objectName`
   * is the request-body parameter with `DTO` stripped — `organisation`, not
   * `platformOrganisation`, which is the namespace the console files its field
   * labels under. Nothing on this screen ever matched, so every field-level
   * validation error read `Error on field "hcAdminApp.organisation.name"`.
   *
   * The console's namespace is its group plus the entity, so try the groups
   * rather than carrying a hand-written map that goes stale the moment an
   * entity moves between them.
   */
  private fieldName(objectName: string, field: string): string {
    const entity = objectName.charAt(0).toUpperCase() + objectName.slice(1);
    for (const namespace of [...ENTITY_GROUPS.map(group => `${group}${entity}`), objectName]) {
      const key = `hcAdminApp.${namespace}.${field}`;
      const translated: string = this.translateService.instant(key);
      if (translated !== key) {
        return translated;
      }
    }
    // Still nothing: name the field itself rather than the key we failed to find.
    return humanise(field.split('.').pop()!.replaceAll('[]', ''));
  }

  private handleFieldsError(httpErrorResponse: HttpErrorResponse): void {
    const { fieldErrors } = httpErrorResponse.error;
    for (const fieldError of fieldErrors) {
      if (['Min', 'Max', 'DecimalMin', 'DecimalMax'].includes(fieldError.message)) {
        fieldError.message = 'Size';
      }
      // convert 'something[14].other[4].id' to 'something[].other[].id' so translations can be written to it
      const convertedField: string = fieldError.field.replaceAll(/\[\d*\]/g, '[]');
      const fieldName: string = this.fieldName(fieldError.objectName as string, convertedField);
      this.addErrorAlert(`Error on field "${fieldName}"`, `error.${fieldError.message as string}`, { fieldName });
    }
  }
}
