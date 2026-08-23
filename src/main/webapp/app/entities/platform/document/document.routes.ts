import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';
import { ENTITY_READ_AUTHORITIES, ENTITY_WRITE_AUTHORITIES } from 'app/shared/auth/entity-route-authorities';

import DocumentResolve from './route/document-routing-resolve.service';

const documentRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/document').then(m => m.Document),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/document-detail').then(m => m.DocumentDetail),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    resolve: {
      document: DocumentResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/document-update').then(m => m.DocumentUpdate),
    data: { authorities: ENTITY_WRITE_AUTHORITIES },
    resolve: {
      document: DocumentResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/document-update').then(m => m.DocumentUpdate),
    data: { authorities: ENTITY_WRITE_AUTHORITIES },
    resolve: {
      document: DocumentResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default documentRoute;
