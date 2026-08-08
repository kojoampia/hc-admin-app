import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import { Observable } from 'rxjs';

import { ADMIN_SERVICE } from 'app/config/microservice.constants';
import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { isPresent } from 'app/core/util/operators';
import { IServiceActivity, NewServiceActivity } from '../service-activity.model';

export type PartialUpdateServiceActivity = Partial<IServiceActivity> & Pick<IServiceActivity, 'id'>;

@Injectable()
export class ServiceActivitiesService {
  readonly serviceActivitiesParams = signal<Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined>(
    undefined,
  );
  readonly serviceActivitiesResource = httpResource<IServiceActivity[]>(() => {
    const params = this.serviceActivitiesParams();
    if (!params) {
      return undefined;
    }
    return { url: this.resourceUrl, params };
  });
  /**
   * This signal holds the list of serviceActivity that have been fetched. It is updated when the serviceActivitiesResource emits a new value.
   * In case of error while fetching the serviceActivities, the signal is set to an empty array.
   */
  readonly serviceActivities = computed(() => (this.serviceActivitiesResource.hasValue() ? this.serviceActivitiesResource.value() : []));
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/service-activities', ADMIN_SERVICE);
}

@Injectable({ providedIn: 'root' })
export class ServiceActivityService extends ServiceActivitiesService {
  protected readonly http = inject(HttpClient);

  create(serviceActivity: NewServiceActivity): Observable<IServiceActivity> {
    return this.http.post<IServiceActivity>(this.resourceUrl, serviceActivity);
  }

  update(serviceActivity: IServiceActivity): Observable<IServiceActivity> {
    return this.http.put<IServiceActivity>(
      `${this.resourceUrl}/${encodeURIComponent(this.getServiceActivityIdentifier(serviceActivity))}`,
      serviceActivity,
    );
  }

  partialUpdate(serviceActivity: PartialUpdateServiceActivity): Observable<IServiceActivity> {
    return this.http.patch<IServiceActivity>(
      `${this.resourceUrl}/${encodeURIComponent(this.getServiceActivityIdentifier(serviceActivity))}`,
      serviceActivity,
    );
  }

  find(id: string): Observable<IServiceActivity> {
    return this.http.get<IServiceActivity>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  query(req?: any): Observable<HttpResponse<IServiceActivity[]>> {
    const options = createRequestOption(req);
    return this.http.get<IServiceActivity[]>(this.resourceUrl, { params: options, observe: 'response' });
  }

  delete(id: string): Observable<undefined> {
    return this.http.delete<undefined>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  getServiceActivityIdentifier(serviceActivity: Pick<IServiceActivity, 'id'>): string {
    return serviceActivity.id;
  }

  compareServiceActivity(o1: Pick<IServiceActivity, 'id'> | null, o2: Pick<IServiceActivity, 'id'> | null): boolean {
    return o1 && o2 ? this.getServiceActivityIdentifier(o1) === this.getServiceActivityIdentifier(o2) : o1 === o2;
  }

  addServiceActivityToCollectionIfMissing<Type extends Pick<IServiceActivity, 'id'>>(
    serviceActivityCollection: Type[],
    ...serviceActivitiesToCheck: (Type | null | undefined)[]
  ): Type[] {
    const serviceActivities: Type[] = serviceActivitiesToCheck.filter(isPresent);
    if (serviceActivities.length > 0) {
      const serviceActivityCollectionIdentifiers = serviceActivityCollection.map(serviceActivityItem =>
        this.getServiceActivityIdentifier(serviceActivityItem),
      );
      const serviceActivitiesToAdd = serviceActivities.filter(serviceActivityItem => {
        const serviceActivityIdentifier = this.getServiceActivityIdentifier(serviceActivityItem);
        if (serviceActivityCollectionIdentifiers.includes(serviceActivityIdentifier)) {
          return false;
        }
        serviceActivityCollectionIdentifiers.push(serviceActivityIdentifier);
        return true;
      });
      return [...serviceActivitiesToAdd, ...serviceActivityCollection];
    }
    return serviceActivityCollection;
  }
}
