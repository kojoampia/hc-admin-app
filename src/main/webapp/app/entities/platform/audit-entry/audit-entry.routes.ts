import { Routes } from '@angular/router';

import { ASC } from 'app/config/navigation.constants';
import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

import AuditEntryResolve from './route/audit-entry-routing-resolve.service';

const auditEntryRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/audit-entry').then(m => m.AuditEntry),
    data: {
      defaultSort: `id,${ASC}`,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/audit-entry-detail').then(m => m.AuditEntryDetail),
    resolve: {
      auditEntry: AuditEntryResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default auditEntryRoute;
