import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable, map } from 'rxjs';

import { Account } from 'app/core/auth/account.model';
import { credentialFromAccount } from 'app/core/auth/credential-from-account';
import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { ICredential } from '../credential.model';

/**
 * The signed-in account, read from hc-admin-gateway.
 *
 * Deliberately not a CRUD service, and deliberately not routed through `services/hcadminservice/`
 * like every other entity service in this folder. There is no Credential entity behind the admin
 * service: the console model excluded `Credential` and `CredentialRole` because the gateway owns
 * user records and the two services do not share a database.
 *
 * `GET /api/account` is the gateway's own endpoint, called straight after authentication, and it
 * returns exactly one account — the caller's. That is the whole surface, which is why there is no
 * `query`, `create`, `update` or `delete` here: the console had all four while an in-browser mock
 * was answering them, and every one of them wrote to something that does not exist.
 *
 * Managing *other* people's accounts is a different endpoint (`/api/admin/users`) and a different
 * screen (`admin/user-management/`), which this application already has.
 */
@Injectable({ providedIn: 'root' })
export class CredentialService {
  protected readonly http = inject(HttpClient);
  protected readonly applicationConfigService = inject(ApplicationConfigService);

  /** Gateway-relative on purpose — see the class comment. */
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/account');

  /** The signed-in account, projected into the console's Credential shape. */
  find(): Observable<ICredential> {
    return this.http.get<Account>(this.resourceUrl).pipe(map(credentialFromAccount));
  }
}
