import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';
import { ENTITY_READ_AUTHORITIES, ENTITY_WRITE_AUTHORITIES } from 'app/shared/auth/entity-route-authorities';

import CategoryResolve from './route/category-routing-resolve.service';

const categoryRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/category').then(m => m.Category),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/category-detail').then(m => m.CategoryDetail),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    resolve: {
      category: CategoryResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/category-update').then(m => m.CategoryUpdate),
    data: { authorities: ENTITY_WRITE_AUTHORITIES },
    resolve: {
      category: CategoryResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/category-update').then(m => m.CategoryUpdate),
    data: { authorities: ENTITY_WRITE_AUTHORITIES },
    resolve: {
      category: CategoryResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default categoryRoute;
