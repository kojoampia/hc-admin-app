import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import dayjs from 'dayjs/esm';
import { Observable, map } from 'rxjs';

import { DATE_FORMAT } from 'app/config/input.constants';
import { ADMIN_SERVICE } from 'app/config/microservice.constants';
import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { isPresent } from 'app/core/util/operators';
import { IShiftAssignment, NewShiftAssignment } from '../shift-assignment.model';

export type PartialUpdateShiftAssignment = Partial<IShiftAssignment> & Pick<IShiftAssignment, 'id'>;

type RestOf<T extends IShiftAssignment | NewShiftAssignment> = Omit<T, 'shiftDate'> & {
  shiftDate?: string | null;
};

export type RestShiftAssignment = RestOf<IShiftAssignment>;

export type NewRestShiftAssignment = RestOf<NewShiftAssignment>;

export type PartialUpdateRestShiftAssignment = RestOf<PartialUpdateShiftAssignment>;

@Injectable()
export class ShiftAssignmentsService {
  readonly shiftAssignmentsParams = signal<Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined>(
    undefined,
  );
  readonly shiftAssignmentsResource = httpResource<RestShiftAssignment[]>(() => {
    const params = this.shiftAssignmentsParams();
    if (!params) {
      return undefined;
    }
    return { url: this.resourceUrl, params };
  });
  /**
   * This signal holds the list of shiftAssignment that have been fetched. It is updated when the shiftAssignmentsResource emits a new value.
   * In case of error while fetching the shiftAssignments, the signal is set to an empty array.
   */
  readonly shiftAssignments = computed(() =>
    (this.shiftAssignmentsResource.hasValue() ? this.shiftAssignmentsResource.value() : []).map(item => this.convertValueFromServer(item)),
  );
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/shift-assignments', ADMIN_SERVICE);

  protected convertValueFromServer(restShiftAssignment: RestShiftAssignment): IShiftAssignment {
    return {
      ...restShiftAssignment,
      shiftDate: restShiftAssignment.shiftDate ? dayjs(restShiftAssignment.shiftDate) : undefined,
    };
  }
}

@Injectable({ providedIn: 'root' })
export class ShiftAssignmentService extends ShiftAssignmentsService {
  protected readonly http = inject(HttpClient);

  create(shiftAssignment: NewShiftAssignment): Observable<IShiftAssignment> {
    const copy = this.convertValueFromClient(shiftAssignment);
    return this.http.post<RestShiftAssignment>(this.resourceUrl, copy).pipe(map(res => this.convertResponseFromServer(res)));
  }

  update(shiftAssignment: IShiftAssignment): Observable<IShiftAssignment> {
    const copy = this.convertValueFromClient(shiftAssignment);
    return this.http
      .put<RestShiftAssignment>(`${this.resourceUrl}/${encodeURIComponent(this.getShiftAssignmentIdentifier(shiftAssignment))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  partialUpdate(shiftAssignment: PartialUpdateShiftAssignment): Observable<IShiftAssignment> {
    const copy = this.convertValueFromClient(shiftAssignment);
    return this.http
      .patch<RestShiftAssignment>(`${this.resourceUrl}/${encodeURIComponent(this.getShiftAssignmentIdentifier(shiftAssignment))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  find(id: string): Observable<IShiftAssignment> {
    return this.http
      .get<RestShiftAssignment>(`${this.resourceUrl}/${encodeURIComponent(id)}`)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  query(req?: any): Observable<HttpResponse<IShiftAssignment[]>> {
    const options = createRequestOption(req);
    return this.http
      .get<RestShiftAssignment[]>(this.resourceUrl, { params: options, observe: 'response' })
      .pipe(map(res => res.clone({ body: this.convertResponseArrayFromServer(res.body!) })));
  }

  delete(id: string): Observable<undefined> {
    return this.http.delete<undefined>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  getShiftAssignmentIdentifier(shiftAssignment: Pick<IShiftAssignment, 'id'>): string {
    return shiftAssignment.id;
  }

  compareShiftAssignment(o1: Pick<IShiftAssignment, 'id'> | null, o2: Pick<IShiftAssignment, 'id'> | null): boolean {
    return o1 && o2 ? this.getShiftAssignmentIdentifier(o1) === this.getShiftAssignmentIdentifier(o2) : o1 === o2;
  }

  addShiftAssignmentToCollectionIfMissing<Type extends Pick<IShiftAssignment, 'id'>>(
    shiftAssignmentCollection: Type[],
    ...shiftAssignmentsToCheck: (Type | null | undefined)[]
  ): Type[] {
    const shiftAssignments: Type[] = shiftAssignmentsToCheck.filter(isPresent);
    if (shiftAssignments.length > 0) {
      const shiftAssignmentCollectionIdentifiers = shiftAssignmentCollection.map(shiftAssignmentItem =>
        this.getShiftAssignmentIdentifier(shiftAssignmentItem),
      );
      const shiftAssignmentsToAdd = shiftAssignments.filter(shiftAssignmentItem => {
        const shiftAssignmentIdentifier = this.getShiftAssignmentIdentifier(shiftAssignmentItem);
        if (shiftAssignmentCollectionIdentifiers.includes(shiftAssignmentIdentifier)) {
          return false;
        }
        shiftAssignmentCollectionIdentifiers.push(shiftAssignmentIdentifier);
        return true;
      });
      return [...shiftAssignmentsToAdd, ...shiftAssignmentCollection];
    }
    return shiftAssignmentCollection;
  }

  protected convertValueFromClient<T extends IShiftAssignment | NewShiftAssignment | PartialUpdateShiftAssignment>(
    shiftAssignment: T,
  ): RestOf<T> {
    return {
      ...shiftAssignment,
      shiftDate: shiftAssignment.shiftDate?.format(DATE_FORMAT) ?? null,
    };
  }

  protected convertResponseFromServer(res: RestShiftAssignment): IShiftAssignment {
    return this.convertValueFromServer(res);
  }

  protected convertResponseArrayFromServer(res: RestShiftAssignment[]): IShiftAssignment[] {
    return res.map(item => this.convertValueFromServer(item));
  }
}
