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
     * Ask for a password-reset mail. `POST /api/account/reset-password/init`.
     *
     * <p>Top level and **not** a child of `account` below, which is the whole point: that route
     * carries `UserRouteAccessService`, and somebody asking to reset a password cannot sign in by
     * definition. Beside `login`, which is the other route an anonymous visitor reaches, and which
     * owns the whole viewport with no shell chrome — `main.html` renders the chrome only when
     * `isAuthenticated()`, so these two pages are full-bleed for free.
     */
    path: 'account/reset/request',
    loadComponent: () => import('./account/reset/request/password-reset-request'),
    title: 'reset.request.title',
    data: { pageTitle: 'reset.request.title' },
  },
  {
    /**
     * Redeem a reset key. `POST /api/account/reset-password/finish`.
     *
     * <p><b>This path is a fixed contract, not a choice.</b> The gateway's `creationEmail.html:12`
     * and `passwordResetEmail.html:14` both build `${baseUrl}/account/reset/finish?key=…`, and those
     * links are in inboxes already — the emails cannot be corrected retroactively, so the screen is
     * built where they point. It did not exist until 2026-09-02 and the link rendered the console's
     * 404 page, which meant no account created through `/api/admin/users` could be activated at all;
     * there is no self-registration on this stack, so that email is the only route to a password.
     *
     * <p>Declared above `account` for readability rather than for correctness — a route with a
     * component and no children only matches when it consumes the whole URL, so `account` never had
     * a claim on these two. `app.routes.spec.ts` navigates both, signed out, so the guard and the
     * ordering are asserted rather than reasoned about.
     *
     * <p><b>Reachable while signed in too, on purpose</b>, and the shell renders around it when it
     * is — an administrator redeeming a forced reset from a live session is the ordinary case, not
     * an abuse. `app.routes.spec.ts` § "a signed-in visitor" has the decision and what it costs.
     */
    path: 'account/reset/finish',
    loadComponent: () => import('./account/reset/finish/password-reset-finish'),
    title: 'reset.finish.title',
    data: { pageTitle: 'reset.finish.title' },
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
