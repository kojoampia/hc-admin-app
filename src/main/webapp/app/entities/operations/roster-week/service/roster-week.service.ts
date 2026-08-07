import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import dayjs from 'dayjs/esm';
import { Observable, map } from 'rxjs';

import { DATE_FORMAT } from 'app/config/input.constants';
import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { isPresent } from 'app/core/util/operators';
import { IRosterWeek, NewRosterWeek } from '../roster-week.model';

export type PartialUpdateRosterWeek = Partial<IRosterWeek> & Pick<IRosterWeek, 'id'>;

type RestOf<T extends IRosterWeek | NewRosterWeek> = Omit<T, 'startDate' | 'publishedAt'> & {
  startDate?: string | null;
  publishedAt?: string | null;
};

export type RestRosterWeek = RestOf<IRosterWeek>;

export type NewRestRosterWeek = RestOf<NewRosterWeek>;

export type PartialUpdateRestRosterWeek = RestOf<PartialUpdateRosterWeek>;

@Injectable()
export class RosterWeeksService {
  readonly rosterWeeksParams = signal<Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined>(
    undefined,
  );
  readonly rosterWeeksResource = httpResource<RestRosterWeek[]>(() => {
    const params = this.rosterWeeksParams();
    if (!params) {
      return undefined;
    }
    return { url: this.resourceUrl, params };
  });
  /**
   * This signal holds the list of rosterWeek that have been fetched. It is updated when the rosterWeeksResource emits a new value.
   * In case of error while fetching the rosterWeeks, the signal is set to an empty array.
   */
  readonly rosterWeeks = computed(() =>
    (this.rosterWeeksResource.hasValue() ? this.rosterWeeksResource.value() : []).map(item => this.convertValueFromServer(item)),
  );
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/roster-weeks');

  protected convertValueFromServer(restRosterWeek: RestRosterWeek): IRosterWeek {
    return {
      ...restRosterWeek,
      startDate: restRosterWeek.startDate ? dayjs(restRosterWeek.startDate) : undefined,
      publishedAt: restRosterWeek.publishedAt ? dayjs(restRosterWeek.publishedAt) : undefined,
    };
  }
}

@Injectable({ providedIn: 'root' })
export class RosterWeekService extends RosterWeeksService {
  protected readonly http = inject(HttpClient);

  create(rosterWeek: NewRosterWeek): Observable<IRosterWeek> {
    const copy = this.convertValueFromClient(rosterWeek);
    return this.http.post<RestRosterWeek>(this.resourceUrl, copy).pipe(map(res => this.convertResponseFromServer(res)));
  }

  update(rosterWeek: IRosterWeek): Observable<IRosterWeek> {
    const copy = this.convertValueFromClient(rosterWeek);
    return this.http
      .put<RestRosterWeek>(`${this.resourceUrl}/${encodeURIComponent(this.getRosterWeekIdentifier(rosterWeek))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  partialUpdate(rosterWeek: PartialUpdateRosterWeek): Observable<IRosterWeek> {
    const copy = this.convertValueFromClient(rosterWeek);
    return this.http
      .patch<RestRosterWeek>(`${this.resourceUrl}/${encodeURIComponent(this.getRosterWeekIdentifier(rosterWeek))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  find(id: string): Observable<IRosterWeek> {
    return this.http
      .get<RestRosterWeek>(`${this.resourceUrl}/${encodeURIComponent(id)}`)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  query(req?: any): Observable<HttpResponse<IRosterWeek[]>> {
    const options = createRequestOption(req);
    return this.http
      .get<RestRosterWeek[]>(this.resourceUrl, { params: options, observe: 'response' })
      .pipe(map(res => res.clone({ body: this.convertResponseArrayFromServer(res.body!) })));
  }

  delete(id: string): Observable<undefined> {
    return this.http.delete<undefined>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  getRosterWeekIdentifier(rosterWeek: Pick<IRosterWeek, 'id'>): string {
    return rosterWeek.id;
  }

  compareRosterWeek(o1: Pick<IRosterWeek, 'id'> | null, o2: Pick<IRosterWeek, 'id'> | null): boolean {
    return o1 && o2 ? this.getRosterWeekIdentifier(o1) === this.getRosterWeekIdentifier(o2) : o1 === o2;
  }

  addRosterWeekToCollectionIfMissing<Type extends Pick<IRosterWeek, 'id'>>(
    rosterWeekCollection: Type[],
    ...rosterWeeksToCheck: (Type | null | undefined)[]
  ): Type[] {
    const rosterWeeks: Type[] = rosterWeeksToCheck.filter(isPresent);
    if (rosterWeeks.length > 0) {
      const rosterWeekCollectionIdentifiers = rosterWeekCollection.map(rosterWeekItem => this.getRosterWeekIdentifier(rosterWeekItem));
      const rosterWeeksToAdd = rosterWeeks.filter(rosterWeekItem => {
        const rosterWeekIdentifier = this.getRosterWeekIdentifier(rosterWeekItem);
        if (rosterWeekCollectionIdentifiers.includes(rosterWeekIdentifier)) {
          return false;
        }
        rosterWeekCollectionIdentifiers.push(rosterWeekIdentifier);
        return true;
      });
      return [...rosterWeeksToAdd, ...rosterWeekCollection];
    }
    return rosterWeekCollection;
  }

  protected convertValueFromClient<T extends IRosterWeek | NewRosterWeek | PartialUpdateRosterWeek>(rosterWeek: T): RestOf<T> {
    return {
      ...rosterWeek,
      startDate: rosterWeek.startDate?.format(DATE_FORMAT) ?? null,
      publishedAt: rosterWeek.publishedAt?.toJSON() ?? null,
    };
  }

  protected convertResponseFromServer(res: RestRosterWeek): IRosterWeek {
    return this.convertValueFromServer(res);
  }

  protected convertResponseArrayFromServer(res: RestRosterWeek[]): IRosterWeek[] {
    return res.map(item => this.convertValueFromServer(item));
  }
}
