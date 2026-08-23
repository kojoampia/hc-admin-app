import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';
import { ENTITY_READ_AUTHORITIES, ENTITY_WRITE_AUTHORITIES } from 'app/shared/auth/entity-route-authorities';

import AuditEntryResolve from './route/audit-entry-routing-resolve.service';

const auditEntryRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/audit-entry').then(m => m.AuditEntry),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/audit-entry-detail').then(m => m.AuditEntryDetail),
    data: { authorities: ENTITY_READ_AUTHORITIES },
    resolve: {
      auditEntry: AuditEntryResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default auditEntryRoute;
