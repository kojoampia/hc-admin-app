import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';
import { ENTITY_READ_AUTHORITIES, ENTITY_WRITE_AUTHORITIES } from 'app/shared/auth/entity-route-authorities';

import OrganisationResolve from './route/organisation-routing-resolve.service';

const organisationRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/organisation').then(m => m.Organisation),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/organisation-detail').then(m => m.OrganisationDetail),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    resolve: {
      organisation: OrganisationResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/organisation-update').then(m => m.OrganisationUpdate),
    data: { authorities: ENTITY_WRITE_AUTHORITIES },
    resolve: {
      organisation: OrganisationResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/organisation-update').then(m => m.OrganisationUpdate),
    data: { authorities: ENTITY_WRITE_AUTHORITIES },
    resolve: {
      organisation: OrganisationResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default organisationRoute;
