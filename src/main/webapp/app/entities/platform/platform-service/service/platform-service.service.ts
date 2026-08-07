import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import { Observable } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { isPresent } from 'app/core/util/operators';
import { IPlatformService } from '../platform-service.model';

@Injectable()
export class PlatformServicesService {
  readonly platformServicesParams = signal<Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined>(
    undefined,
  );
  readonly platformServicesResource = httpResource<IPlatformService[]>(() => {
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
  readonly platformServices = computed(() => (this.platformServicesResource.hasValue() ? this.platformServicesResource.value() : []));
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/platform-services');
}

@Injectable({ providedIn: 'root' })
export class PlatformServiceService extends PlatformServicesService {
  protected readonly http = inject(HttpClient);

  find(id: number): Observable<IPlatformService> {
    return this.http.get<IPlatformService>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  query(req?: any): Observable<HttpResponse<IPlatformService[]>> {
    const options = createRequestOption(req);
    return this.http.get<IPlatformService[]>(this.resourceUrl, { params: options, observe: 'response' });
  }

  getPlatformServiceIdentifier(platformService: Pick<IPlatformService, 'id'>): number {
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
