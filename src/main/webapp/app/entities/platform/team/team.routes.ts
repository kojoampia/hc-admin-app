import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';
import { ENTITY_READ_AUTHORITIES, ENTITY_WRITE_AUTHORITIES } from 'app/shared/auth/entity-route-authorities';

import TeamResolve from './route/team-routing-resolve.service';

const teamRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/team').then(m => m.Team),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/team-detail').then(m => m.TeamDetail),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    resolve: {
      team: TeamResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/team-update').then(m => m.TeamUpdate),
    data: { authorities: ENTITY_WRITE_AUTHORITIES },
    resolve: {
      team: TeamResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/team-update').then(m => m.TeamUpdate),
    data: { authorities: ENTITY_WRITE_AUTHORITIES },
    resolve: {
      team: TeamResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default teamRoute;
