import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable, map, of } from 'rxjs';

import { ADMIN_SERVICE } from 'app/config/microservice.constants';
import { TOTAL_COUNT_RESPONSE_HEADER } from 'app/config/pagination.constants';
import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { DirectorySource, IDirectoryLink } from '../directory-link.model';

/**
 * One page of links, with how many there are in total.
 *
 * The two travel together deliberately: a screen that shows a handful of rows and a count taken from
 * those rows reports its own page size as the size of the problem.
 */
export interface DirectoryLinkPage {
  links: IDirectoryLink[];
  total: number;
}

/**
 * Reads what this service has learned about sibling-stack accounts.
 *
 * This is not an entity service — there is no list screen, no form and no create/update/delete,
 * because the server offers none: a link is a fact about hc-patient's or hc-professional's account,
 * and the only write is the reconciliation an administrator triggers from elsewhere.
 *
 * It exists for two screen-level problems, and they are the same cause seen from either side of a
 * missing record. A patient learned from a sibling domain event has no `Profile` and can never be
 * given one from the wire, so the directory row has no name on it ({@link findUnlinked}'s sibling,
 * `findByLocalIds`). A clinician learned from one has no record at all, so the directory has no row
 * to render ({@link DirectoryLinkService.findUnlinked}). In both cases the only identity there is,
 * is here.
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
   *
   * **`resolveNames` is sent here and on no other method — backlog item 50.** It has the api ask
   * hc-patient to name each of these people, which is the one thing this endpoint does that leaves
   * the process, so it is spent only where a name is what the caller is missing. The fan-out is on
   * the api deliberately: hc-patient's lookup takes one address at a time, so doing it in the browser
   * would be one request per nameless row and this method exists to be one per page. The two other
   * readers of this endpoint — {@link findUnlinked}, {@link findPlanChoices} — do not send it, and
   * neither should a third without deciding it: the awaiting-a-record table lists clinicians, whose
   * correlation key is a UUID that endpoint cannot use, and the plan-choice panel's five rows each
   * link to the record where the name resolves anyway.
   */
  findByLocalIds(localIds: readonly string[]): Observable<Map<string, IDirectoryLink>> {
    const wanted = [...new Set(localIds.filter(id => !!id))];
    if (wanted.length === 0) {
      return of(new Map<string, IDirectoryLink>());
    }

    const options = createRequestOption({ 'localId.in': wanted, page: 0, size: wanted.length, resolveNames: true });
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

  /**
   * The accounts from one sibling stack that this service knows about and holds no record for.
   *
   * **This is the other half of the same problem and it is not the same question.** A patient
   * learned from an event is a row with no name, which {@link findByLocalIds} names. A clinician
   * learned from one is *no row at all*: both event types on `hc.professional.registration` are
   * `LINK_ONLY`, because `Professional` requires a role and a licence number and neither is on the
   * wire in any event, in any version. So `GET /api/professionals` cannot return them however it is
   * filtered, and until backlog item 46 the console asked nothing else — a clinician who registered
   * on production reached the service, was stored, and was invisible.
   *
   * The total comes back on `X-Total-Count` beside the page, because the screen shows a few rows and
   * has to be able to say honestly how many there are: counting the rows it received would report the
   * page size as the number of clinicians waiting.
   *
   * `size` is sent explicitly for the reason {@link findByLocalIds} gives — a list endpoint with no
   * size returns 20 — and `sort` is the server's job: newest first is what an administrator watching
   * for a registration wants, and sorting the received page would sort one page against the wrong
   * whole.
   */
  findUnlinked(source: keyof typeof DirectorySource, size: number): Observable<DirectoryLinkPage> {
    const options = createRequestOption({ source, unlinked: true, page: 0, size, sort: ['firstSeenAt,desc'] });
    return this.http.get<IDirectoryLink[]>(this.resourceUrl, { params: options, observe: 'response' }).pipe(
      map(response => ({
        // A missing header is not zero. It would mean the pagination headers stopped surviving the
        // gateway and nginx — `edge.cy.ts` asserts they do — and reporting that as "no clinicians are
        // waiting" is the quiet wrong answer; the rows themselves are the floor.
        total: Number(response.headers.get(TOTAL_COUNT_RESPONSE_HEADER) ?? response.body?.length ?? 0),
        links: response.body ?? [],
      })),
    );
  }

  /**
   * The plan choices hc-patient has reported in a given status — backlog item 48.
   *
   * **Asked of the server, and it has to be.** The plan choice lives on `directory_link` rather than
   * on `Patient` (the api's `DirectoryLinkResource` says why: how hc-admin models a cross-stack
   * patient identity is still open, backlog item 22), so `GET /api/patients` cannot filter or sort by
   * it however it is asked. The alternative — reading every link and filtering here — is the
   * unpaginated shape this service removed from forty endpoints, over a collection that grows at the
   * rate two other stacks create accounts.
   *
   * `size` and `sort` are sent explicitly, for the reasons the two methods above give: a list
   * endpoint with no size returns 20, and sorting a received page sorts one page against the wrong
   * whole. **`lastEventAt,desc` and not `firstSeenAt,desc`** — the panel above the directory is a
   * queue, and what puts a row at the top of it is the choice having been heard recently, not the
   * patient having registered recently. Those are years apart for a patient who has been on the
   * network a while and has just changed tier.
   *
   * The total comes off `X-Total-Count` beside the page for the reason {@link findUnlinked} gives: a
   * count taken from the rows received reports the page size as the size of the queue.
   */
  findPlanChoices(planStatus: string, size: number): Observable<DirectoryLinkPage> {
    const options = createRequestOption({ planStatus, page: 0, size, sort: ['lastEventAt,desc'] });
    return this.http.get<IDirectoryLink[]>(this.resourceUrl, { params: options, observe: 'response' }).pipe(
      map(response => ({
        total: Number(response.headers.get(TOTAL_COUNT_RESPONSE_HEADER) ?? response.body?.length ?? 0),
        links: response.body ?? [],
      })),
    );
  }
}
