import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import dayjs from 'dayjs/esm';
import { Observable, map } from 'rxjs';

import { DATE_FORMAT } from 'app/config/input.constants';
import { PROFESSIONAL_SERVICE, PROFESSIONAL_GATEWAY } from 'app/config/microservice.constants';
import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { isPresent } from 'app/core/util/operators';
import { IProfessionalUser, NewProfessionalUser } from '../professional.model';

export type PartialUpdateProfessionalUser = Partial<IProfessionalUser> & Pick<IProfessionalUser, 'id'>;

type RestOf<T extends IProfessionalUser | NewProfessionalUser> = Omit<T, 'joinedOn'> & {
  joinedOn?: string | null;
};

export type RestProfessionalUser = RestOf<IProfessionalUser>;

export type NewRestProfessionalUser = RestOf<NewProfessionalUser>;

export type PartialUpdateRestProfessionalUser = RestOf<PartialUpdateProfessionalUser>;

// Profile

export type PartialUpdateProfessionalProfile = Partial<IProfessionalProfile> & Pick<IProfessionalProfile, 'id'>;

type RestOf<T extends IProfessionalProfile | NewProfessionalProfile> = Omit<T, 'joinedOn'> & {
  joinedOn?: string | null;
};

export type RestProfessionalProfile = RestOf<IProfessionalProfile>;

export type NewRestProfessionalProfile = RestOf<NewProfessionalProfile>;

export type PartialUpdateRestProfessionalProfile = RestOf<PartialUpdateProfessionalProfile>;

@Injectable()
export class ProfessionalService {
  readonly professionalUserParams = signal<Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined>(
    undefined,
  );
  readonly professionalUserResource = httpResource<RestProfessionalUser[]>(() => {
    const params = this.professionalUserParams();
    if (!params) {
      return undefined;
    }
    return { url: this.userResourceUrl, params };
  });
  /**
   * This signal holds the list of professional that have been fetched. It is updated when the professionalsResource emits a new value.
   * In case of error while fetching the professionals, the signal is set to an empty array.
   */
  readonly professionalUsers = computed(() =>
    (this.professionalUserResource.hasValue() ? this.professionalUserResource.value() : []).map(item =>
      this.convertUserValueFromServer(item),
    ),
  );
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly userResourceUrl = this.applicationConfigService.getEndpointFor('api/admin/users', PROFESSIONAL_GATEWAY);

  protected convertUserValueFromServer(restProfessionalUser: RestProfessionalUser): IProfessionalUser {
    return {
      ...restProfessionalUser,
      joinedOn: restProfessionalUser.joinedOn ? dayjs(restProfessionalUser.joinedOn) : undefined,
    };
  }

  readonly professionalProfileParams = signal<
    Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined
  >(undefined);
  readonly professionalProfilesResource = httpResource<RestProfessionalProfile[]>(() => {
    const params = this.professionalProfileParams();
    if (!params) {
      return undefined;
    }
    return { url: this.profileResourceUrl, params };
  });
  /**
   * This signal holds the list of professional that have been fetched. It is updated when the professionalsResource emits a new value.
   * In case of error while fetching the professionals, the signal is set to an empty array.
   */
  readonly professionalProfiles = computed(() =>
    (this.professionalProfilesResource.hasValue() ? this.professionalProfilesResource.value() : []).map(item =>
      this.convertProfileValueFromServer(item),
    ),
  );
  protected readonly profileResourceUrl = this.applicationConfigService.getEndpointFor('api/profiles', PROFESSIONAL_SERVICE);

  protected convertProfileValueFromServer(restProfessionalProfile: RestProfessionalProfile): IProfessionalProfile {
    return {
      ...restProfessionalProfile,
      joinedOn: restProfessionalProfile.joinedOn ? dayjs(restProfessionalProfile.joinedOn) : undefined,
    };
  }
}

@Injectable({ providedIn: 'root' })
export class ProfessionalUserService extends ProfessionalService {
  protected readonly http = inject(HttpClient);

  create(professional: NewProfessionalUser): Observable<IProfessionalUser> {
    const copy = this.convertValueFromClient(professional);
    return this.http.post<RestProfessionalUser>(this.userResourceUrl, copy).pipe(map(res => this.convertResponseFromServer(res)));
  }

