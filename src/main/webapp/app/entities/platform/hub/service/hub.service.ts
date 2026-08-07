import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import { Observable } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { isPresent } from 'app/core/util/operators';
import { IHub, NewHub } from '../hub.model';

export type PartialUpdateHub = Partial<IHub> & Pick<IHub, 'id'>;

@Injectable()
export class HubsService {
  readonly hubsParams = signal<Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined>(undefined);
  readonly hubsResource = httpResource<IHub[]>(() => {
    const params = this.hubsParams();
    if (!params) {
      return undefined;
    }
    return { url: this.resourceUrl, params };
  });
  /**
   * This signal holds the list of hub that have been fetched. It is updated when the hubsResource emits a new value.
   * In case of error while fetching the hubs, the signal is set to an empty array.
   */
  readonly hubs = computed(() => (this.hubsResource.hasValue() ? this.hubsResource.value() : []));
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/hubs');
}

@Injectable({ providedIn: 'root' })
export class HubService extends HubsService {
  protected readonly http = inject(HttpClient);

  create(hub: NewHub): Observable<IHub> {
    return this.http.post<IHub>(this.resourceUrl, hub);
  }

  update(hub: IHub): Observable<IHub> {
    return this.http.put<IHub>(`${this.resourceUrl}/${encodeURIComponent(this.getHubIdentifier(hub))}`, hub);
  }

  partialUpdate(hub: PartialUpdateHub): Observable<IHub> {
    return this.http.patch<IHub>(`${this.resourceUrl}/${encodeURIComponent(this.getHubIdentifier(hub))}`, hub);
  }

  find(id: string): Observable<IHub> {
    return this.http.get<IHub>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  query(req?: any): Observable<HttpResponse<IHub[]>> {
    const options = createRequestOption(req);
    return this.http.get<IHub[]>(this.resourceUrl, { params: options, observe: 'response' });
  }

  delete(id: string): Observable<undefined> {
    return this.http.delete<undefined>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  getHubIdentifier(hub: Pick<IHub, 'id'>): string {
    return hub.id;
  }

  compareHub(o1: Pick<IHub, 'id'> | null, o2: Pick<IHub, 'id'> | null): boolean {
    return o1 && o2 ? this.getHubIdentifier(o1) === this.getHubIdentifier(o2) : o1 === o2;
  }

  addHubToCollectionIfMissing<Type extends Pick<IHub, 'id'>>(hubCollection: Type[], ...hubsToCheck: (Type | null | undefined)[]): Type[] {
    const hubs: Type[] = hubsToCheck.filter(isPresent);
    if (hubs.length > 0) {
      const hubCollectionIdentifiers = hubCollection.map(hubItem => this.getHubIdentifier(hubItem));
      const hubsToAdd = hubs.filter(hubItem => {
        const hubIdentifier = this.getHubIdentifier(hubItem);
        if (hubCollectionIdentifiers.includes(hubIdentifier)) {
          return false;
        }
        hubCollectionIdentifiers.push(hubIdentifier);
        return true;
      });
      return [...hubsToAdd, ...hubCollection];
    }
    return hubCollection;
  }
}
