import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import dayjs from 'dayjs/esm';
import { Observable, map } from 'rxjs';

import { DATE_FORMAT } from 'app/config/input.constants';
import { ADMIN_SERVICE } from 'app/config/microservice.constants';
import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { isPresent } from 'app/core/util/operators';
import { IVendor, IVendorSummary, NewVendor } from '../vendor.model';

export type PartialUpdateVendor = Partial<IVendor> & Pick<IVendor, 'id'>;

type RestOf<T extends IVendor | NewVendor> = Omit<T, 'contractRenewsOn'> & {
  contractRenewsOn?: string | null;
};

export type RestVendor = RestOf<IVendor>;

export type NewRestVendor = RestOf<NewVendor>;

export type PartialUpdateRestVendor = RestOf<PartialUpdateVendor>;

@Injectable()
export class VendorsService {
  readonly vendorsParams = signal<Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined>(
    undefined,
  );
  readonly vendorsResource = httpResource<RestVendor[]>(() => {
    const params = this.vendorsParams();
    if (!params) {
      return undefined;
    }
    return { url: this.resourceUrl, params };
  });
  /**
   * This signal holds the list of vendor that have been fetched. It is updated when the vendorsResource emits a new value.
   * In case of error while fetching the vendors, the signal is set to an empty array.
   */
  readonly vendors = computed(() =>
    (this.vendorsResource.hasValue() ? this.vendorsResource.value() : []).map(item => this.convertValueFromServer(item)),
  );
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/vendors', ADMIN_SERVICE);

  protected convertValueFromServer(restVendor: RestVendor): IVendor {
    return {
      ...restVendor,
      contractRenewsOn: restVendor.contractRenewsOn ? dayjs(restVendor.contractRenewsOn) : undefined,
    };
  }
}

@Injectable({ providedIn: 'root' })
export class VendorService extends VendorsService {
  protected readonly http = inject(HttpClient);

  create(vendor: NewVendor): Observable<IVendor> {
    const copy = this.convertValueFromClient(vendor);
    return this.http.post<RestVendor>(this.resourceUrl, copy).pipe(map(res => this.convertResponseFromServer(res)));
  }

  update(vendor: IVendor): Observable<IVendor> {
    const copy = this.convertValueFromClient(vendor);
    return this.http
      .put<RestVendor>(`${this.resourceUrl}/${encodeURIComponent(this.getVendorIdentifier(vendor))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  partialUpdate(vendor: PartialUpdateVendor): Observable<IVendor> {
    const copy = this.convertValueFromClient(vendor);
    return this.http
      .patch<RestVendor>(`${this.resourceUrl}/${encodeURIComponent(this.getVendorIdentifier(vendor))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  find(id: string): Observable<IVendor> {
    return this.http.get<RestVendor>(`${this.resourceUrl}/${encodeURIComponent(id)}`).pipe(map(res => this.convertResponseFromServer(res)));
  }

  /**
   * The directory's four tiles, over the whole collection rather than the current page.
   *
   * No date conversion, so it does not go through `convertResponseFromServer` — every field is a
   * number.
   */
  summary(): Observable<IVendorSummary> {
    return this.http.get<IVendorSummary>(`${this.resourceUrl}/summary`);
  }

  query(req?: any): Observable<HttpResponse<IVendor[]>> {
    const options = createRequestOption(req);
    return this.http
      .get<RestVendor[]>(this.resourceUrl, { params: options, observe: 'response' })
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
  setArchived(vendor: Pick<IVendor, 'id'>, isArchived: boolean): Observable<IVendor> {
    return this.partialUpdate({ id: vendor.id, isArchived });
  }

  getVendorIdentifier(vendor: Pick<IVendor, 'id'>): string {
    return vendor.id;
  }

  compareVendor(o1: Pick<IVendor, 'id'> | null, o2: Pick<IVendor, 'id'> | null): boolean {
    return o1 && o2 ? this.getVendorIdentifier(o1) === this.getVendorIdentifier(o2) : o1 === o2;
  }

  addVendorToCollectionIfMissing<Type extends Pick<IVendor, 'id'>>(
    vendorCollection: Type[],
    ...vendorsToCheck: (Type | null | undefined)[]
  ): Type[] {
    const vendors: Type[] = vendorsToCheck.filter(isPresent);
    if (vendors.length > 0) {
      const vendorCollectionIdentifiers = vendorCollection.map(vendorItem => this.getVendorIdentifier(vendorItem));
      const vendorsToAdd = vendors.filter(vendorItem => {
        const vendorIdentifier = this.getVendorIdentifier(vendorItem);
        if (vendorCollectionIdentifiers.includes(vendorIdentifier)) {
          return false;
        }
        vendorCollectionIdentifiers.push(vendorIdentifier);
        return true;
      });
      return [...vendorsToAdd, ...vendorCollection];
    }
    return vendorCollection;
  }

  protected convertValueFromClient<T extends IVendor | NewVendor | PartialUpdateVendor>(vendor: T): RestOf<T> {
    return {
      ...vendor,
      contractRenewsOn: vendor.contractRenewsOn?.format(DATE_FORMAT) ?? null,
    };
  }

  protected convertResponseFromServer(res: RestVendor): IVendor {
    return this.convertValueFromServer(res);
  }

  protected convertResponseArrayFromServer(res: RestVendor[]): IVendor[] {
    return res.map(item => this.convertValueFromServer(item));
  }
}
