import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

import AngelResolve from './route/angel-routing-resolve.service';

const angelRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/angel').then(m => m.Angel),
    data: {},
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/angel-detail').then(m => m.AngelDetail),
    resolve: {
      angel: AngelResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/angel-update').then(m => m.AngelUpdate),
    resolve: {
      angel: AngelResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/angel-update').then(m => m.AngelUpdate),
    resolve: {
      angel: AngelResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default angelRoute;
