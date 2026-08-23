import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';
import { ENTITY_READ_AUTHORITIES, ENTITY_WRITE_AUTHORITIES } from 'app/shared/auth/entity-route-authorities';

import RosterWeekResolve from './route/roster-week-routing-resolve.service';

const rosterWeekRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/roster-week').then(m => m.RosterWeek),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/roster-week-detail').then(m => m.RosterWeekDetail),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    resolve: {
      rosterWeek: RosterWeekResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/roster-week-update').then(m => m.RosterWeekUpdate),
    data: { authorities: ENTITY_WRITE_AUTHORITIES },
    resolve: {
      rosterWeek: RosterWeekResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/roster-week-update').then(m => m.RosterWeekUpdate),
    data: { authorities: ENTITY_WRITE_AUTHORITIES },
    resolve: {
      rosterWeek: RosterWeekResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default rosterWeekRoute;
