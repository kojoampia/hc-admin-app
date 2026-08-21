import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import dayjs from 'dayjs/esm';
import { Observable, map } from 'rxjs';

import { ADMIN_SERVICE } from 'app/config/microservice.constants';
import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { isPresent } from 'app/core/util/operators';
import { IPlatformService } from '../platform-service.model';

/**
 * The wire shape. `lastProbedAt` is an `Instant` on the api and a string in JSON, and `IPlatformService`
 * declares a `dayjs.Dayjs` — the same split the generated entity services all carry.
 */
type RestOf<T extends IPlatformService> = Omit<T, 'lastProbedAt'> & {
  lastProbedAt?: string | null;
};

export type RestPlatformService = RestOf<IPlatformService>;

@Injectable()
export class PlatformServicesService {
  readonly platformServicesParams = signal<Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined>(
    undefined,
  );
  readonly platformServicesResource = httpResource<RestPlatformService[]>(() => {
    const params = this.platformServicesParams();
    if (!params) {
      return undefined;
    }
    return { url: this.resourceUrl, params };
  });
  /**
   * This signal holds the list of platformService that have been fetched. It is updated when the platformServicesResource emits a new value.
   * In case of error while fetching the platformServices, the signal is set to an empty array.
   */
  readonly platformServices = computed(() =>
    (this.platformServicesResource.hasValue() ? this.platformServicesResource.value() : []).map(item => this.convertValueFromServer(item)),
  );
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/platform-services', ADMIN_SERVICE);

  protected convertValueFromServer(restPlatformService: RestPlatformService): IPlatformService {
    return {
      ...restPlatformService,
      lastProbedAt: restPlatformService.lastProbedAt ? dayjs(restPlatformService.lastProbedAt) : undefined,
    };
  }
}

@Injectable({ providedIn: 'root' })
export class PlatformServiceService extends PlatformServicesService {
  protected readonly http = inject(HttpClient);

  find(id: string): Observable<IPlatformService> {
    return this.http
      .get<RestPlatformService>(`${this.resourceUrl}/${encodeURIComponent(id)}`)
      .pipe(map(rest => this.convertValueFromServer(rest)));
  }

  query(req?: any): Observable<HttpResponse<IPlatformService[]>> {
    const options = createRequestOption(req);
    return this.http
      .get<RestPlatformService[]>(this.resourceUrl, { params: options, observe: 'response' })
      .pipe(map(response => response.clone({ body: (response.body ?? []).map(rest => this.convertValueFromServer(rest)) })));
  }

  /**
   * Re-checks one service now, and answers with what the probe found.
   *
   * <p>Item 22. A POST, because it stores the result — which is also why it is admin-only: the
   * read/write split puts every non-GET under `/api/**` behind ROLE_ADMIN, and the button is hidden
   * for anyone else rather than offered and refused.
   */
  probe(id: string): Observable<IPlatformService> {
    return this.http
      .post<RestPlatformService>(`${this.resourceUrl}/${encodeURIComponent(id)}/probe`, {})
      .pipe(map(rest => this.convertValueFromServer(rest)));
  }

  getPlatformServiceIdentifier(platformService: Pick<IPlatformService, 'id'>): string {
    return platformService.id;
  }

  comparePlatformService(o1: Pick<IPlatformService, 'id'> | null, o2: Pick<IPlatformService, 'id'> | null): boolean {
    return o1 && o2 ? this.getPlatformServiceIdentifier(o1) === this.getPlatformServiceIdentifier(o2) : o1 === o2;
  }

  addPlatformServiceToCollectionIfMissing<Type extends Pick<IPlatformService, 'id'>>(
    platformServiceCollection: Type[],
    ...platformServicesToCheck: (Type | null | undefined)[]
  ): Type[] {
    const platformServices: Type[] = platformServicesToCheck.filter(isPresent);
    if (platformServices.length > 0) {
      const platformServiceCollectionIdentifiers = platformServiceCollection.map(platformServiceItem =>
        this.getPlatformServiceIdentifier(platformServiceItem),
      );
      const platformServicesToAdd = platformServices.filter(platformServiceItem => {
        const platformServiceIdentifier = this.getPlatformServiceIdentifier(platformServiceItem);
        if (platformServiceCollectionIdentifiers.includes(platformServiceIdentifier)) {
          return false;
        }
        platformServiceCollectionIdentifiers.push(platformServiceIdentifier);
        return true;
      });
      return [...platformServicesToAdd, ...platformServiceCollection];
    }
    return platformServiceCollection;
  }
}
