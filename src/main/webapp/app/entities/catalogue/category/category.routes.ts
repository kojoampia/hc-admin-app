import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

import CategoryResolve from './route/category-routing-resolve.service';

const categoryRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/category').then(m => m.Category),
    data: {},
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/category-detail').then(m => m.CategoryDetail),
    resolve: {
      category: CategoryResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/category-update').then(m => m.CategoryUpdate),
    resolve: {
      category: CategoryResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/category-update').then(m => m.CategoryUpdate),
    resolve: {
      category: CategoryResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default categoryRoute;
