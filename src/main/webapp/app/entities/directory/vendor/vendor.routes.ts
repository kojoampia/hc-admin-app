import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';
import { ENTITY_READ_AUTHORITIES, ENTITY_WRITE_AUTHORITIES } from 'app/shared/auth/entity-route-authorities';

import VendorResolve from './route/vendor-routing-resolve.service';

const vendorRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/vendor').then(m => m.Vendor),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/vendor-detail').then(m => m.VendorDetail),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    resolve: {
      vendor: VendorResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/vendor-update').then(m => m.VendorUpdate),
    data: { authorities: ENTITY_WRITE_AUTHORITIES },
    resolve: {
      vendor: VendorResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/vendor-update').then(m => m.VendorUpdate),
    data: { authorities: ENTITY_WRITE_AUTHORITIES },
    resolve: {
      vendor: VendorResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default vendorRoute;
