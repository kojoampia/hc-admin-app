import { Routes } from '@angular/router';

import { ASC } from 'app/config/navigation.constants';
import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

import ProfessionalResolve from './route/professional-routing-resolve.service';

const professionalRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/professional').then(m => m.Professional),
    data: {
      defaultSort: `id,${ASC}`,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/professional-detail').then(m => m.ProfessionalDetail),
    resolve: {
      professional: ProfessionalResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/professional-update').then(m => m.ProfessionalUpdate),
    resolve: {
      professional: ProfessionalResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/professional-update').then(m => m.ProfessionalUpdate),
    resolve: {
      professional: ProfessionalResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default professionalRoute;
