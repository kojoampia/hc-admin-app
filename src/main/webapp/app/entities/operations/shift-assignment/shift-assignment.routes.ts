import { Routes } from '@angular/router';

import { ASC } from 'app/config/navigation.constants';
import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

import ShiftAssignmentResolve from './route/shift-assignment-routing-resolve.service';

const shiftAssignmentRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/shift-assignment').then(m => m.ShiftAssignment),
    data: {
      defaultSort: `id,${ASC}`,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/shift-assignment-detail').then(m => m.ShiftAssignmentDetail),
    resolve: {
      shiftAssignment: ShiftAssignmentResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/shift-assignment-update').then(m => m.ShiftAssignmentUpdate),
    resolve: {
      shiftAssignment: ShiftAssignmentResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/shift-assignment-update').then(m => m.ShiftAssignmentUpdate),
    resolve: {
      shiftAssignment: ShiftAssignmentResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default shiftAssignmentRoute;
