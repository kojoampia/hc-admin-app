import { Routes } from '@angular/router';

import { ASC } from 'app/config/navigation.constants';
import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

import VendorResolve from './route/vendor-routing-resolve.service';

const vendorRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/vendor').then(m => m.Vendor),
    data: {
      defaultSort: `id,${ASC}`,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/vendor-detail').then(m => m.VendorDetail),
    resolve: {
      vendor: VendorResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/vendor-update').then(m => m.VendorUpdate),
    resolve: {
      vendor: VendorResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/vendor-update').then(m => m.VendorUpdate),
    resolve: {
      vendor: VendorResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default vendorRoute;
