import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import dayjs from 'dayjs/esm';
import { Observable, map } from 'rxjs';

import { DATE_FORMAT } from 'app/config/input.constants';
import { ADMIN_SERVICE, PROFESSIONAL_SERVICE, PROFESSIONAL_GATEWAY } from 'app/config/microservice.constants';
import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { isPresent } from 'app/core/util/operators';
import {
  IProfessional,
  NewProfessional,
  IProfessionalProfile,
  NewProfessionalProfile,
  IProfessionalUser,
  NewProfessionalUser,
} from '../professional.model';

// Professional

export type PartialUpdateProfessional = Partial<IProfessional> & Pick<IProfessional, 'id'>;

type RestOf<T extends IProfessional | NewProfessional> = Omit<T, 'joinedOn'> & {
  joinedOn?: string | null;
};

export type RestProfessional = RestOf<IProfessional>;

export type NewRestProfessional = RestOf<NewProfessional>;

export type PartialUpdateRestProfessional = RestOf<PartialUpdateProfessional>;

// User

export type PartialUpdateProfessionalUser = Partial<IProfessionalUser> & Pick<IProfessionalUser, 'id'>;

type RestOfUser<T extends IProfessionalUser | NewProfessionalUser> = Omit<T, 'createdDate' | 'lastModifiedDate'> & {
  createdDate?: string | null;
  lastModifiedDate?: string | null;
};

export type RestProfessionalUser = RestOf<IProfessionalUser>;

export type NewRestProfessionalUser = RestOf<NewProfessionalUser>;

export type PartialUpdateRestProfessionalUser = RestOf<PartialUpdateProfessionalUser>;

// Profile

export type PartialUpdateProfessionalProfile = Partial<IProfessionalProfile> & Pick<IProfessionalProfile, 'id'>;

type RestOfProfile<T extends IProfessionalProfile | NewProfessionalProfile> = Omit<T, 'dateOfBirth'> & {
  dateOfBirth?: string | null;
};

export type RestProfessionalProfile = RestOf<IProfessionalProfile>;

export type NewRestProfessionalProfile = RestOf<NewProfessionalProfile>;

export type PartialUpdateRestProfessionalProfile = RestOf<PartialUpdateProfessionalProfile>;

@Injectable()
export class ProfessionalsService {
  // Professional
  readonly professionalParams = signal<Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined>(
    undefined,
  );
  readonly professionalResource = httpResource<RestProfessional[]>(() => {
    const params = this.professionalParams();
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
    (this.professionalResource.hasValue() ? this.professionalResource.value() : []).map(item => this.convertValueFromServer(item)),
  );
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/professionals', ADMIN_SERVICE);

  protected convertValueFromServer(restProfessional: RestProfessional): IProfessional {
    return {
      ...restProfessional,
      joinedOn: restProfessional.joinedOn ? dayjs(restProfessional.joinedOn) : undefined,
    };
  }

  // User
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
  protected readonly userResourceUrl = this.applicationConfigService.getEndpointFor('api/admin/users', PROFESSIONAL_GATEWAY);

  protected convertUserValueFromServer(restProfessionalUser: RestProfessionalUser): IProfessionalUser {
    return {
      ...restProfessionalUser,
      createdDate: restProfessionalUser.createdDate ? dayjs(restProfessionalUser.createdDate) : undefined,
      lastModifiedDate: restProfessionalUser.lastModifiedDate ? dayjs(restProfessionalUser.lastModifiedDate) : undefined,
    };
  }

  //
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
      dateOfBirth: restProfessionalProfile.dateOfBirth ? dayjs(restProfessionalProfile.dateOfBirth) : undefined,
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
      .patch<RestProfessional>(`${this.userResourceUrl}/${encodeURIComponent(this.getProfessionalIdentifier(professional))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  find(id: string): Observable<IProfessional> {
    return this.http
      .get<RestProfessional>(`${this.userResourceUrl}/${encodeURIComponent(id)}`)
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
    return this.convertUserValueFromServer(res);
  }

  protected convertResponseArrayFromServer(res: RestProfessional[]): IProfessional[] {
    return res.map(item => this.convertUserValueFromServer(item));
  }
}

@Injectable({ providedIn: 'root' })
export class ProfessionalUserService extends ProfessionalsService {
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
  ): RestOfUser<T> {
    return {
      ...professional,
      createdDate: professional.createdDate?.format(DATE_FORMAT) ?? null,
      lastModifiedDate: professional.lastModifiedDate?.format(DATE_FORMAT) ?? null,
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
export class ProfessionalProfileService extends ProfessionalsService {
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

  protected convertValueFromClient<T extends IProfessionalProfile | NewProfessionalProfile | PartialUpdateProfessionalProfile>(
    professional: T,
  ): RestOfProfile<T> {
    return {
      ...professional,
      dateOfBirth: professional.dateOfBirth?.format(DATE_FORMAT) ?? null,
    };
  }

  protected convertResponseFromServer(res: RestProfessionalProfile): IProfessionalProfile {
    return this.convertProfileValueFromServer(res);
  }

  protected convertResponseArrayFromServer(res: RestProfessionalProfile[]): IProfessionalProfile[] {
    return res.map(item => this.convertProfileValueFromServer(item));
  }
}
