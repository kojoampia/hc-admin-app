import { breadcrumbSelector, pageTitleSelector, sidebarNavSelector } from '../../support/console';

/**
 * JHipster's stock admin screens, adopted into the console.
 *
 * The components are untouched generator output; what is asserted here is
 * that they are reachable, correctly framed by the shell, actually fed with
 * data, and closed to anyone without ROLE_ADMIN.
 */
const ADMIN_ROUTES = [
  { route: 'admin/health', title: 'Health Checks' },
  { route: 'admin/metrics', title: 'Application Metrics' },
  { route: 'admin/configuration', title: 'Configuration' },
  { route: 'admin/logs', title: 'Logs' },
];

describe('administration', () => {
  describe('as the operations administrator', () => {
    beforeEach(() => {
      cy.signInAs('ops');
    });

    it('should list the Administration group in the sidebar', () => {
      cy.get(sidebarNavSelector).should('contain.text', 'Administration');
      ADMIN_ROUTES.forEach(({ route }) => {
        cy.get(sidebarNavSelector).find(`a[href="/${route}"]`).should('exist');
      });
    });

    ADMIN_ROUTES.forEach(({ route, title }) => {
      it(`should frame /${route} with the console chrome`, () => {
        cy.openConsoleRoute(route);

        cy.location('pathname').should('eq', `/${route}`);
        cy.get(pageTitleSelector).should('contain.text', title);
        cy.get(breadcrumbSelector).should('contain.text', 'Administration');
      });
    });

    it('should render health from the same catalogue as Platform health', () => {
      cy.openConsoleRoute('admin/health');

      // Thirteen services plus disk space, liveness, readiness and ping.
      cy.get('#healthCheck tbody tr').should('have.length', 17);
      // Named, not shown as a raw hostname.
      cy.contains('#healthCheck tbody tr', 'Vendor Gateway').should('contain.text', 'DOWN');
      cy.contains('#healthCheck tbody tr', 'Admin Gateway').should('contain.text', 'UP');
    });

    it('should render metrics rather than an empty shell', () => {
      cy.openConsoleRoute('admin/metrics');

      cy.contains('JVM Metrics').should('be.visible');
      cy.get('.progress-bar').should('have.length.greaterThan', 3);
      cy.contains('Total: 8').should('be.visible');
    });

    it('should say plainly on the configuration screen that there is no backend', () => {
      cy.openConsoleRoute('admin/configuration');

      cy.contains('abofonsa.console.api').should('be.visible');
      cy.contains('no backend is running').should('be.visible');
    });

    it('should change a logger level and keep it', () => {
      cy.openConsoleRoute('admin/logs');
      cy.contains('There are 10 loggers').should('be.visible');

      cy.contains('tbody tr', 'care.abofonsa.gateway').contains('button', 'ERROR').click();
      cy.contains('tbody tr', 'care.abofonsa.gateway').find('button.btn-danger, button.active').should('contain.text', 'ERROR');

      // Still set after leaving and coming back in-app.
      cy.openConsoleRoute('dashboard');
      cy.openConsoleRoute('admin/logs');
      cy.contains('tbody tr', 'care.abofonsa.gateway').find('button.btn-danger, button.active').should('contain.text', 'ERROR');
    });

    it('should filter the logger list', () => {
      cy.openConsoleRoute('admin/logs');
      cy.get('input[type="text"]').first().type('springframework');
      cy.get('tbody tr').should('have.length', 2);
    });
  });

  describe('as a supervisor', () => {
    beforeEach(() => {
      cy.signInAs('sup');
    });

    it('should not offer the Administration group at all', () => {
      cy.get(sidebarNavSelector).should('not.contain.text', 'Administration');
      cy.get(sidebarNavSelector).find('a[href^="/admin/"]').should('not.exist');
    });

    it('should refuse a direct visit to an admin route', () => {
      cy.visit('/admin/health', { failOnStatusCode: false });
      // UserRouteAccessService sends anyone without the authority to accessdenied.
      cy.location('pathname', { timeout: 20000 }).should('not.eq', '/admin/health');
    });
  });
});
