import { Routes } from '@angular/router';

import { ASC } from 'app/config/navigation.constants';
import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

import AddressResolve from './route/address-routing-resolve.service';

const addressRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/address').then(m => m.Address),
    data: {
      defaultSort: `id,${ASC}`,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/address-detail').then(m => m.AddressDetail),
    resolve: {
      address: AddressResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/address-update').then(m => m.AddressUpdate),
    resolve: {
      address: AddressResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/address-update').then(m => m.AddressUpdate),
    resolve: {
      address: AddressResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default addressRoute;
