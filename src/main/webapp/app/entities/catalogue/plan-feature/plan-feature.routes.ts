import { Routes } from '@angular/router';

import { ASC } from 'app/config/navigation.constants';
import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

import PlanFeatureResolve from './route/plan-feature-routing-resolve.service';

const planFeatureRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/plan-feature').then(m => m.PlanFeature),
    data: {
      defaultSort: `id,${ASC}`,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/plan-feature-detail').then(m => m.PlanFeatureDetail),
    resolve: {
      planFeature: PlanFeatureResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/plan-feature-update').then(m => m.PlanFeatureUpdate),
    resolve: {
      planFeature: PlanFeatureResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/plan-feature-update').then(m => m.PlanFeatureUpdate),
    resolve: {
      planFeature: PlanFeatureResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default planFeatureRoute;
