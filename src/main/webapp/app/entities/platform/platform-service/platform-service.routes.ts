import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

import PlatformServiceResolve from './route/platform-service-routing-resolve.service';

const platformServiceRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/platform-service').then(m => m.PlatformService),
    data: {},
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/platform-service-detail').then(m => m.PlatformServiceDetail),
    resolve: {
      platformService: PlatformServiceResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default platformServiceRoute;
