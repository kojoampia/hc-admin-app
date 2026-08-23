import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';
import { ENTITY_READ_AUTHORITIES, ENTITY_WRITE_AUTHORITIES } from 'app/shared/auth/entity-route-authorities';

import ProfessionalResolve from './route/professional-routing-resolve.service';

const professionalRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/professional').then(m => m.Professional),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/professional-detail').then(m => m.ProfessionalDetail),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    resolve: {
      professional: ProfessionalResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/professional-update').then(m => m.ProfessionalUpdate),
    data: { authorities: ENTITY_WRITE_AUTHORITIES },
    resolve: {
      professional: ProfessionalResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/professional-update').then(m => m.ProfessionalUpdate),
    data: { authorities: ENTITY_WRITE_AUTHORITIES },
    resolve: {
      professional: ProfessionalResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default professionalRoute;
