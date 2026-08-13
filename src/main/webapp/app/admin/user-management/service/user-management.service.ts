import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import dayjs from 'dayjs/esm';
import { Observable, map } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';

import { IUser, NewUser } from '../user-management.model';

/** The wire shape: audit stamps arrive as ISO strings, as they do everywhere. */
type RestUser = Omit<IUser, 'createdDate' | 'lastModifiedDate'> & {
  createdDate?: string | null;
  lastModifiedDate?: string | null;
};

const fromServer = (user: RestUser): IUser => ({
  ...user,
  createdDate: user.createdDate ? dayjs(user.createdDate) : null,
  lastModifiedDate: user.lastModifiedDate ? dayjs(user.lastModifiedDate) : null,
});

/**
 * User management against the GATEWAY.
 *
 * Every other service in this console resolves through
 * `getEndpointFor(api, microservice)` and lands on hc-admin-service. These do
 * not: `api/admin/users` is served by hc-admin-gateway itself, which owns the
 * Account and Authority collections. Calling it without a microservice
 * segment is what keeps that ownership visible in the code rather than only
 * in the documentation.
 */
@Injectable({ providedIn: 'root' })
export class UserManagementService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);

  private readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/admin/users');
  private readonly authoritiesUrl = this.applicationConfigService.getEndpointFor('api/authorities');

  create(user: NewUser): Observable<IUser> {
    return this.http.post<RestUser>(this.resourceUrl, user).pipe(map(fromServer));
  }

  update(user: IUser): Observable<IUser> {
    return this.http.put<RestUser>(this.resourceUrl, user).pipe(map(fromServer));
  }

  /** The gateway keys users by login, not by id — the URL says so. */
  find(login: string): Observable<IUser> {
    return this.http.get<RestUser>(`${this.resourceUrl}/${encodeURIComponent(login)}`).pipe(map(fromServer));
  }

  query(req?: Record<string, unknown>): Observable<HttpResponse<IUser[]>> {
    const options = createRequestOption(req);
    return this.http
      .get<RestUser[]>(this.resourceUrl, { params: options, observe: 'response' })
      .pipe(map(response => response.clone({ body: (response.body ?? []).map(fromServer) })));
  }

  delete(login: string): Observable<object> {
    return this.http.delete(`${this.resourceUrl}/${encodeURIComponent(login)}`);
  }

  /**
   * The authorities the gateway will actually accept.
   *
   * Fetched rather than hardcoded: the console must not offer a role the
   * gateway would reject, and the list is the gateway's to decide.
   *
   * `GET /api/authorities` is the Authority entity's CRUD surface, so it returns
   * documents — `[{"name":"ROLE_ADMIN"}, …]` — not the bare strings this was
   * typed for. The declared `string[]` made the mismatch invisible to the
   * compiler, and the select rendered `[object Object]` for every option.
   *
   * Mapped here rather than in the template so the shape is converted once, at
   * the boundary. Everything downstream — the form control, the payload sent
   * back to `/api/admin/users`, `AdminUserDTO.authorities` — works in names, and
   * this is the only place that has to know the entity has a wrapper.
   */
  authorities(): Observable<string[]> {
    return this.http
      .get<{ name?: string }[]>(this.authoritiesUrl)
      .pipe(map(authorities => authorities.map(authority => authority.name).filter((name): name is string => !!name)));
  }
}
