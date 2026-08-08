import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import dayjs from 'dayjs/esm';
import { Observable, map } from 'rxjs';

import { DATE_FORMAT } from 'app/config/input.constants';
import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { isPresent } from 'app/core/util/operators';
import { IProfessional, NewProfessional } from '../professional.model';

export type PartialUpdateProfessional = Partial<IProfessional> & Pick<IProfessional, 'id'>;

type RestOf<T extends IProfessional | NewProfessional> = Omit<T, 'joinedOn'> & {
  joinedOn?: string | null;
};

export type RestProfessional = RestOf<IProfessional>;

export type NewRestProfessional = RestOf<NewProfessional>;

export type PartialUpdateRestProfessional = RestOf<PartialUpdateProfessional>;

@Injectable()
export class ProfessionalsService {
  readonly professionalsParams = signal<Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined>(
    undefined,
  );
  readonly professionalsResource = httpResource<RestProfessional[]>(() => {
    const params = this.professionalsParams();
    if (!params) {
      return undefined;
    }
    return { url: this.resourceUrl, params };
  });
  /**
   * This signal holds the list of professional that have been fetched. It is updated when the professionalsResource emits a new value.
   * In case of error while fetching the professionals, the signal is set to an empty array.
   */
  readonly professionals = computed(() =>
    (this.professionalsResource.hasValue() ? this.professionalsResource.value() : []).map(item => this.convertValueFromServer(item)),
  );
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/professionals');

  protected convertValueFromServer(restProfessional: RestProfessional): IProfessional {
    return {
      ...restProfessional,
      joinedOn: restProfessional.joinedOn ? dayjs(restProfessional.joinedOn) : undefined,
    };
  }
}

@Injectable({ providedIn: 'root' })
export class ProfessionalService extends ProfessionalsService {
  protected readonly http = inject(HttpClient);

  create(professional: NewProfessional): Observable<IProfessional> {
    const copy = this.convertValueFromClient(professional);
    return this.http.post<RestProfessional>(this.resourceUrl, copy).pipe(map(res => this.convertResponseFromServer(res)));
  }

  update(professional: IProfessional): Observable<IProfessional> {
    const copy = this.convertValueFromClient(professional);
    return this.http
      .put<RestProfessional>(`${this.resourceUrl}/${encodeURIComponent(this.getProfessionalIdentifier(professional))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  partialUpdate(professional: PartialUpdateProfessional): Observable<IProfessional> {
    const copy = this.convertValueFromClient(professional);
    return this.http
      .patch<RestProfessional>(`${this.resourceUrl}/${encodeURIComponent(this.getProfessionalIdentifier(professional))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  find(id: string): Observable<IProfessional> {
    return this.http
      .get<RestProfessional>(`${this.resourceUrl}/${encodeURIComponent(id)}`)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  query(req?: any): Observable<HttpResponse<IProfessional[]>> {
    const options = createRequestOption(req);
    return this.http
      .get<RestProfessional[]>(this.resourceUrl, { params: options, observe: 'response' })
      .pipe(map(res => res.clone({ body: this.convertResponseArrayFromServer(res.body!) })));
  }

  delete(id: string): Observable<undefined> {
    return this.http.delete<undefined>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  /**
   * Archive or restore, as a PATCH of the single field.
   *
   * Deliberately not a PUT of the whole record: the detail view holds whatever
   * the resolver last read, and sending it back would quietly overwrite any
   * change made in between with a stale copy. PATCH sends { id, isArchived }
   * and nothing else.
   */
  setArchived(professional: Pick<IProfessional, 'id'>, isArchived: boolean): Observable<IProfessional> {
    return this.partialUpdate({ id: professional.id, isArchived });
  }

  getProfessionalIdentifier(professional: Pick<IProfessional, 'id'>): string {
    return professional.id;
  }

  compareProfessional(o1: Pick<IProfessional, 'id'> | null, o2: Pick<IProfessional, 'id'> | null): boolean {
    return o1 && o2 ? this.getProfessionalIdentifier(o1) === this.getProfessionalIdentifier(o2) : o1 === o2;
  }

  addProfessionalToCollectionIfMissing<Type extends Pick<IProfessional, 'id'>>(
    professionalCollection: Type[],
    ...professionalsToCheck: (Type | null | undefined)[]
  ): Type[] {
    const professionals: Type[] = professionalsToCheck.filter(isPresent);
    if (professionals.length > 0) {
      const professionalCollectionIdentifiers = professionalCollection.map(professionalItem =>
        this.getProfessionalIdentifier(professionalItem),
      );
      const professionalsToAdd = professionals.filter(professionalItem => {
        const professionalIdentifier = this.getProfessionalIdentifier(professionalItem);
        if (professionalCollectionIdentifiers.includes(professionalIdentifier)) {
          return false;
        }
        professionalCollectionIdentifiers.push(professionalIdentifier);
        return true;
      });
      return [...professionalsToAdd, ...professionalCollection];
    }
    return professionalCollection;
  }

  protected convertValueFromClient<T extends IProfessional | NewProfessional | PartialUpdateProfessional>(professional: T): RestOf<T> {
    return {
      ...professional,
      joinedOn: professional.joinedOn?.format(DATE_FORMAT) ?? null,
    };
  }

  protected convertResponseFromServer(res: RestProfessional): IProfessional {
    return this.convertValueFromServer(res);
  }

  protected convertResponseArrayFromServer(res: RestProfessional[]): IProfessional[] {
    return res.map(item => this.convertValueFromServer(item));
  }
}
