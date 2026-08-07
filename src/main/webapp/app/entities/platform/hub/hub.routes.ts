import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

import HubResolve from './route/hub-routing-resolve.service';

const hubRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/hub').then(m => m.Hub),
    data: {},
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/hub-detail').then(m => m.HubDetail),
    resolve: {
      hub: HubResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/hub-update').then(m => m.HubUpdate),
    resolve: {
      hub: HubResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/hub-update').then(m => m.HubUpdate),
    resolve: {
      hub: HubResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default hubRoute;
