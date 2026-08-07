import { Routes } from '@angular/router';
/* jhipster-needle-add-admin-module-import - JHipster will add admin modules imports here */

/**
 * JHipster's stock admin screens.
 *
 * The components themselves are untouched generator output. What is added
 * here is the console's own route contract — `pageTitle` and `breadcrumb` in
 * `data` — so the topbar reads "Administration / Health" on these screens
 * exactly as it does everywhere else, instead of falling back to a default.
 *
 * `title` is left in place beside it: `AppPageTitleStrategy` uses it for the
 * browser tab, and the two are not interchangeable.
 *
 * `docs` is deliberately NOT listed in the sidebar. It embeds a Swagger UI
 * pointed at `/v3/api-docs`, which no in-browser mock can serve — the route
 * stays reachable by URL, but linking to it would advertise a screen that
 * cannot work.
 */
const ADMIN_BREADCRUMB = 'global.menu.group.administration';

const routes: Routes = [
  {
    path: 'docs',
    loadComponent: () => import('./docs/docs'),
    title: 'global.menu.admin.apidocs',
    data: { pageTitle: 'global.menu.admin.apidocs', breadcrumb: ADMIN_BREADCRUMB },
  },
  {
    path: 'configuration',
    loadComponent: () => import('./configuration/configuration'),
    title: 'configuration.title',
    data: { pageTitle: 'configuration.title', breadcrumb: ADMIN_BREADCRUMB },
  },
  {
    path: 'health',
    loadComponent: () => import('./health/health'),
    title: 'health.title',
    data: { pageTitle: 'health.title', breadcrumb: ADMIN_BREADCRUMB },
  },
  {
    path: 'logs',
    loadComponent: () => import('./logs/logs'),
    title: 'logs.title',
    data: { pageTitle: 'logs.title', breadcrumb: ADMIN_BREADCRUMB },
  },
  {
    path: 'metrics',
    loadComponent: () => import('./metrics/metrics'),
    title: 'metrics.title',
    data: { pageTitle: 'metrics.title', breadcrumb: ADMIN_BREADCRUMB },
  },
  /* jhipster-needle-add-admin-route - JHipster will add admin routes here */
];

export default routes;
