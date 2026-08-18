import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

/**
 * The six custom console screens.
 *
 * Each is lazy-loaded and each declares `pageTitle` and `breadcrumb` in route
 * `data` — JHipster's own convention. `AppPageTitleStrategy` reads the first
 * for the browser title and the topbar reads both, so one declaration drives
 * the tab, the crumb and the heading.
 *
 * Every route is behind `UserRouteAccessService` but none names an authority:
 * all three console roles may READ every screen. Write access is gated
 * per-control with `*abfHasAnyAuthority`, which is what lets the supervisor
 * see the whole console read-only rather than being bounced off half of it.
 */
const routes: Routes = [
  {
    path: 'dashboard',
    data: { pageTitle: 'dashboard.pageTitle', breadcrumb: 'global.menu.group.operations' },
    canActivate: [UserRouteAccessService],
    loadComponent: () => import('./dashboard/dashboard'),
  },
  {
    path: 'message-desk',
    data: { pageTitle: 'messageDesk.pageTitle', breadcrumb: 'global.menu.group.operations' },
    canActivate: [UserRouteAccessService],
    loadComponent: () => import('./message-desk/message-desk'),
  },
  {
    // Declared before `message-desk/:id`, and the order is load-bearing: the router takes the first
    // match, so with :id first this route would resolve as a thread whose id is the word "new" and
    // the compose screen would be unreachable.
    path: 'message-desk/new',
    data: { pageTitle: 'messageDesk.compose.pageTitle', breadcrumb: 'global.menu.console.messageDesk' },
    canActivate: [UserRouteAccessService],
    loadComponent: () => import('./message-desk/message-compose'),
  },
  {
    path: 'message-desk/:id',
    data: { pageTitle: 'messageDesk.thread.pageTitle', breadcrumb: 'global.menu.console.messageDesk' },
    canActivate: [UserRouteAccessService],
    loadComponent: () => import('./message-desk/message-thread'),
  },
  {
    path: 'duty-roster',
    data: { pageTitle: 'dutyRoster.pageTitle', breadcrumb: 'global.menu.group.operations' },
    canActivate: [UserRouteAccessService],
    loadComponent: () => import('./duty-roster/duty-roster'),
  },
  {
    path: 'task-board',
    data: { pageTitle: 'taskBoard.pageTitle', breadcrumb: 'global.menu.group.operations' },
    canActivate: [UserRouteAccessService],
    loadComponent: () => import('./task-board/task-board'),
  },
  {
    path: 'platform-health',
    data: { pageTitle: 'platformHealth.pageTitle', breadcrumb: 'global.menu.group.catalogue' },
    canActivate: [UserRouteAccessService],
    loadComponent: () => import('./platform-health/platform-health'),
  },
  {
    // No `authorities` here, in line with every other console route: all three roles may read the
    // rate table. Setting a rate is gated per-control with `*abfHasAnyAuthority`, and the api
    // enforces the same split independently — writes under /api/** are ROLE_ADMIN, reads are
    // ROLE_OPERATOR or better, so hiding the button is presentation and not the security boundary.
    path: 'wage-rates',
    data: { pageTitle: 'wageRates.pageTitle', breadcrumb: 'global.menu.group.catalogue' },
    canActivate: [UserRouteAccessService],
    loadComponent: () => import('./wage-rates/wage-rates'),
  },
  {
    path: 'organisation-profile',
    data: { pageTitle: 'organisation.pageTitle', breadcrumb: 'global.menu.group.account' },
    canActivate: [UserRouteAccessService],
    loadComponent: () => import('./organisation/organisation-profile'),
  },
];

export default routes;
