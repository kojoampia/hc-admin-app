import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';

/** The lifecycle, as `hc-patient-service` spells it. */
export type DeletionRequestStatus = 'PENDING' | 'CANCELLED' | 'COMPLETED' | 'REJECTED';

/**
 * A patient's request to be erased, as the patient service reports it.
 *
 * <p>Unlike the patient-facing clients, the console sees the administrative fields — who completed
 * it, and what the erasure removed.</p>
 */
export interface DeletionRequest {
  readonly id: string;
  readonly patientId: string;
  readonly requestedByEmail?: string | null;
  readonly requestedByLogin?: string | null;
  readonly status: DeletionRequestStatus;
  readonly reason?: string | null;
  readonly requestedAt: string;
  readonly dueAt: string;
  readonly cancelledAt?: string | null;
  readonly completedAt?: string | null;
  readonly completedByLogin?: string | null;
  readonly rejectedAt?: string | null;
  readonly rejectedByLogin?: string | null;
  readonly decisionReason?: string | null;
  /** What the erasure removed, by collection. Counts only — never clinical content. */
  readonly erasedCounts?: Readonly<Record<string, number>> | null;
}

/**
 * The queue of patients asking to be forgotten, and the two ways to close a request.
 *
 * <h2>This calls ANOTHER STACK</h2>
 *
 * <p>`hcpatientservice`, not `hcadminservice`. The deletion request lives with the clinical data it
 * commissions the erasure of, which is hc-patient's, and this console is the only place the
 * erasure can be authorised from. Two things have to be true for these calls to work, and neither
 * is visible from this file:</p>
 *
 * <ul>
 *   <li>The admin gateway must carry a `/services/hcpatientservice/**` route to `hc-patient-service`
 *   — see `deploy/prod-server/compose.yml`. Without it every call here 404s at this stack's own
 *   gateway, which reads as "the screen is broken" rather than as "the route is missing".</li>
 *   <li>The three stacks must share one JWT signing key, which they do. hc-professional's
 *   equivalent route spent time returning 401 for exactly this reason, with the routing half
 *   already correct.</li>
 * </ul>
 *
 * <h2>Completing is the delete action</h2>
 *
 * <p>{@link complete} erases a patient's record across sixteen collections and the report-file
 * bucket. It is irreversible, there is no undo, and `ROLE_ADMIN` is the only authority the patient
 * service accepts for it.</p>
 */
@Injectable({ providedIn: 'root' })
export class DeletionRequestService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  private readonly url = this.applicationConfigService.getEndpointFor('api/deletion-requests', 'hcpatientservice');

  /** The queue. Defaults to what is still owed; pass a status to review what has been closed. */
  query(status: DeletionRequestStatus = 'PENDING'): Observable<HttpResponse<DeletionRequest[]>> {
    return this.http.get<DeletionRequest[]>(this.url, {
      params: { status, size: '100', sort: 'dueAt,asc' },
      observe: 'response',
    });
  }

  /**
   * Erases the record. There is no undo.
   *
   * <p>It does <em>not</em> close the patient's gateway account — the patient service holds no
   * `User` document. That is a second step, against hc-patient's own gateway.</p>
   */
  complete(id: string): Observable<DeletionRequest> {
    return this.http.post<DeletionRequest>(`${this.url}/${id}/complete`, {});
  }

  /** Refuses a request. The reason is required by the server and is owed to the patient. */
  reject(id: string, decisionReason: string): Observable<DeletionRequest> {
    return this.http.post<DeletionRequest>(`${this.url}/${id}/reject`, { decisionReason });
  }
}
