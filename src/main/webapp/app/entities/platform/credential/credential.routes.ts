import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

import CredentialResolve from './route/credential-routing-resolve.service';

const credentialRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/credential').then(m => m.Credential),
    data: {},
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/credential-detail').then(m => m.CredentialDetail),
    resolve: {
      credential: CredentialResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/credential-update').then(m => m.CredentialUpdate),
    resolve: {
      credential: CredentialResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/credential-update').then(m => m.CredentialUpdate),
    resolve: {
      credential: CredentialResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default credentialRoute;
