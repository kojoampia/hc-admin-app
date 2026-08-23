import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';
import { ENTITY_READ_AUTHORITIES, ENTITY_WRITE_AUTHORITIES } from 'app/shared/auth/entity-route-authorities';

import ServicePlanResolve from './route/service-plan-routing-resolve.service';

const servicePlanRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/service-plan').then(m => m.ServicePlan),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/service-plan-detail').then(m => m.ServicePlanDetail),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    resolve: {
      servicePlan: ServicePlanResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/service-plan-update').then(m => m.ServicePlanUpdate),
    data: { authorities: ENTITY_WRITE_AUTHORITIES },
    resolve: {
      servicePlan: ServicePlanResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/service-plan-update').then(m => m.ServicePlanUpdate),
    data: { authorities: ENTITY_WRITE_AUTHORITIES },
    resolve: {
      servicePlan: ServicePlanResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default servicePlanRoute;
