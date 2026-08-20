import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import { Observable } from 'rxjs';

import { ADMIN_SERVICE } from 'app/config/microservice.constants';
import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { isPresent } from 'app/core/util/operators';
import { IServicePlan, IServicePlanSummary, NewServicePlan } from '../service-plan.model';

export type PartialUpdateServicePlan = Partial<IServicePlan> & Pick<IServicePlan, 'id'>;

@Injectable()
export class ServicePlansService {
  readonly servicePlansParams = signal<Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined>(
    undefined,
  );
  readonly servicePlansResource = httpResource<IServicePlan[]>(() => {
    const params = this.servicePlansParams();
    if (!params) {
      return undefined;
    }
    return { url: this.resourceUrl, params };
  });
  /**
   * This signal holds the list of servicePlan that have been fetched. It is updated when the servicePlansResource emits a new value.
   * In case of error while fetching the servicePlans, the signal is set to an empty array.
   */
  readonly servicePlans = computed(() => (this.servicePlansResource.hasValue() ? this.servicePlansResource.value() : []));
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/service-plans', ADMIN_SERVICE);
}

@Injectable({ providedIn: 'root' })
export class ServicePlanService extends ServicePlansService {
  protected readonly http = inject(HttpClient);

  create(servicePlan: NewServicePlan): Observable<IServicePlan> {
    return this.http.post<IServicePlan>(this.resourceUrl, servicePlan);
  }

  update(servicePlan: IServicePlan): Observable<IServicePlan> {
    return this.http.put<IServicePlan>(
      `${this.resourceUrl}/${encodeURIComponent(this.getServicePlanIdentifier(servicePlan))}`,
      servicePlan,
    );
  }

  partialUpdate(servicePlan: PartialUpdateServicePlan): Observable<IServicePlan> {
    return this.http.patch<IServicePlan>(
      `${this.resourceUrl}/${encodeURIComponent(this.getServicePlanIdentifier(servicePlan))}`,
      servicePlan,
    );
  }

  find(id: string): Observable<IServicePlan> {
    return this.http.get<IServicePlan>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  query(req?: any): Observable<HttpResponse<IServicePlan[]>> {
    const options = createRequestOption(req);
    return this.http.get<IServicePlan[]>(this.resourceUrl, { params: options, observe: 'response' });
  }

  /**
   * The plan mix, over the whole patient directory rather than the page of plans on screen.
   *
   * No date conversion, so it does not go through a converter — every field is a number or a string.
   */
  summary(): Observable<IServicePlanSummary> {
    return this.http.get<IServicePlanSummary>(`${this.resourceUrl}/summary`);
  }

  delete(id: string): Observable<undefined> {
    return this.http.delete<undefined>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  getServicePlanIdentifier(servicePlan: Pick<IServicePlan, 'id'>): string {
    return servicePlan.id;
  }

  compareServicePlan(o1: Pick<IServicePlan, 'id'> | null, o2: Pick<IServicePlan, 'id'> | null): boolean {
    return o1 && o2 ? this.getServicePlanIdentifier(o1) === this.getServicePlanIdentifier(o2) : o1 === o2;
  }

  addServicePlanToCollectionIfMissing<Type extends Pick<IServicePlan, 'id'>>(
    servicePlanCollection: Type[],
    ...servicePlansToCheck: (Type | null | undefined)[]
  ): Type[] {
    const servicePlans: Type[] = servicePlansToCheck.filter(isPresent);
    if (servicePlans.length > 0) {
      const servicePlanCollectionIdentifiers = servicePlanCollection.map(servicePlanItem => this.getServicePlanIdentifier(servicePlanItem));
      const servicePlansToAdd = servicePlans.filter(servicePlanItem => {
        const servicePlanIdentifier = this.getServicePlanIdentifier(servicePlanItem);
        if (servicePlanCollectionIdentifiers.includes(servicePlanIdentifier)) {
          return false;
        }
        servicePlanCollectionIdentifiers.push(servicePlanIdentifier);
        return true;
      });
      return [...servicePlansToAdd, ...servicePlanCollection];
    }
    return servicePlanCollection;
  }
}
