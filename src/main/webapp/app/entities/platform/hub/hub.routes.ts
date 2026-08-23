import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';
import { ENTITY_READ_AUTHORITIES, ENTITY_WRITE_AUTHORITIES } from 'app/shared/auth/entity-route-authorities';

import HubResolve from './route/hub-routing-resolve.service';

const hubRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/hub').then(m => m.Hub),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/hub-detail').then(m => m.HubDetail),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    resolve: {
      hub: HubResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/hub-update').then(m => m.HubUpdate),
    data: { authorities: ENTITY_WRITE_AUTHORITIES },
    resolve: {
      hub: HubResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/hub-update').then(m => m.HubUpdate),
    data: { authorities: ENTITY_WRITE_AUTHORITIES },
    resolve: {
      hub: HubResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default hubRoute;