  update(professional: IProfessionalUser): Observable<IProfessionalUser> {
    const copy = this.convertValueFromClient(professional);
    return this.http
      .put<RestProfessionalUser>(`${this.userResourceUrl}/${encodeURIComponent(this.getProfessionalIdentifier(professional))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  partialUpdate(professional: PartialUpdateProfessionalUser): Observable<IProfessionalUser> {
    const copy = this.convertValueFromClient(professional);
    return this.http
      .patch<RestProfessionalUser>(`${this.userResourceUrl}/${encodeURIComponent(this.getProfessionalIdentifier(professional))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  find(id: string): Observable<IProfessionalUser> {
    return this.http
      .get<RestProfessionalUser>(`${this.userResourceUrl}/${encodeURIComponent(id)}`)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  query(req?: any): Observable<HttpResponse<IProfessionalUser[]>> {
    const options = createRequestOption(req);
    return this.http
      .get<RestProfessionalUser[]>(this.userResourceUrl, { params: options, observe: 'response' })
      .pipe(map(res => res.clone({ body: this.convertResponseArrayFromServer(res.body!) })));
  }

  delete(id: string): Observable<undefined> {
    return this.http.delete<undefined>(`${this.userResourceUrl}/${encodeURIComponent(id)}`);
  }

  /**
   * Archive or restore, as a PATCH of the single field.
   *
   * Deliberately not a PUT of the whole record: the detail view holds whatever
   * the resolver last read, and sending it back would quietly overwrite any
   * change made in between with a stale copy. PATCH sends { id, isArchived }
   * and nothing else.
   */
  setArchived(professional: Pick<IProfessionalUser, 'id'>, isArchived: boolean): Observable<IProfessionalUser> {
    return this.partialUpdate({ id: professional.id, isArchived });
  }

  getProfessionalIdentifier(professional: Pick<IProfessionalUser, 'id'>): string {
    return professional.id;
  }

  compareProfessional(o1: Pick<IProfessionalUser, 'id'> | null, o2: Pick<IProfessionalUser, 'id'> | null): boolean {
    return o1 && o2 ? this.getProfessionalIdentifier(o1) === this.getProfessionalIdentifier(o2) : o1 === o2;
  }

  addProfessionalToCollectionIfMissing<Type extends Pick<IProfessionalUser, 'id'>>(
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

  protected convertValueFromClient<T extends IProfessionalUser | NewProfessionalUser | PartialUpdateProfessionalUser>(
    professional: T,
  ): RestOf<T> {
    return {
      ...professional,
      joinedOn: professional.joinedOn?.format(DATE_FORMAT) ?? null,
    };
  }

  protected convertResponseFromServer(res: RestProfessionalUser): IProfessionalUser {
    return this.convertUserValueFromServer(res);
  }

  protected convertResponseArrayFromServer(res: RestProfessionalUser[]): IProfessionalUser[] {
    return res.map(item => this.convertUserValueFromServer(item));
  }
}

@Injectable({ providedIn: 'root' })
export class ProfessionalProfileService extends ProfessionalService {
  protected readonly http = inject(HttpClient);

  create(professional: NewProfessionalProfile): Observable<IProfessionalProfile> {
    const copy = this.convertValueFromClient(professional);
    return this.http.post<RestProfessionalProfile>(this.profileResourceUrl, copy).pipe(map(res => this.convertResponseFromServer(res)));
  }

  update(professional: IProfessionalProfile): Observable<IProfessionalProfile> {
    const copy = this.convertValueFromClient(professional);
    return this.http
      .put<RestProfessionalProfile>(`${this.profileResourceUrl}/${encodeURIComponent(this.getProfessionalIdentifier(professional))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  partialUpdate(professional: PartialUpdateProfessionalProfile): Observable<IProfessionalProfile> {
    const copy = this.convertValueFromClient(professional);
    return this.http
      .patch<RestProfessionalProfile>(
        `${this.profileResourceUrl}/${encodeURIComponent(this.getProfessionalIdentifier(professional))}`,
        copy,
      )
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  find(id: string): Observable<IProfessionalProfile> {
    return this.http
      .get<RestProfessionalProfile>(`${this.profileResourceUrl}/${encodeURIComponent(id)}`)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  query(req?: any): Observable<HttpResponse<IProfessionalProfile[]>> {
    const options = createRequestOption(req);
    return this.http
      .get<RestProfessionalProfile[]>(this.profileResourceUrl, { params: options, observe: 'response' })
      .pipe(map(res => res.clone({ body: this.convertResponseArrayFromServer(res.body!) })));
  }

  delete(id: string): Observable<undefined> {
    return this.http.delete<undefined>(`${this.profileResourceUrl}/${encodeURIComponent(id)}`);
  }

  /**
   * Archive or restore, as a PATCH of the single field.
   *
   * Deliberately not a PUT of the whole record: the detail view holds whatever
   * the resolver last read, and sending it back would quietly overwrite any
   * change made in between with a stale copy. PATCH sends { id, isArchived }
   * and nothing else.
   */
  setArchived(professional: Pick<IProfessionalProfile, 'id'>, isArchived: boolean): Observable<IProfessionalProfile> {
    return this.partialUpdate({ id: professional.id, isArchived });
  }

  getProfessionalIdentifier(professional: Pick<IProfessionalProfile, 'id'>): string {
    return professional.id;
  }

  compareProfessional(o1: Pick<IProfessionalProfile, 'id'> | null, o2: Pick<IProfessionalProfile, 'id'> | null): boolean {
    return o1 && o2 ? this.getProfessionalIdentifier(o1) === this.getProfessionalIdentifier(o2) : o1 === o2;
  }

  addProfessionalToCollectionIfMissing<Type extends Pick<IProfessionalProfile, 'id'>>(
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

  protected convertValueFromClient<T extends IProfessionalProfile | NewProfessional | PartialUpdateProfessionalProfile>(
    professional: T,
  ): RestOf<T> {
    return {
      ...professional,
      joinedOn: professional.joinedOn?.format(DATE_FORMAT) ?? null,
    };
  }

  protected convertResponseFromServer(res: RestProfessionalProfile): IProfessionalProfile {
    return this.convertProfileValueFromServer(res);
  }

  protected convertResponseArrayFromServer(res: RestProfessionalProfile[]): IProfessionalProfile[] {
    return res.map(item => this.convertProfileValueFromServer(item));
  }
}
