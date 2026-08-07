import { Routes } from '@angular/router';

import { ASC } from 'app/config/navigation.constants';
import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

import UserOptionResolve from './route/user-option-routing-resolve.service';

const userOptionRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/user-option').then(m => m.UserOption),
    data: {
      defaultSort: `id,${ASC}`,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/user-option-detail').then(m => m.UserOptionDetail),
    resolve: {
      userOption: UserOptionResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/user-option-update').then(m => m.UserOptionUpdate),
    resolve: {
      userOption: UserOptionResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/user-option-update').then(m => m.UserOptionUpdate),
    resolve: {
      userOption: UserOptionResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default userOptionRoute;
