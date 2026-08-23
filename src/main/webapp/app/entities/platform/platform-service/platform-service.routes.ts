import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';
import { ENTITY_READ_AUTHORITIES, ENTITY_WRITE_AUTHORITIES } from 'app/shared/auth/entity-route-authorities';

import PlatformServiceResolve from './route/platform-service-routing-resolve.service';

const platformServiceRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/platform-service').then(m => m.PlatformService),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/platform-service-detail').then(m => m.PlatformServiceDetail),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    resolve: {
      platformService: PlatformServiceResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default platformServiceRoute;
