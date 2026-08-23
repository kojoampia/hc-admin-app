import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';
import { ENTITY_READ_AUTHORITIES, ENTITY_WRITE_AUTHORITIES } from 'app/shared/auth/entity-route-authorities';

import UserOptionResolve from './route/user-option-routing-resolve.service';

const userOptionRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/user-option').then(m => m.UserOption),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/user-option-detail').then(m => m.UserOptionDetail),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    resolve: {
      userOption: UserOptionResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/user-option-update').then(m => m.UserOptionUpdate),
    data: { authorities: ENTITY_WRITE_AUTHORITIES },
    resolve: {
      userOption: UserOptionResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/user-option-update').then(m => m.UserOptionUpdate),
    data: { authorities: ENTITY_WRITE_AUTHORITIES },
    resolve: {
      userOption: UserOptionResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default userOptionRoute;
