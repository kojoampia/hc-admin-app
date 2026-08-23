import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';
import { ENTITY_READ_AUTHORITIES, ENTITY_WRITE_AUTHORITIES } from 'app/shared/auth/entity-route-authorities';

import ProfileResolve from './route/profile-routing-resolve.service';

const profileRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/profile').then(m => m.Profile),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/profile-detail').then(m => m.ProfileDetail),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    resolve: {
      profile: ProfileResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/profile-update').then(m => m.ProfileUpdate),
    data: { authorities: ENTITY_WRITE_AUTHORITIES },
    resolve: {
      profile: ProfileResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/profile-update').then(m => m.ProfileUpdate),
    data: { authorities: ENTITY_WRITE_AUTHORITIES },
    resolve: {
      profile: ProfileResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default profileRoute;
