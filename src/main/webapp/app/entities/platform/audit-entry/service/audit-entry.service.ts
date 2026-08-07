import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import dayjs from 'dayjs/esm';
import { Observable, map } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { isPresent } from 'app/core/util/operators';
import { IAuditEntry } from '../audit-entry.model';

type RestOf<T extends IAuditEntry> = Omit<T, 'occurredAt'> & {
  occurredAt?: string | null;
};

export type RestAuditEntry = RestOf<IAuditEntry>;

@Injectable()
export class AuditEntriesService {
  readonly auditEntriesParams = signal<Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined>(
    undefined,
  );
  readonly auditEntriesResource = httpResource<RestAuditEntry[]>(() => {
    const params = this.auditEntriesParams();
    if (!params) {
      return undefined;
    }
    return { url: this.resourceUrl, params };
  });
  /**
   * This signal holds the list of auditEntry that have been fetched. It is updated when the auditEntriesResource emits a new value.
   * In case of error while fetching the auditEntries, the signal is set to an empty array.
   */
  readonly auditEntries = computed(() =>
    (this.auditEntriesResource.hasValue() ? this.auditEntriesResource.value() : []).map(item => this.convertValueFromServer(item)),
  );
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/audit-entries');

  protected convertValueFromServer(restAuditEntry: RestAuditEntry): IAuditEntry {
    return {
      ...restAuditEntry,
      occurredAt: restAuditEntry.occurredAt ? dayjs(restAuditEntry.occurredAt) : undefined,
    };
  }
}

@Injectable({ providedIn: 'root' })
export class AuditEntryService extends AuditEntriesService {
  protected readonly http = inject(HttpClient);

  find(id: string): Observable<IAuditEntry> {
    return this.http
      .get<RestAuditEntry>(`${this.resourceUrl}/${encodeURIComponent(id)}`)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  query(req?: any): Observable<HttpResponse<IAuditEntry[]>> {
    const options = createRequestOption(req);
    return this.http
      .get<RestAuditEntry[]>(this.resourceUrl, { params: options, observe: 'response' })
      .pipe(map(res => res.clone({ body: this.convertResponseArrayFromServer(res.body!) })));
  }

  getAuditEntryIdentifier(auditEntry: Pick<IAuditEntry, 'id'>): string {
    return auditEntry.id;
  }

  compareAuditEntry(o1: Pick<IAuditEntry, 'id'> | null, o2: Pick<IAuditEntry, 'id'> | null): boolean {
    return o1 && o2 ? this.getAuditEntryIdentifier(o1) === this.getAuditEntryIdentifier(o2) : o1 === o2;
  }

  addAuditEntryToCollectionIfMissing<Type extends Pick<IAuditEntry, 'id'>>(
    auditEntryCollection: Type[],
    ...auditEntriesToCheck: (Type | null | undefined)[]
  ): Type[] {
    const auditEntries: Type[] = auditEntriesToCheck.filter(isPresent);
    if (auditEntries.length > 0) {
      const auditEntryCollectionIdentifiers = auditEntryCollection.map(auditEntryItem => this.getAuditEntryIdentifier(auditEntryItem));
      const auditEntriesToAdd = auditEntries.filter(auditEntryItem => {
        const auditEntryIdentifier = this.getAuditEntryIdentifier(auditEntryItem);
        if (auditEntryCollectionIdentifiers.includes(auditEntryIdentifier)) {
          return false;
        }
        auditEntryCollectionIdentifiers.push(auditEntryIdentifier);
        return true;
      });
      return [...auditEntriesToAdd, ...auditEntryCollection];
    }
    return auditEntryCollection;
  }

  protected convertValueFromClient<T extends IAuditEntry>(auditEntry: T): RestOf<T> {
    return {
      ...auditEntry,
      occurredAt: auditEntry.occurredAt?.toJSON() ?? null,
    };
  }

  protected convertResponseFromServer(res: RestAuditEntry): IAuditEntry {
    return this.convertValueFromServer(res);
  }

  protected convertResponseArrayFromServer(res: RestAuditEntry[]): IAuditEntry[] {
    return res.map(item => this.convertValueFromServer(item));
  }
}
