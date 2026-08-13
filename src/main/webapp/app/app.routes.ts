import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';
import { Authority } from 'app/shared/jhipster/constants';

import { errorRoute } from './layouts/error/error.route';

const routes: Routes = [
  {
    // The console opens on the dashboard. JHipster's generated home page is
    // a marketing splash for a framework, not a screen this product has.
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },
  {
    path: '',
    loadComponent: () => import('./layouts/navbar/navbar'),
    outlet: 'navbar',
  },
  {
    path: 'admin',
    data: {
      authorities: [Authority.ADMIN],
      breadcrumb: 'global.menu.group.session',
    },
    canActivate: [UserRouteAccessService],
    loadChildren: () => import('./admin/admin.routes'),
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login'),
    title: 'login.title',
    data: { pageTitle: 'login.title' },
  },
  {
    /**
     * The signed-in administrator's own account.
     *
     * Top level rather than under `admin/`, because it is not an administrative screen — every
     * authenticated user has one of these, and it is guarded by authentication alone. `admin/*`
     * screens name an authority; this one deliberately does not.
     */
    path: 'account',
    loadComponent: () => import('./account/account'),
    title: 'account.title',
    canActivate: [UserRouteAccessService],
  },
  {
    // The six custom screens.
    path: '',
    loadChildren: () => import('./console/console.routes'),
  },
  {
    // Generated entity CRUD. Unchanged.
    path: '',
    loadChildren: () => import('./entities/entity.routes'),
  },
  ...errorRoute,
];

export default routes;
