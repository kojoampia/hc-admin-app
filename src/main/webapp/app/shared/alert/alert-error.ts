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
    const headers = Object.fromEntries(httpErrorResponse.headers.keys().map(key => [key, httpErrorResponse.headers.getAll(key)]));
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
