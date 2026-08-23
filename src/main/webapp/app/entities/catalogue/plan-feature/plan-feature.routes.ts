import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';
import { ENTITY_READ_AUTHORITIES, ENTITY_WRITE_AUTHORITIES } from 'app/shared/auth/entity-route-authorities';

import PlanFeatureResolve from './route/plan-feature-routing-resolve.service';

const planFeatureRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/plan-feature').then(m => m.PlanFeature),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/plan-feature-detail').then(m => m.PlanFeatureDetail),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    resolve: {
      planFeature: PlanFeatureResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/plan-feature-update').then(m => m.PlanFeatureUpdate),
    data: { authorities: ENTITY_WRITE_AUTHORITIES },
    resolve: {
      planFeature: PlanFeatureResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/plan-feature-update').then(m => m.PlanFeatureUpdate),
    data: { authorities: ENTITY_WRITE_AUTHORITIES },
    resolve: {
      planFeature: PlanFeatureResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default planFeatureRoute;
