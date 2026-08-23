import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';
import { ENTITY_READ_AUTHORITIES, ENTITY_WRITE_AUTHORITIES } from 'app/shared/auth/entity-route-authorities';

import MessageResolve from './route/message-routing-resolve.service';

const messageRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/message').then(m => m.Message),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/message-detail').then(m => m.MessageDetail),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    resolve: {
      message: MessageResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/message-update').then(m => m.MessageUpdate),
    data: { authorities: ENTITY_WRITE_AUTHORITIES },
    resolve: {
      message: MessageResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/message-update').then(m => m.MessageUpdate),
    data: { authorities: ENTITY_WRITE_AUTHORITIES },
    resolve: {
      message: MessageResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default messageRoute;
