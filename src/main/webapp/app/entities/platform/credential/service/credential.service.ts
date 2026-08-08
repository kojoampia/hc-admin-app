import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import dayjs from 'dayjs/esm';
import { Observable, map } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { isPresent } from 'app/core/util/operators';
import { ICredential, NewCredential } from '../credential.model';

export type PartialUpdateCredential = Partial<ICredential> & Pick<ICredential, 'id'>;

type RestOf<T extends ICredential | NewCredential> = Omit<T, 'lastLoginAt'> & {
  lastLoginAt?: string | null;
};

export type RestCredential = RestOf<ICredential>;

export type NewRestCredential = RestOf<NewCredential>;

export type PartialUpdateRestCredential = RestOf<PartialUpdateCredential>;

@Injectable()
export class CredentialsService {
  readonly credentialsParams = signal<Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined>(
    undefined,
  );
  readonly credentialsResource = httpResource<RestCredential[]>(() => {
    const params = this.credentialsParams();
    if (!params) {
      return undefined;
    }
    return { url: this.resourceUrl, params };
  });
  /**
   * This signal holds the list of credential that have been fetched. It is updated when the credentialsResource emits a new value.
   * In case of error while fetching the credentials, the signal is set to an empty array.
   */
  readonly credentials = computed(() =>
    (this.credentialsResource.hasValue() ? this.credentialsResource.value() : []).map(item => this.convertValueFromServer(item)),
  );
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  // Deliberately NOT routed through `services/hcadminservice/` like every other entity service.
  //
  // Credential is hc-admin-gateway's Account. The admin service has no such entity and never will:
  // the console model excluded Credential and CredentialRole on purpose, because the gateway owns
  // user records and the two live in different databases. `/services/hcadminservice/api/credentials`
  // would 404 forever.
  //
  // This path is therefore gateway-relative, and it is the one endpoint here the in-browser mock
  // answers with no real counterpart yet — the gateway serves user management under
  // `/api/admin/users`, a different shape. See app/config/microservice.constants.ts.
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/credentials');

  protected convertValueFromServer(restCredential: RestCredential): ICredential {
    return {
      ...restCredential,
      lastLoginAt: restCredential.lastLoginAt ? dayjs(restCredential.lastLoginAt) : undefined,
    };
  }
}

@Injectable({ providedIn: 'root' })
export class CredentialService extends CredentialsService {
  protected readonly http = inject(HttpClient);

  create(credential: NewCredential): Observable<ICredential> {
    const copy = this.convertValueFromClient(credential);
    return this.http.post<RestCredential>(this.resourceUrl, copy).pipe(map(res => this.convertResponseFromServer(res)));
  }

  update(credential: ICredential): Observable<ICredential> {
    const copy = this.convertValueFromClient(credential);
    return this.http
      .put<RestCredential>(`${this.resourceUrl}/${encodeURIComponent(this.getCredentialIdentifier(credential))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  partialUpdate(credential: PartialUpdateCredential): Observable<ICredential> {
    const copy = this.convertValueFromClient(credential);
    return this.http
      .patch<RestCredential>(`${this.resourceUrl}/${encodeURIComponent(this.getCredentialIdentifier(credential))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  find(id: string): Observable<ICredential> {
    return this.http
      .get<RestCredential>(`${this.resourceUrl}/${encodeURIComponent(id)}`)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  query(req?: any): Observable<HttpResponse<ICredential[]>> {
    const options = createRequestOption(req);
    return this.http
      .get<RestCredential[]>(this.resourceUrl, { params: options, observe: 'response' })
      .pipe(map(res => res.clone({ body: this.convertResponseArrayFromServer(res.body!) })));
  }

  delete(id: string): Observable<undefined> {
    return this.http.delete<undefined>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  getCredentialIdentifier(credential: Pick<ICredential, 'id'>): string {
    return credential.id;
  }

  compareCredential(o1: Pick<ICredential, 'id'> | null, o2: Pick<ICredential, 'id'> | null): boolean {
    return o1 && o2 ? this.getCredentialIdentifier(o1) === this.getCredentialIdentifier(o2) : o1 === o2;
  }

  addCredentialToCollectionIfMissing<Type extends Pick<ICredential, 'id'>>(
    credentialCollection: Type[],
    ...credentialsToCheck: (Type | null | undefined)[]
  ): Type[] {
    const credentials: Type[] = credentialsToCheck.filter(isPresent);
    if (credentials.length > 0) {
      const credentialCollectionIdentifiers = credentialCollection.map(credentialItem => this.getCredentialIdentifier(credentialItem));
      const credentialsToAdd = credentials.filter(credentialItem => {
        const credentialIdentifier = this.getCredentialIdentifier(credentialItem);
        if (credentialCollectionIdentifiers.includes(credentialIdentifier)) {
          return false;
        }
        credentialCollectionIdentifiers.push(credentialIdentifier);
        return true;
      });
      return [...credentialsToAdd, ...credentialCollection];
    }
    return credentialCollection;
  }

  protected convertValueFromClient<T extends ICredential | NewCredential | PartialUpdateCredential>(credential: T): RestOf<T> {
    return {
      ...credential,
      lastLoginAt: credential.lastLoginAt?.toJSON() ?? null,
    };
  }

  protected convertResponseFromServer(res: RestCredential): ICredential {
    return this.convertValueFromServer(res);
  }

  protected convertResponseArrayFromServer(res: RestCredential[]): ICredential[] {
    return res.map(item => this.convertValueFromServer(item));
  }
}
