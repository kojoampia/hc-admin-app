import { Routes } from '@angular/router';

import { ASC } from 'app/config/navigation.constants';
import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

import CareActivityResolve from './route/care-activity-routing-resolve.service';

const careActivityRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/care-activity').then(m => m.CareActivity),
    data: {
      defaultSort: `id,${ASC}`,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/care-activity-detail').then(m => m.CareActivityDetail),
    resolve: {
      careActivity: CareActivityResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/care-activity-update').then(m => m.CareActivityUpdate),
    resolve: {
      careActivity: CareActivityResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/care-activity-update').then(m => m.CareActivityUpdate),
    resolve: {
      careActivity: CareActivityResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default careActivityRoute;
