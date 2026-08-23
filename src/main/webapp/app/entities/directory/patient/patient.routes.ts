import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';
import { ENTITY_READ_AUTHORITIES, ENTITY_WRITE_AUTHORITIES } from 'app/shared/auth/entity-route-authorities';

import PatientResolve from './route/patient-routing-resolve.service';

const patientRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/patient').then(m => m.Patient),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/patient-detail').then(m => m.PatientDetail),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    resolve: {
      patient: PatientResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/patient-update').then(m => m.PatientUpdate),
    data: { authorities: ENTITY_WRITE_AUTHORITIES },
    resolve: {
      patient: PatientResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/patient-update').then(m => m.PatientUpdate),
    data: { authorities: ENTITY_WRITE_AUTHORITIES },
    resolve: {
      patient: PatientResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default patientRoute;
