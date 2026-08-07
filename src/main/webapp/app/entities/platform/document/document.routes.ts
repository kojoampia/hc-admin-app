import { Routes } from '@angular/router';

import { ASC } from 'app/config/navigation.constants';
import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

import DocumentResolve from './route/document-routing-resolve.service';

const documentRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/document').then(m => m.Document),
    data: {
      defaultSort: `id,${ASC}`,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/document-detail').then(m => m.DocumentDetail),
    resolve: {
      document: DocumentResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/document-update').then(m => m.DocumentUpdate),
    resolve: {
      document: DocumentResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/document-update').then(m => m.DocumentUpdate),
    resolve: {
      document: DocumentResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default documentRoute;
