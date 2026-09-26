import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import dayjs from 'dayjs/esm';
import { Observable, map } from 'rxjs';

import { DATE_FORMAT } from 'app/config/input.constants';
import { PROFESSIONAL_SERVICE } from 'app/config/microservice.constants';
import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { isPresent } from 'app/core/util/operators';
import { IProfessionalProfile, NewProfessionalProfile } from '../professional.model';

export type PartialUpdateProfessionalProfile = Partial<IProfessionalProfile> & Pick<IProfessionalProfile, 'id'>;

type RestOf<T extends IProfessionalProfile | NewProfessionalProfile> = Omit<T, 'dateOfBirth'> & {
  dateOfBirth?: string | null;
};

export type RestProfessionalProfile = RestOf<IProfessionalProfile>;

export type NewRestProfessionalProfile = RestOf<NewProfessionalProfile>;

export type PartialUpdateRestProfessionalProfile = RestOf<PartialUpdateProfessionalProfile>;

@Injectable()
export class ProfessionalService {
  readonly profilesParams = signal<Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined>(
    undefined,
  );
  readonly profilesResource = httpResource<RestProfessionalProfile[]>(() => {
    const params = this.profilesParams();
    if (!params) {
      return undefined;
    }
    return { url: this.resourceUrl, params };
  });
  /**
   * This signal holds the list of profile that have been fetched. It is updated when the profilesResource emits a new value.
   * In case of error while fetching the profiles, the signal is set to an empty array.
   */
  readonly profiles = computed(() =>
    (this.profilesResource.hasValue() ? this.profilesResource.value() : []).map(item => this.convertValueFromServer(item)),
  );
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/profiles', PROFESSIONAL_SERVICE);

  protected convertValueFromServer(restProfile: RestProfessionalProfile): IProfessionalProfile {
    return {
      ...restProfile,
      dateOfBirth: restProfile.dateOfBirth ? dayjs(restProfile.dateOfBirth) : undefined,
    };
  }
}

@Injectable({ providedIn: 'root' })
export class ProfessionalProfileService extends ProfessionalService {
  protected readonly http = inject(HttpClient);

  create(profile: NewProfessionalProfile): Observable<IProfessionalProfile> {
    const copy = this.convertValueFromClient(profile);
    return this.http.post<RestProfessionalProfile>(this.resourceUrl, copy).pipe(map(res => this.convertResponseFromServer(res)));
  }

  update(profile: IProfessionalProfile): Observable<IProfessionalProfile> {
    const copy = this.convertValueFromClient(profile);
    return this.http
      .put<RestProfessionalProfile>(`${this.resourceUrl}/${encodeURIComponent(this.getProfileIdentifier(profile))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  partialUpdate(profile: PartialUpdateProfessionalProfile): Observable<IProfessionalProfile> {
    const copy = this.convertValueFromClient(profile);
    return this.http
      .patch<RestProfessionalProfile>(`${this.resourceUrl}/${encodeURIComponent(this.getProfileIdentifier(profile))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  find(id: string): Observable<IProfessionalProfile> {
    return this.http
      .get<RestProfessionalProfile>(`${this.resourceUrl}/${encodeURIComponent(id)}`)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  query(req?: any): Observable<HttpResponse<IProfessionalProfile[]>> {
    const options = createRequestOption(req);
    return this.http
      .get<RestProfessionalProfile[]>(this.resourceUrl, { params: options, observe: 'response' })
      .pipe(map(res => res.clone({ body: this.convertResponseArrayFromServer(res.body!) })));
  }

  delete(id: string): Observable<undefined> {
    return this.http.delete<undefined>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  getProfileIdentifier(profile: Pick<IProfessionalProfile, 'id'>): string {
    return profile.id;
  }

  compareProfile(o1: Pick<IProfessionalProfile, 'id'> | null, o2: Pick<IProfessionalProfile, 'id'> | null): boolean {
    return o1 && o2 ? this.getProfileIdentifier(o1) === this.getProfileIdentifier(o2) : o1 === o2;
  }

  addProfileToCollectionIfMissing<Type extends Pick<IProfessionalProfile, 'id'>>(
    profileCollection: Type[],
    ...profilesToCheck: (Type | null | undefined)[]
  ): Type[] {
    const profiles: Type[] = profilesToCheck.filter(isPresent);
    if (profiles.length > 0) {
      const profileCollectionIdentifiers = profileCollection.map(profileItem => this.getProfileIdentifier(profileItem));
      const profilesToAdd = profiles.filter(profileItem => {
        const profileIdentifier = this.getProfileIdentifier(profileItem);
        if (profileCollectionIdentifiers.includes(profileIdentifier)) {
          return false;
        }
        profileCollectionIdentifiers.push(profileIdentifier);
        return true;
      });
      return [...profilesToAdd, ...profileCollection];
    }
    return profileCollection;
  }

  protected convertValueFromClient<T extends IProfessionalProfile | NewProfessionalProfile | PartialUpdateProfessionalProfile>(
    profile: T,
  ): RestOf<T> {
    return {
      ...profile,
      dateOfBirth: profile.dateOfBirth?.format(DATE_FORMAT) ?? null,
    };
  }

  protected convertResponseFromServer(res: RestProfessionalProfile): IProfessionalProfile {
    return this.convertValueFromServer(res);
  }

  protected convertResponseArrayFromServer(res: RestProfessionalProfile[]): IProfessionalProfile[] {
    return res.map(item => this.convertValueFromServer(item));
  }
}
