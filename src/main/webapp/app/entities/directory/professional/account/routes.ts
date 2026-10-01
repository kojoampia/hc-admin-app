import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';
import { ENTITY_READ_AUTHORITIES, ENTITY_WRITE_AUTHORITIES } from 'app/shared/auth/entity-route-authorities';

import ProfessionalAccountResolve from './routing-resolve.service';

const professionalAccountRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list').then(m => m.ProfessionalAccount),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail').then(m => m.ProfessionalAccountDetail),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    resolve: {
      professional: ProfessionalAccountResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update').then(m => m.ProfessionalAccountUpdate),
    data: { authorities: ENTITY_WRITE_AUTHORITIES },
    resolve: {
      professional: ProfessionalAccountResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default professionalAccountRoute;
