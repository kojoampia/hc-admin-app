import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';
import { ENTITY_READ_AUTHORITIES, ENTITY_WRITE_AUTHORITIES } from 'app/shared/auth/entity-route-authorities';

import ProfessionalResolve from './route/professional-routing-resolve.service';

const professionalRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./dashboard/professional-dashboard').then(m => m.ProfessionalDashboardComponent),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/professional-detail').then(m => m.ProfessionalDetailComponent),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    resolve: {
      professional: ProfessionalResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/professional-update').then(m => m.ProfessionalUpdateComponent),
    data: { authorities: ENTITY_WRITE_AUTHORITIES },
    resolve: {
      professional: ProfessionalResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/professional-update').then(m => m.ProfessionalUpdateComponent),
    data: { authorities: ENTITY_WRITE_AUTHORITIES },
    resolve: {
      professional: ProfessionalResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'administration',
    loadComponent: () => import('./list/professional').then(m => m.ProfessionalComponent),
    data: { authorities: ENTITY_WRITE_AUTHORITIES },
    resolve: {
      professional: ProfessionalResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'account',
    data: {
      pageTitle: 'hcAdminApp.directoryProfessional.home.title',
      breadcrumb: 'global.menu.group.directory',
      authorities: ENTITY_WRITE_AUTHORITIES,
    },
    loadChildren: () => import('./account/routes'),
  },
  {
    path: 'profile',
    data: {
      pageTitle: 'hcAdminApp.directoryProfessional.home.title',
      breadcrumb: 'global.menu.group.directory',
      authorities: ENTITY_WRITE_AUTHORITIES,
    },
    loadChildren: () => import('./profile/routes'),
  },
];

export default professionalRoute;
