import { Routes } from '@angular/router';

import { ASC } from 'app/config/navigation.constants';
import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

import MessageResolve from './route/message-routing-resolve.service';

const messageRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/message').then(m => m.Message),
    data: {
      defaultSort: `id,${ASC}`,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/message-detail').then(m => m.MessageDetail),
    resolve: {
      message: MessageResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/message-update').then(m => m.MessageUpdate),
    resolve: {
      message: MessageResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/message-update').then(m => m.MessageUpdate),
    resolve: {
      message: MessageResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default messageRoute;
