import { Routes } from '@angular/router';

import { ASC } from 'app/config/navigation.constants';
import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

import TeamResolve from './route/team-routing-resolve.service';

const teamRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/team').then(m => m.Team),
    data: {
      defaultSort: `id,${ASC}`,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/team-detail').then(m => m.TeamDetail),
    resolve: {
      team: TeamResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/team-update').then(m => m.TeamUpdate),
    resolve: {
      team: TeamResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/team-update').then(m => m.TeamUpdate),
    resolve: {
      team: TeamResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default teamRoute;
