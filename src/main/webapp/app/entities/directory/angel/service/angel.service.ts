import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import { Observable } from 'rxjs';

import { ADMIN_SERVICE } from 'app/config/microservice.constants';
import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { isPresent } from 'app/core/util/operators';
import { IAngel, NewAngel } from '../angel.model';

export type PartialUpdateAngel = Partial<IAngel> & Pick<IAngel, 'id'>;

@Injectable()
export class AngelsService {
  readonly angelsParams = signal<Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined>(undefined);
  readonly angelsResource = httpResource<IAngel[]>(() => {
    const params = this.angelsParams();
    if (!params) {
      return undefined;
    }
    return { url: this.resourceUrl, params };
  });
  /**
   * This signal holds the list of angel that have been fetched. It is updated when the angelsResource emits a new value.
   * In case of error while fetching the angels, the signal is set to an empty array.
   */
  readonly angels = computed(() => (this.angelsResource.hasValue() ? this.angelsResource.value() : []));
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/angels', ADMIN_SERVICE);
}

@Injectable({ providedIn: 'root' })
export class AngelService extends AngelsService {
  protected readonly http = inject(HttpClient);

  create(angel: NewAngel): Observable<IAngel> {
    return this.http.post<IAngel>(this.resourceUrl, angel);
  }

  update(angel: IAngel): Observable<IAngel> {
    return this.http.put<IAngel>(`${this.resourceUrl}/${encodeURIComponent(this.getAngelIdentifier(angel))}`, angel);
  }

  partialUpdate(angel: PartialUpdateAngel): Observable<IAngel> {
    return this.http.patch<IAngel>(`${this.resourceUrl}/${encodeURIComponent(this.getAngelIdentifier(angel))}`, angel);
  }

  find(id: string): Observable<IAngel> {
    return this.http.get<IAngel>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  query(req?: any): Observable<HttpResponse<IAngel[]>> {
    const options = createRequestOption(req);
    return this.http.get<IAngel[]>(this.resourceUrl, { params: options, observe: 'response' });
  }

  delete(id: string): Observable<undefined> {
    return this.http.delete<undefined>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  getAngelIdentifier(angel: Pick<IAngel, 'id'>): string {
    return angel.id;
  }

  compareAngel(o1: Pick<IAngel, 'id'> | null, o2: Pick<IAngel, 'id'> | null): boolean {
    return o1 && o2 ? this.getAngelIdentifier(o1) === this.getAngelIdentifier(o2) : o1 === o2;
  }

  addAngelToCollectionIfMissing<Type extends Pick<IAngel, 'id'>>(
    angelCollection: Type[],
    ...angelsToCheck: (Type | null | undefined)[]
  ): Type[] {
    const angels: Type[] = angelsToCheck.filter(isPresent);
    if (angels.length > 0) {
      const angelCollectionIdentifiers = angelCollection.map(angelItem => this.getAngelIdentifier(angelItem));
      const angelsToAdd = angels.filter(angelItem => {
        const angelIdentifier = this.getAngelIdentifier(angelItem);
        if (angelCollectionIdentifiers.includes(angelIdentifier)) {
          return false;
        }
        angelCollectionIdentifiers.push(angelIdentifier);
        return true;
      });
      return [...angelsToAdd, ...angelCollection];
    }
    return angelCollection;
  }
}
