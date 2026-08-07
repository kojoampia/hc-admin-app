import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import { Observable } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { isPresent } from 'app/core/util/operators';
import { IPlanFeature, NewPlanFeature } from '../plan-feature.model';

export type PartialUpdatePlanFeature = Partial<IPlanFeature> & Pick<IPlanFeature, 'id'>;

@Injectable()
export class PlanFeaturesService {
  readonly planFeaturesParams = signal<Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined>(
    undefined,
  );
  readonly planFeaturesResource = httpResource<IPlanFeature[]>(() => {
    const params = this.planFeaturesParams();
    if (!params) {
      return undefined;
    }
    return { url: this.resourceUrl, params };
  });
  /**
   * This signal holds the list of planFeature that have been fetched. It is updated when the planFeaturesResource emits a new value.
   * In case of error while fetching the planFeatures, the signal is set to an empty array.
   */
  readonly planFeatures = computed(() => (this.planFeaturesResource.hasValue() ? this.planFeaturesResource.value() : []));
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/plan-features');
}

@Injectable({ providedIn: 'root' })
export class PlanFeatureService extends PlanFeaturesService {
  protected readonly http = inject(HttpClient);

  create(planFeature: NewPlanFeature): Observable<IPlanFeature> {
    return this.http.post<IPlanFeature>(this.resourceUrl, planFeature);
  }

  update(planFeature: IPlanFeature): Observable<IPlanFeature> {
    return this.http.put<IPlanFeature>(
      `${this.resourceUrl}/${encodeURIComponent(this.getPlanFeatureIdentifier(planFeature))}`,
      planFeature,
    );
  }

  partialUpdate(planFeature: PartialUpdatePlanFeature): Observable<IPlanFeature> {
    return this.http.patch<IPlanFeature>(
      `${this.resourceUrl}/${encodeURIComponent(this.getPlanFeatureIdentifier(planFeature))}`,
      planFeature,
    );
  }

  find(id: number): Observable<IPlanFeature> {
    return this.http.get<IPlanFeature>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  query(req?: any): Observable<HttpResponse<IPlanFeature[]>> {
    const options = createRequestOption(req);
    return this.http.get<IPlanFeature[]>(this.resourceUrl, { params: options, observe: 'response' });
  }

  delete(id: number): Observable<undefined> {
    return this.http.delete<undefined>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  getPlanFeatureIdentifier(planFeature: Pick<IPlanFeature, 'id'>): number {
    return planFeature.id;
  }

  comparePlanFeature(o1: Pick<IPlanFeature, 'id'> | null, o2: Pick<IPlanFeature, 'id'> | null): boolean {
    return o1 && o2 ? this.getPlanFeatureIdentifier(o1) === this.getPlanFeatureIdentifier(o2) : o1 === o2;
  }

  addPlanFeatureToCollectionIfMissing<Type extends Pick<IPlanFeature, 'id'>>(
    planFeatureCollection: Type[],
    ...planFeaturesToCheck: (Type | null | undefined)[]
  ): Type[] {
    const planFeatures: Type[] = planFeaturesToCheck.filter(isPresent);
    if (planFeatures.length > 0) {
      const planFeatureCollectionIdentifiers = planFeatureCollection.map(planFeatureItem => this.getPlanFeatureIdentifier(planFeatureItem));
      const planFeaturesToAdd = planFeatures.filter(planFeatureItem => {
        const planFeatureIdentifier = this.getPlanFeatureIdentifier(planFeatureItem);
        if (planFeatureCollectionIdentifiers.includes(planFeatureIdentifier)) {
          return false;
        }
        planFeatureCollectionIdentifiers.push(planFeatureIdentifier);
        return true;
      });
      return [...planFeaturesToAdd, ...planFeatureCollection];
    }
    return planFeatureCollection;
  }
}
