import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';
import { ENTITY_READ_AUTHORITIES, ENTITY_WRITE_AUTHORITIES } from 'app/shared/auth/entity-route-authorities';

import TaskResolve from './route/task-routing-resolve.service';

const taskRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/task').then(m => m.Task),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/task-detail').then(m => m.TaskDetail),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    resolve: {
      task: TaskResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/task-update').then(m => m.TaskUpdate),
    data: { authorities: ENTITY_WRITE_AUTHORITIES },
    resolve: {
      task: TaskResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/task-update').then(m => m.TaskUpdate),
    data: { authorities: ENTITY_WRITE_AUTHORITIES },
    resolve: {
      task: TaskResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default taskRoute;
