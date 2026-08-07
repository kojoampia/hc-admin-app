import { Routes } from '@angular/router';

import { ASC } from 'app/config/navigation.constants';
import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

import ServiceActivityResolve from './route/service-activity-routing-resolve.service';

const serviceActivityRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/service-activity').then(m => m.ServiceActivity),
    data: {
      defaultSort: `id,${ASC}`,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/service-activity-detail').then(m => m.ServiceActivityDetail),
    resolve: {
      serviceActivity: ServiceActivityResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/service-activity-update').then(m => m.ServiceActivityUpdate),
    resolve: {
      serviceActivity: ServiceActivityResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/service-activity-update').then(m => m.ServiceActivityUpdate),
    resolve: {
      serviceActivity: ServiceActivityResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default serviceActivityRoute;
