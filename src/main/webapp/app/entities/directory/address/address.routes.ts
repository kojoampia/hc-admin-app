import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';
import { ENTITY_READ_AUTHORITIES, ENTITY_WRITE_AUTHORITIES } from 'app/shared/auth/entity-route-authorities';

import AddressResolve from './route/address-routing-resolve.service';

const addressRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/address').then(m => m.Address),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/address-detail').then(m => m.AddressDetail),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    resolve: {
      address: AddressResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/address-update').then(m => m.AddressUpdate),
    data: { authorities: ENTITY_WRITE_AUTHORITIES },
    resolve: {
      address: AddressResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/address-update').then(m => m.AddressUpdate),
    data: { authorities: ENTITY_WRITE_AUTHORITIES },
    resolve: {
      address: AddressResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default addressRoute;
