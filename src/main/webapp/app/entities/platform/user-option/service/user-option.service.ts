import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import { Observable } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { isPresent } from 'app/core/util/operators';
import { IUserOption, NewUserOption } from '../user-option.model';

export type PartialUpdateUserOption = Partial<IUserOption> & Pick<IUserOption, 'id'>;

@Injectable()
export class UserOptionsService {
  readonly userOptionsParams = signal<Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined>(
    undefined,
  );
  readonly userOptionsResource = httpResource<IUserOption[]>(() => {
    const params = this.userOptionsParams();
    if (!params) {
      return undefined;
    }
    return { url: this.resourceUrl, params };
  });
  /**
   * This signal holds the list of userOption that have been fetched. It is updated when the userOptionsResource emits a new value.
   * In case of error while fetching the userOptions, the signal is set to an empty array.
   */
  readonly userOptions = computed(() => (this.userOptionsResource.hasValue() ? this.userOptionsResource.value() : []));
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/user-options');
}

@Injectable({ providedIn: 'root' })
export class UserOptionService extends UserOptionsService {
  protected readonly http = inject(HttpClient);

  create(userOption: NewUserOption): Observable<IUserOption> {
    return this.http.post<IUserOption>(this.resourceUrl, userOption);
  }

  update(userOption: IUserOption): Observable<IUserOption> {
    return this.http.put<IUserOption>(`${this.resourceUrl}/${encodeURIComponent(this.getUserOptionIdentifier(userOption))}`, userOption);
  }

  partialUpdate(userOption: PartialUpdateUserOption): Observable<IUserOption> {
    return this.http.patch<IUserOption>(`${this.resourceUrl}/${encodeURIComponent(this.getUserOptionIdentifier(userOption))}`, userOption);
  }

  find(id: number): Observable<IUserOption> {
    return this.http.get<IUserOption>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  query(req?: any): Observable<HttpResponse<IUserOption[]>> {
    const options = createRequestOption(req);
    return this.http.get<IUserOption[]>(this.resourceUrl, { params: options, observe: 'response' });
  }

  delete(id: number): Observable<undefined> {
    return this.http.delete<undefined>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  getUserOptionIdentifier(userOption: Pick<IUserOption, 'id'>): number {
    return userOption.id;
  }

  compareUserOption(o1: Pick<IUserOption, 'id'> | null, o2: Pick<IUserOption, 'id'> | null): boolean {
    return o1 && o2 ? this.getUserOptionIdentifier(o1) === this.getUserOptionIdentifier(o2) : o1 === o2;
  }

  addUserOptionToCollectionIfMissing<Type extends Pick<IUserOption, 'id'>>(
    userOptionCollection: Type[],
    ...userOptionsToCheck: (Type | null | undefined)[]
  ): Type[] {
    const userOptions: Type[] = userOptionsToCheck.filter(isPresent);
    if (userOptions.length > 0) {
      const userOptionCollectionIdentifiers = userOptionCollection.map(userOptionItem => this.getUserOptionIdentifier(userOptionItem));
      const userOptionsToAdd = userOptions.filter(userOptionItem => {
        const userOptionIdentifier = this.getUserOptionIdentifier(userOptionItem);
        if (userOptionCollectionIdentifiers.includes(userOptionIdentifier)) {
          return false;
        }
        userOptionCollectionIdentifiers.push(userOptionIdentifier);
        return true;
      });
      return [...userOptionsToAdd, ...userOptionCollection];
    }
    return userOptionCollection;
  }
}
