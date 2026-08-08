import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import dayjs from 'dayjs/esm';
import { Observable, map } from 'rxjs';

import { DATE_FORMAT } from 'app/config/input.constants';
import { ADMIN_SERVICE } from 'app/config/microservice.constants';
import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { isPresent } from 'app/core/util/operators';
import { IOrganisation, NewOrganisation } from '../organisation.model';

export type PartialUpdateOrganisation = Partial<IOrganisation> & Pick<IOrganisation, 'id'>;

type RestOf<T extends IOrganisation | NewOrganisation> = Omit<T, 'foundedOn'> & {
  foundedOn?: string | null;
};

export type RestOrganisation = RestOf<IOrganisation>;

export type NewRestOrganisation = RestOf<NewOrganisation>;

export type PartialUpdateRestOrganisation = RestOf<PartialUpdateOrganisation>;

@Injectable()
export class OrganisationsService {
  readonly organisationsParams = signal<Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined>(
    undefined,
  );
  readonly organisationsResource = httpResource<RestOrganisation[]>(() => {
    const params = this.organisationsParams();
    if (!params) {
      return undefined;
    }
    return { url: this.resourceUrl, params };
  });
  /**
   * This signal holds the list of organisation that have been fetched. It is updated when the organisationsResource emits a new value.
   * In case of error while fetching the organisations, the signal is set to an empty array.
   */
  readonly organisations = computed(() =>
    (this.organisationsResource.hasValue() ? this.organisationsResource.value() : []).map(item => this.convertValueFromServer(item)),
  );
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/organisations', ADMIN_SERVICE);

  protected convertValueFromServer(restOrganisation: RestOrganisation): IOrganisation {
    return {
      ...restOrganisation,
      foundedOn: restOrganisation.foundedOn ? dayjs(restOrganisation.foundedOn) : undefined,
    };
  }
}

@Injectable({ providedIn: 'root' })
export class OrganisationService extends OrganisationsService {
  protected readonly http = inject(HttpClient);

  create(organisation: NewOrganisation): Observable<IOrganisation> {
    const copy = this.convertValueFromClient(organisation);
    return this.http.post<RestOrganisation>(this.resourceUrl, copy).pipe(map(res => this.convertResponseFromServer(res)));
  }

  update(organisation: IOrganisation): Observable<IOrganisation> {
    const copy = this.convertValueFromClient(organisation);
    return this.http
      .put<RestOrganisation>(`${this.resourceUrl}/${encodeURIComponent(this.getOrganisationIdentifier(organisation))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  partialUpdate(organisation: PartialUpdateOrganisation): Observable<IOrganisation> {
    const copy = this.convertValueFromClient(organisation);
    return this.http
      .patch<RestOrganisation>(`${this.resourceUrl}/${encodeURIComponent(this.getOrganisationIdentifier(organisation))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  find(id: string): Observable<IOrganisation> {
    return this.http
      .get<RestOrganisation>(`${this.resourceUrl}/${encodeURIComponent(id)}`)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  query(req?: any): Observable<HttpResponse<IOrganisation[]>> {
    const options = createRequestOption(req);
    return this.http
      .get<RestOrganisation[]>(this.resourceUrl, { params: options, observe: 'response' })
      .pipe(map(res => res.clone({ body: this.convertResponseArrayFromServer(res.body!) })));
  }

  delete(id: string): Observable<undefined> {
    return this.http.delete<undefined>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  getOrganisationIdentifier(organisation: Pick<IOrganisation, 'id'>): string {
    return organisation.id;
  }

  compareOrganisation(o1: Pick<IOrganisation, 'id'> | null, o2: Pick<IOrganisation, 'id'> | null): boolean {
    return o1 && o2 ? this.getOrganisationIdentifier(o1) === this.getOrganisationIdentifier(o2) : o1 === o2;
  }

  addOrganisationToCollectionIfMissing<Type extends Pick<IOrganisation, 'id'>>(
    organisationCollection: Type[],
    ...organisationsToCheck: (Type | null | undefined)[]
  ): Type[] {
    const organisations: Type[] = organisationsToCheck.filter(isPresent);
    if (organisations.length > 0) {
      const organisationCollectionIdentifiers = organisationCollection.map(organisationItem =>
        this.getOrganisationIdentifier(organisationItem),
      );
      const organisationsToAdd = organisations.filter(organisationItem => {
        const organisationIdentifier = this.getOrganisationIdentifier(organisationItem);
        if (organisationCollectionIdentifiers.includes(organisationIdentifier)) {
          return false;
        }
        organisationCollectionIdentifiers.push(organisationIdentifier);
        return true;
      });
      return [...organisationsToAdd, ...organisationCollection];
    }
    return organisationCollection;
  }

  protected convertValueFromClient<T extends IOrganisation | NewOrganisation | PartialUpdateOrganisation>(organisation: T): RestOf<T> {
    return {
      ...organisation,
      foundedOn: organisation.foundedOn?.format(DATE_FORMAT) ?? null,
    };
  }

  protected convertResponseFromServer(res: RestOrganisation): IOrganisation {
    return this.convertValueFromServer(res);
  }

  protected convertResponseArrayFromServer(res: RestOrganisation[]): IOrganisation[] {
    return res.map(item => this.convertValueFromServer(item));
  }
}
