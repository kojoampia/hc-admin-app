import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable, map, of } from 'rxjs';

import { ADMIN_SERVICE } from 'app/config/microservice.constants';
import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { IDirectoryLink } from '../directory-link.model';

/**
 * Reads what this service has learned about sibling-stack accounts.
 *
 * This is not an entity service — there is no list screen, no form and no create/update/delete,
 * because the server offers none: a link is a fact about hc-patient's or hc-professional's account,
 * and the only write is the reconciliation an administrator triggers from elsewhere.
 *
 * It exists for one screen-level problem. A patient learned from a sibling domain event has no
 * `Profile` and can never be given one from the wire, so the directory row has no name on it. The
 * identity that does exist is here.
 */
@Injectable({ providedIn: 'root' })
export class DirectoryLinkService {
  protected readonly http = inject(HttpClient);
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/directory-links', ADMIN_SERVICE);

  /**
   * The links naming these local records, keyed by `localId`.
   *
   * **One request for the whole page, never one per row.** The alternative — a lookup per nameless
   * row — is the N+1 the clinical-lead column already pays on this screen, and it is affordable
   * there only because leads repeat and are deduplicated. A subject key does not repeat: every
   * learned patient is a distinct link, so per-row lookups would be twenty requests on a directory
   * of twenty learned patients.
   *
   * `size` is sent explicitly rather than left to the server default. Every list endpoint here is
   * paginated and a `query()` with no size returns 20 — so asking about more than 20 records would
   * silently resolve the first 20 and leave the rest looking unlinked, which is the same class of
   * bug as `RELATIONSHIP_OPTIONS_PAGE_SIZE` and just as quiet.
   *
   * An empty request is answered without a round trip. It also must not be sent: `createRequestOption`
   * drops empty values, so `localId.in: []` would produce a URL with no filter on it at all, and the
   * server would answer with the first page of the whole collection.
   */
  findByLocalIds(localIds: readonly string[]): Observable<Map<string, IDirectoryLink>> {
    const wanted = [...new Set(localIds.filter(id => !!id))];
    if (wanted.length === 0) {
      return of(new Map<string, IDirectoryLink>());
    }

    const options = createRequestOption({ 'localId.in': wanted, page: 0, size: wanted.length });
    return this.http.get<IDirectoryLink[]>(this.resourceUrl, { params: options }).pipe(
      map(links => {
        const byLocalId = new Map<string, IDirectoryLink>();
        for (const link of links) {
          if (link.localId) {
            byLocalId.set(link.localId, link);
          }
        }
        return byLocalId;
      }),
    );
  }
}
