import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';
import { ENTITY_READ_AUTHORITIES, ENTITY_WRITE_AUTHORITIES } from 'app/shared/auth/entity-route-authorities';

import AngelResolve from './route/angel-routing-resolve.service';

const angelRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/angel').then(m => m.Angel),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/angel-detail').then(m => m.AngelDetail),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    resolve: {
      angel: AngelResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/angel-update').then(m => m.AngelUpdate),
    data: { authorities: ENTITY_WRITE_AUTHORITIES },
    resolve: {
      angel: AngelResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/angel-update').then(m => m.AngelUpdate),
    data: { authorities: ENTITY_WRITE_AUTHORITIES },
    resolve: {
      angel: AngelResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default angelRoute;
