import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

import RosterWeekResolve from './route/roster-week-routing-resolve.service';

const rosterWeekRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/roster-week').then(m => m.RosterWeek),
    data: {},
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/roster-week-detail').then(m => m.RosterWeekDetail),
    resolve: {
      rosterWeek: RosterWeekResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/roster-week-update').then(m => m.RosterWeekUpdate),
    resolve: {
      rosterWeek: RosterWeekResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/roster-week-update').then(m => m.RosterWeekUpdate),
    resolve: {
      rosterWeek: RosterWeekResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default rosterWeekRoute;
