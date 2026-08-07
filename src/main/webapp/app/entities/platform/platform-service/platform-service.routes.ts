import { Routes } from '@angular/router';

import { ASC } from 'app/config/navigation.constants';
import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

import PlatformServiceResolve from './route/platform-service-routing-resolve.service';

const platformServiceRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/platform-service').then(m => m.PlatformService),
    data: {
      defaultSort: `id,${ASC}`,
    },
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
