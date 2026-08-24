import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import dayjs from 'dayjs/esm';
import { Observable, map } from 'rxjs';

import { ADMIN_SERVICE } from 'app/config/microservice.constants';
import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { IProfessionalVerification, RecordVerification } from '../professional-verification.model';

/** The wire shape: instants and dates arrive as strings. */
type RestProfessionalVerification = Omit<IProfessionalVerification, 'recordedAt' | 'expiresOn'> & {
  recordedAt?: string | null;
  expiresOn?: string | null;
};

/**
 * The professional verification history.
 *
 * **There is no update and no delete, and that is the contract, not an omission.** The server
 * exposes no `PUT`, `PATCH` or `DELETE` on `/api/professional-verifications` — correcting a
 * verification means recording the correcting decision. A method here that looked like an edit would
 * be a 405 waiting to be discovered on a screen.
 *
 * Reads go to `/api/professionals/{id}/verifications`, which is a professional's own history newest
 * first and is deliberately unpaginated: a history is bounded by how many times one person has been
 * verified, and paging it would hide the oldest decision, which is usually the one being looked for.
 */
@Injectable({ providedIn: 'root' })
export class ProfessionalVerificationService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  private readonly professionalsUrl = this.applicationConfigService.getEndpointFor('api/professionals', ADMIN_SERVICE);
  private readonly verificationsUrl = this.applicationConfigService.getEndpointFor('api/professional-verifications', ADMIN_SERVICE);

  /** One professional's decisions, newest first. Empty for somebody nobody has verified yet. */
  history(professionalId: string): Observable<IProfessionalVerification[]> {
    return this.http
      .get<RestProfessionalVerification[]>(`${this.professionalsUrl}/${encodeURIComponent(professionalId)}/verifications`)
      .pipe(map(rows => rows.map(row => this.convert(row))));
  }

  /**
   * Records a decision. Admin only on the server.
   *
   * The request carries no `recordedAt` and no `recordedBy` — see {@link RecordVerification}. The
   * response is the stored row, which does carry them, so the caller can render the new entry
   * without re-reading the history.
   */
  record(request: RecordVerification): Observable<IProfessionalVerification> {
    return this.http.post<RestProfessionalVerification>(this.verificationsUrl, request).pipe(map(row => this.convert(row)));
  }

  private convert(row: RestProfessionalVerification): IProfessionalVerification {
    return {
      ...row,
      recordedAt: row.recordedAt ? dayjs(row.recordedAt) : null,
      expiresOn: row.expiresOn ? dayjs(row.expiresOn) : null,
    };
  }
}
