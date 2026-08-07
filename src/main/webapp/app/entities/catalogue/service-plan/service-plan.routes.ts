import { Routes } from '@angular/router';

import { ASC } from 'app/config/navigation.constants';
import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

import ServicePlanResolve from './route/service-plan-routing-resolve.service';

const servicePlanRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/service-plan').then(m => m.ServicePlan),
    data: {
      defaultSort: `id,${ASC}`,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/service-plan-detail').then(m => m.ServicePlanDetail),
    resolve: {
      servicePlan: ServicePlanResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/service-plan-update').then(m => m.ServicePlanUpdate),
    resolve: {
      servicePlan: ServicePlanResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/service-plan-update').then(m => m.ServicePlanUpdate),
    resolve: {
      servicePlan: ServicePlanResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default servicePlanRoute;
