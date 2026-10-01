import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';
import { ENTITY_READ_AUTHORITIES } from 'app/shared/auth/entity-route-authorities';
import ProfessionalProfileResolve from './resolve.service';

const professionalProfileRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./professional-profile').then(m => m.ProfessionalProfile),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail').then(m => m.ProfessionalProfileDetail),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    resolve: {
      professional: ProfessionalProfileResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default professionalProfileRoute;
