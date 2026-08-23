import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';
import { ENTITY_READ_AUTHORITIES, ENTITY_WRITE_AUTHORITIES } from 'app/shared/auth/entity-route-authorities';

import ServiceActivityResolve from './route/service-activity-routing-resolve.service';

const serviceActivityRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/service-activity').then(m => m.ServiceActivity),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/service-activity-detail').then(m => m.ServiceActivityDetail),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    resolve: {
      serviceActivity: ServiceActivityResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/service-activity-update').then(m => m.ServiceActivityUpdate),
    data: { authorities: ENTITY_WRITE_AUTHORITIES },
    resolve: {
      serviceActivity: ServiceActivityResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/service-activity-update').then(m => m.ServiceActivityUpdate),
    data: { authorities: ENTITY_WRITE_AUTHORITIES },
    resolve: {
      serviceActivity: ServiceActivityResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default serviceActivityRoute;
