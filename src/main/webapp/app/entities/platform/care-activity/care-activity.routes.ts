import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';
import { ENTITY_READ_AUTHORITIES, ENTITY_WRITE_AUTHORITIES } from 'app/shared/auth/entity-route-authorities';

import CareActivityResolve from './route/care-activity-routing-resolve.service';

const careActivityRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/care-activity').then(m => m.CareActivity),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/care-activity-detail').then(m => m.CareActivityDetail),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    resolve: {
      careActivity: CareActivityResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/care-activity-update').then(m => m.CareActivityUpdate),
    data: { authorities: ENTITY_WRITE_AUTHORITIES },
    resolve: {
      careActivity: CareActivityResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/care-activity-update').then(m => m.CareActivityUpdate),
    data: { authorities: ENTITY_WRITE_AUTHORITIES },
    resolve: {
      careActivity: CareActivityResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default careActivityRoute;
