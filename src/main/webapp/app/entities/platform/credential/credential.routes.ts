import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

/**
 * One route, and no `:id`.
 *
 * `GET /api/account` returns the caller's account and nothing else, so there is no collection to
 * list and no other record to address. The list, create, edit and delete routes this file used to
 * carry all resolved against `api/credentials`, which only the in-browser mock ever answered.
 *
 * Other people's accounts are managed at `admin/user-management/`, against the gateway's
 * `/api/admin/users`.
 */
const credentialRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./detail/credential-detail').then(m => m.CredentialDetail),
    canActivate: [UserRouteAccessService],
  },
];

export default credentialRoute;
