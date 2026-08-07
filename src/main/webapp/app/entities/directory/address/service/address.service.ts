import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import { Observable } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { isPresent } from 'app/core/util/operators';
import { IAddress, NewAddress } from '../address.model';

export type PartialUpdateAddress = Partial<IAddress> & Pick<IAddress, 'id'>;

@Injectable()
export class AddressesService {
  readonly addressesParams = signal<Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined>(
    undefined,
  );
  readonly addressesResource = httpResource<IAddress[]>(() => {
    const params = this.addressesParams();
    if (!params) {
      return undefined;
    }
    return { url: this.resourceUrl, params };
  });
  /**
   * This signal holds the list of address that have been fetched. It is updated when the addressesResource emits a new value.
   * In case of error while fetching the addresses, the signal is set to an empty array.
   */
  readonly addresses = computed(() => (this.addressesResource.hasValue() ? this.addressesResource.value() : []));
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/addresses');
}

@Injectable({ providedIn: 'root' })
export class AddressService extends AddressesService {
  protected readonly http = inject(HttpClient);

  create(address: NewAddress): Observable<IAddress> {
    return this.http.post<IAddress>(this.resourceUrl, address);
  }

  update(address: IAddress): Observable<IAddress> {
    return this.http.put<IAddress>(`${this.resourceUrl}/${encodeURIComponent(this.getAddressIdentifier(address))}`, address);
  }

  partialUpdate(address: PartialUpdateAddress): Observable<IAddress> {
    return this.http.patch<IAddress>(`${this.resourceUrl}/${encodeURIComponent(this.getAddressIdentifier(address))}`, address);
  }

  find(id: string): Observable<IAddress> {
    return this.http.get<IAddress>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  query(req?: any): Observable<HttpResponse<IAddress[]>> {
    const options = createRequestOption(req);
    return this.http.get<IAddress[]>(this.resourceUrl, { params: options, observe: 'response' });
  }

  delete(id: string): Observable<undefined> {
    return this.http.delete<undefined>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  getAddressIdentifier(address: Pick<IAddress, 'id'>): string {
    return address.id;
  }

  compareAddress(o1: Pick<IAddress, 'id'> | null, o2: Pick<IAddress, 'id'> | null): boolean {
    return o1 && o2 ? this.getAddressIdentifier(o1) === this.getAddressIdentifier(o2) : o1 === o2;
  }

  addAddressToCollectionIfMissing<Type extends Pick<IAddress, 'id'>>(
    addressCollection: Type[],
    ...addressesToCheck: (Type | null | undefined)[]
  ): Type[] {
    const addresses: Type[] = addressesToCheck.filter(isPresent);
    if (addresses.length > 0) {
      const addressCollectionIdentifiers = addressCollection.map(addressItem => this.getAddressIdentifier(addressItem));
      const addressesToAdd = addresses.filter(addressItem => {
        const addressIdentifier = this.getAddressIdentifier(addressItem);
        if (addressCollectionIdentifiers.includes(addressIdentifier)) {
          return false;
        }
        addressCollectionIdentifiers.push(addressIdentifier);
        return true;
      });
      return [...addressesToAdd, ...addressCollection];
    }
    return addressCollection;
  }
}
