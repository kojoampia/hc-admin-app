import { Routes } from '@angular/router';

import { ASC } from 'app/config/navigation.constants';
import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

import OrganisationResolve from './route/organisation-routing-resolve.service';

const organisationRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/organisation').then(m => m.Organisation),
    data: {
      defaultSort: `id,${ASC}`,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/organisation-detail').then(m => m.OrganisationDetail),
    resolve: {
      organisation: OrganisationResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/organisation-update').then(m => m.OrganisationUpdate),
    resolve: {
      organisation: OrganisationResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/organisation-update').then(m => m.OrganisationUpdate),
    resolve: {
      organisation: OrganisationResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default organisationRoute;
