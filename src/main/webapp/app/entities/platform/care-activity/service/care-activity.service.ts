import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import dayjs from 'dayjs/esm';
import { Observable, map } from 'rxjs';

import { DATE_FORMAT } from 'app/config/input.constants';
import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { isPresent } from 'app/core/util/operators';
import { ICareActivity, NewCareActivity } from '../care-activity.model';

export type PartialUpdateCareActivity = Partial<ICareActivity> & Pick<ICareActivity, 'id'>;

type RestOf<T extends ICareActivity | NewCareActivity> = Omit<T, 'occurredOn'> & {
  occurredOn?: string | null;
};

export type RestCareActivity = RestOf<ICareActivity>;

export type NewRestCareActivity = RestOf<NewCareActivity>;

export type PartialUpdateRestCareActivity = RestOf<PartialUpdateCareActivity>;

@Injectable()
export class CareActivitiesService {
  readonly careActivitiesParams = signal<Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined>(
    undefined,
  );
  readonly careActivitiesResource = httpResource<RestCareActivity[]>(() => {
    const params = this.careActivitiesParams();
    if (!params) {
      return undefined;
    }
    return { url: this.resourceUrl, params };
  });
  /**
   * This signal holds the list of careActivity that have been fetched. It is updated when the careActivitiesResource emits a new value.
   * In case of error while fetching the careActivities, the signal is set to an empty array.
   */
  readonly careActivities = computed(() =>
    (this.careActivitiesResource.hasValue() ? this.careActivitiesResource.value() : []).map(item => this.convertValueFromServer(item)),
  );
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/care-activities');

  protected convertValueFromServer(restCareActivity: RestCareActivity): ICareActivity {
    return {
      ...restCareActivity,
      occurredOn: restCareActivity.occurredOn ? dayjs(restCareActivity.occurredOn) : undefined,
    };
  }
}

@Injectable({ providedIn: 'root' })
export class CareActivityService extends CareActivitiesService {
  protected readonly http = inject(HttpClient);

  create(careActivity: NewCareActivity): Observable<ICareActivity> {
    const copy = this.convertValueFromClient(careActivity);
    return this.http.post<RestCareActivity>(this.resourceUrl, copy).pipe(map(res => this.convertResponseFromServer(res)));
  }

  update(careActivity: ICareActivity): Observable<ICareActivity> {
    const copy = this.convertValueFromClient(careActivity);
    return this.http
      .put<RestCareActivity>(`${this.resourceUrl}/${encodeURIComponent(this.getCareActivityIdentifier(careActivity))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  partialUpdate(careActivity: PartialUpdateCareActivity): Observable<ICareActivity> {
    const copy = this.convertValueFromClient(careActivity);
    return this.http
      .patch<RestCareActivity>(`${this.resourceUrl}/${encodeURIComponent(this.getCareActivityIdentifier(careActivity))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  find(id: string): Observable<ICareActivity> {
    return this.http
      .get<RestCareActivity>(`${this.resourceUrl}/${encodeURIComponent(id)}`)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  query(req?: any): Observable<HttpResponse<ICareActivity[]>> {
    const options = createRequestOption(req);
    return this.http
      .get<RestCareActivity[]>(this.resourceUrl, { params: options, observe: 'response' })
      .pipe(map(res => res.clone({ body: this.convertResponseArrayFromServer(res.body!) })));
  }

  delete(id: string): Observable<undefined> {
    return this.http.delete<undefined>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  getCareActivityIdentifier(careActivity: Pick<ICareActivity, 'id'>): string {
    return careActivity.id;
  }

  compareCareActivity(o1: Pick<ICareActivity, 'id'> | null, o2: Pick<ICareActivity, 'id'> | null): boolean {
    return o1 && o2 ? this.getCareActivityIdentifier(o1) === this.getCareActivityIdentifier(o2) : o1 === o2;
  }

  addCareActivityToCollectionIfMissing<Type extends Pick<ICareActivity, 'id'>>(
    careActivityCollection: Type[],
    ...careActivitiesToCheck: (Type | null | undefined)[]
  ): Type[] {
    const careActivities: Type[] = careActivitiesToCheck.filter(isPresent);
    if (careActivities.length > 0) {
      const careActivityCollectionIdentifiers = careActivityCollection.map(careActivityItem =>
        this.getCareActivityIdentifier(careActivityItem),
      );
      const careActivitiesToAdd = careActivities.filter(careActivityItem => {
        const careActivityIdentifier = this.getCareActivityIdentifier(careActivityItem);
        if (careActivityCollectionIdentifiers.includes(careActivityIdentifier)) {
          return false;
        }
        careActivityCollectionIdentifiers.push(careActivityIdentifier);
        return true;
      });
      return [...careActivitiesToAdd, ...careActivityCollection];
    }
    return careActivityCollection;
  }

  protected convertValueFromClient<T extends ICareActivity | NewCareActivity | PartialUpdateCareActivity>(careActivity: T): RestOf<T> {
    return {
      ...careActivity,
      occurredOn: careActivity.occurredOn?.format(DATE_FORMAT) ?? null,
    };
  }

  protected convertResponseFromServer(res: RestCareActivity): ICareActivity {
    return this.convertValueFromServer(res);
  }

  protected convertResponseArrayFromServer(res: RestCareActivity[]): ICareActivity[] {
    return res.map(item => this.convertValueFromServer(item));
  }
}
