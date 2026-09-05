// e2e-fixture: read-only
// Follows links.

import { breadcrumbSelector, pageTitleSelector, sidebarNavSelector } from '../../support/console';

/**
 * The sidebar destinations this file follows, with the crumb and title each must show.
 *
 * <p>**Counted nowhere, deliberately.** This said "the eleven sidebar destinations" above a
 * fifteen-element array, under a case whose name said fifteen — three numbers, two of them wrong,
 * in six lines, and none of them checkable by anything. `shell-navigation.ts` declares more routes
 * than this (23 at the last count), so the list below is a subset by design and a count here would
 * be a third figure to keep in step with two others. `ROUTES.length` is the only honest spelling.
 */
const ROUTES: { route: string; title: string; breadcrumb: string }[] = [
  { route: 'dashboard', title: 'Admin dashboard', breadcrumb: 'Operations' },
  { route: 'message-desk', title: 'Message desk', breadcrumb: 'Operations' },
  { route: 'duty-roster', title: 'Duty roster', breadcrumb: 'Operations' },
  { route: 'task-board', title: 'Task management', breadcrumb: 'Operations' },
  { route: 'patient', title: 'Patients', breadcrumb: 'Directory' },
  { route: 'professional', title: 'Professionals', breadcrumb: 'Directory' },
  { route: 'vendor', title: 'Vendors', breadcrumb: 'Directory' },
  // 'Service plans', sentence case, as every other title in this list is and as
  // `i18n/en/catalogueServicePlan.json` says. This read `Service Plans` until 2026-09-05 and was the
  // only assertion in the file that had never been true — the screen has always rendered the i18n
  // string. It is the smallest possible instance of what item 15 is about: an expectation nothing
  // could compare against the thing it describes.
  { route: 'service-plan', title: 'Service plans', breadcrumb: 'Catalogue' },
  { route: 'category', title: 'Categories', breadcrumb: 'Catalogue' },
  { route: 'platform-health', title: 'Platform health', breadcrumb: 'Catalogue' },
  { route: 'organisation-profile', title: 'Organisation profile', breadcrumb: 'Account' },
  // JHipster's stock admin screens, adopted into the console.
  { route: 'admin/health', title: 'Health Checks', breadcrumb: 'Administration' },
  { route: 'admin/metrics', title: 'Application Metrics', breadcrumb: 'Administration' },
  { route: 'admin/configuration', title: 'Configuration', breadcrumb: 'Administration' },
  { route: 'admin/logs', title: 'Logs', breadcrumb: 'Administration' },
];

describe('navigation', () => {
  /**
   * Any console error fails the spec.
   *
   * Registered before `visit` so the stub is in place for the very first
   * frame — attaching afterwards would miss everything logged during
   * bootstrap, which is where these tend to happen.
   */
  const failOnConsoleError = (): void => {
    cy.on('window:before:load', win => {
      cy.stub(win.console, 'error').callsFake((...args: unknown[]) => {
        throw new Error(`console.error: ${args.map(String).join(' ')}`);
      });
    });
  };

  beforeEach(() => {
    cy.signInAs('ops');
  });

  it('should offer every destination this file follows in the sidebar', () => {
    cy.get(sidebarNavSelector)
      .find('a[href^="/"]')
      .then($links => {
        const hrefs = [...$links].map(link => link.getAttribute('href'));
        // Inclusion, not equality: `shell-navigation.ts` carries destinations this list does not,
        // so an exact match would fail on a sidebar that is entirely correct.
        ROUTES.forEach(({ route }) => expect(hrefs).to.include(`/${route}`));
      });
  });

  ROUTES.forEach(({ route, title, breadcrumb }) => {
    it(`should show the right title and breadcrumb on /${route}`, () => {
      failOnConsoleError();
      cy.openConsoleRoute(route);

      cy.location('pathname').should('eq', `/${route}`);
      cy.get(pageTitleSelector).should('contain.text', title);
      cy.get(breadcrumbSelector).should('contain.text', breadcrumb);
    });
  });

  it('should reach every route in one pass without a console error', () => {
    failOnConsoleError();
    ROUTES.forEach(({ route }) => {
      cy.openConsoleRoute(route);
      cy.location('pathname').should('eq', `/${route}`);
    });
  });

  it('should mark the current destination active in the sidebar', () => {
    cy.openConsoleRoute('duty-roster');
    cy.get(sidebarNavSelector).find('a.active').should('have.attr', 'href', '/duty-roster');
  });
});
