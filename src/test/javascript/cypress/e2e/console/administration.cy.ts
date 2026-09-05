// e2e-fixture: read-only
// Only just. `should change a logger level and keep it` writes to the gateway's /management/loggers
// and is the single reason this file was nearly in the other set — a level raised on the quality
// stack stays raised, and the next person to wonder why the gateway stopped logging has nothing
// pointing here. It puts the level back through the same screen instead, which is cheaper than
// losing five admin screens from the gate and makes the case prove the control works both ways.

import { breadcrumbSelector, pageTitleSelector, sidebarNavSelector } from '../../support/console';

/**
 * JHipster's stock admin screens, adopted into the console.
 *
 * The components are untouched generator output; what is asserted here is
 * that they are reachable, correctly framed by the shell, actually fed with
 * data, and closed to anyone without ROLE_ADMIN.
 *
 * <p><b>Five of these cases described the in-browser mock and were rewritten on 2026-09-05</b>, the
 * day this suite first ran in a workflow (backlog item 15). They asserted 17 health rows including
 * one named `Vendor Gateway`, `Total: 8` threads, a configuration screen saying "no backend is
 * running", `There are 10 loggers`, and two rows matching `springframework`. Against a real gateway
 * the figures are 9 components, tens of threads, a live property list, 1311 loggers and 824
 * `springframework` rows — and `care.abofonsa.gateway`, the logger four of them addressed, exists
 * nowhere: this gateway's own package is `net.jojoaddison`. Every one of them was fiction of exactly
 * the shape `dashboard.cy.ts`'s `116` was, and none could fail until something ran them.
 *
 * <p>So the replacements <b>derive what they expect from the endpoint the screen reads</b>, the same
 * rule `dashboard.cy.ts` states and `PaginationIT` applies in the api. A literal here is a copy of
 * whatever stack it was written against, and this suite is meant to run against three: the CI stack
 * (no Consul, no broker, no mail sender), the quality stack (all three) and a developer's own.
 */
const ADMIN_ROUTES = [
  { route: 'admin/health', title: 'Health Checks' },
  { route: 'admin/metrics', title: 'Application Metrics' },
  { route: 'admin/configuration', title: 'Configuration' },
  { route: 'admin/logs', title: 'Logs' },
];

/**
 * The gateway's own actuator, read with the signed-in user's token.
 *
 * <p>Local rather than a shared command, matching `dashboard.cy.ts`'s `metrics()`: `cy.adminApi` in
 * `support/console.ts` is prefixed with the admin service's path and these four screens read the
 * gateway directly. The token is taken from the application window, which is where
 * `StateStorageService` puts it.
 */
const management = <T>(path: string): Cypress.Chainable<T> =>
  cy.window({ log: false }).then(win => {
    const key = Cypress.expose('jwtStorageName');
    const raw = win.sessionStorage.getItem(key) ?? win.localStorage.getItem(key);
    return cy.request<T>({ url: path, headers: { Authorization: `Bearer ${JSON.parse(raw!) as string}` } }).then(response => response.body);
  });

interface HealthPayload {
  components: Record<string, { status: string }>;
}

interface LoggersPayload {
  loggers: Record<string, { effectiveLevel: string }>;
}

/**
 * The logger these cases drive: this gateway's own root package, which `application-dev.yml` puts at
 * DEBUG. It exists on every stack that runs this code, which `care.abofonsa.gateway` — the name four
 * of these cases used to use — did not exist on any of.
 */
const LOGGER = 'net.jojoaddison';

/** The row for one logger, matched on the whole name so `net.jojoaddison.config` cannot answer for it. */
const loggerRow = (name: string): Cypress.Chainable<JQuery<HTMLElement>> =>
  cy.contains('tbody tr td small', new RegExp(`^${name.replace(/\./g, '\\.')}$`)).closest('tr');

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

    /**
     * This screen shows the GATEWAY's actuator health, not the console's platform catalogue — which
     * is what the previous version of this case had confused it with, expecting seventeen rows
     * including a `Vendor Gateway`. Those thirteen named services are `PlatformService` documents in
     * the admin database and are rendered by `/platform-health`; `platform-health.cy.ts` asserts them.
     *
     * <p>The row count is derived because the component list is a property of the deployment, not of
     * the code: Consul adds `consul`, a configured mail sender adds `mail`, and the CI stack runs
     * neither. Any literal here would be right on exactly one stack.
     */
    it("should list the gateway's own health components, labelled rather than keyed", () => {
      cy.openConsoleRoute('admin/health');

      management<HealthPayload>('/management/health').then(health => {
        const components = Object.keys(health.components);
        // Non-vacuous: an empty payload would make the row assertion trivially true, and the likeliest
        // reason for one is that the request was refused rather than that the gateway has no parts.
        expect(components, 'the gateway reports components at all').to.have.length.greaterThan(0);
        cy.get('#healthCheck tbody tr').should('have.length', components.length);

        // Labelled through i18n `health.indicator.*`, which is the claim in the title: the key is
        // `mongo` and the screen must say MongoDB. The status is read from the same payload rather
        // than asserted as UP, so this case reports a real DOWN instead of hiding it.
        cy.contains('#healthCheck tbody tr', 'MongoDB').should('contain.text', health.components.mongo.status);
        cy.contains('#healthCheck tbody tr', 'Disk space').should('exist');
      });
    });

    /**
     * `Total: 8` was the mock's thread count and is the reason this case is here at all. A real JVM
     * serving this stack runs tens of threads, and the exact number is different on every run — so
     * what is asserted is that the figure is live and internally consistent with the bars above it.
     */
    it('should render live JVM metrics rather than an empty shell', () => {
      cy.openConsoleRoute('admin/metrics');

      cy.contains('JVM Metrics').should('be.visible');
      cy.get('.progress-bar').should('have.length.greaterThan', 3);

      cy.contains('div', /^Total: \d+$/)
        .invoke('text')
        .then(text => {
          const total = Number(text.replace('Total:', '').trim());
          // Four is the floor rather than a measurement: any JVM that has answered an HTTP request
          // is past it, and a stubbed or zeroed metrics payload is not.
          expect(total, 'the thread total is a live figure').to.be.greaterThan(4);
        });
    });

    /**
     * "no backend is running" was the mock's copy for a console that could not reach one. There is a
     * backend now and this screen lists its real property beans, so the case asserts that instead.
     *
     * <p>`spring.cloud.gateway.server.webflux` is the prefix worth naming: routing properties moved
     * there in the 2025.x train and anything left under the old root still binds while nothing reads
     * it, which is the estate's canonical silent misconfiguration. Seeing the migrated prefix on the
     * screen is weak evidence, but it is evidence, and the prefix costs nothing to assert.
     */
    it("should list this gateway's own configuration properties", () => {
      cy.openConsoleRoute('admin/configuration');

      const springTable = (): Cypress.Chainable<JQuery<HTMLElement>> => cy.get('table[aria-describedby="spring-configuration"] tbody tr');

      springTable().should('have.length.greaterThan', 10);
      cy.contains('table[aria-describedby="spring-configuration"] tbody tr', 'spring.cloud.gateway.server.webflux').should('exist');

      // The filter narrows by prefix, and every surviving row has to match it — a filter that
      // returned rows regardless would satisfy a length assertion on its own.
      cy.get('#configuration-filter').type('jhipster');
      springTable().should('have.length.greaterThan', 0);
      springTable().each($row => {
        expect($row.find('td').first().text().trim()).to.contain('jhipster');
      });
    });

    /**
     * The one case in this file that writes, and it puts the level back.
     *
     * <p>Restoring is what keeps this file in the `read-only` spec set and therefore in CI — see the
     * marker at the top. A logger raised to ERROR persists for the life of the gateway process, so
     * on the quality stack it would outlive the run with nothing recording that a test did it; the
     * symptom would be a gateway that has quietly stopped logging, days later, on a box shared with
     * two other stacks.
     *
     * <p>The restore also carries an assertion, so it is not merely tidying: it proves the control
     * works in both directions, which the one-way version did not.
     *
     * <p><b>Retries are what made the first version of this unsound, and the whole shape below is
     * the answer to them.</b> `cypress.config.ts` sets `retries: 2`. The level used to be captured
     * from the screen inside the case, so an attempt that failed anywhere AFTER the ERROR click —
     * the navigate-away-and-back being the likeliest — left the gateway at ERROR and left nothing
     * to put it back. The next attempt then captured `ERROR` as the level "before", passed the
     * regex guard, clicked ERROR on a row that was already ERROR, asserted that the `btn-danger`
     * button said ERROR (true before the click as well as after), "restored" ERROR, and **reported
     * green having proved nothing** — while the gateway stayed raised, on quality, with nothing
     * pointing at this spec.
     *
     * <p>Three things close that, and each is load-bearing:
     *
     * <ul>
     *   <li>the level is captured <b>once</b>, memoised across attempts, so a retry restores the
     *       value the run started at rather than the wreckage of the previous attempt;
     *   <li>it is read from <b>`/management/loggers`</b> rather than from the table. The screen's
     *       rendering is what the case is testing, and a capture that goes through the thing under
     *       test cannot witness it; `effectiveLevel` is the gateway's own answer;
     *   <li>the case <b>asserts the level is not already ERROR</b> before clicking ERROR. That is
     *       the assertion the vacuous pass could not survive: it turns a dirty stack into a red run
     *       that names the reason, instead of a green one that measured nothing.
     * </ul>
     *
     * <p>And the restore is an `afterEach` rather than the tail of the case, because a case only
     * restores if it reaches its own last line. Cypress runs `afterEach` after every attempt,
     * including failed ones, so the gateway is put back whether this passes, fails or is retried —
     * which is what the `read-only` marker at the top of the file actually promises.
     *
     * <p>The level is READ rather than assumed to be INFO for the reason it always was: an assumed
     * INFO would restore the wrong value on a stack whose logging had been tuned, and would look
     * correct doing it.
     */
    describe('the logger level control', () => {
      /**
       * The level this gateway was at when the run began — captured on the first attempt only.
       *
       * <p>Module scope rather than an alias precisely because aliases are cleared between attempts,
       * which is how the vacuous pass above was possible.
       */
      let originalLevel: string | undefined;

      /** The gateway's own answer for `LOGGER`, not the table's rendering of it. */
      const effectiveLevel = (): Cypress.Chainable<string> =>
        management<LoggersPayload>('/management/loggers').then(({ loggers }) => loggers[LOGGER].effectiveLevel);

      afterEach(() => {
        if (originalLevel === undefined) {
          return;
        }
        // Straight at the actuator, not through the screen: a failed attempt can leave the browser
        // anywhere, and a restore that needs a particular page rendered is a restore that does not
        // happen exactly when it is needed.
        cy.window({ log: false }).then(win => {
          const key = Cypress.expose('jwtStorageName');
          const raw = win.sessionStorage.getItem(key) ?? win.localStorage.getItem(key);
          cy.request({
            method: 'POST',
            url: `/management/loggers/${LOGGER}`,
            body: { configuredLevel: originalLevel },
            headers: { Authorization: `Bearer ${JSON.parse(raw!) as string}` },
          });
        });
      });

      it('should change a logger level and keep it', () => {
        cy.openConsoleRoute('admin/logs');

        // Derived, not transcribed: this said `There are 10 loggers`, which was the mock's number.
        // A real gateway reports over a thousand and the figure moves with every dependency bump.
        //
        // Bracketed rather than compared for equality, and that is not slack. A JVM registers a
        // logger name the first time something asks for one, so the count only ever grows within a
        // process — and this asserted the screen's figure against a SECOND fetch made after it, so
        // any class loaded in between (an actuator endpoint the screen itself hit, a lazy Spring
        // bean) put the two one apart and failed a case about nothing. Fetching either side of the
        // screen turns that race into the assertion: the screen's number is a real reading taken
        // somewhere between them.
        management<LoggersPayload>('/management/loggers').then(({ loggers }) => {
          const before = Object.keys(loggers).length;
          cy.contains('p', /^There are \d+ loggers/).then($p => {
            const shown = Number(/There are (\d+) loggers/.exec($p.text())![1]);
            management<LoggersPayload>('/management/loggers').then(after => {
              const now = Object.keys(after.loggers).length;
              expect(shown, `the screen's logger count is a real reading (${before}..${now})`).to.be.within(before, now);
            });
          });
        });

        effectiveLevel().then(level => {
          originalLevel ??= level;

          // The guard that the vacuous pass could not have survived. It also covers the ordinary
          // case of a stack somebody has genuinely left at ERROR: this case cannot demonstrate that
          // a click raised a level that was already raised, and says so rather than claiming it.
          expect(level, `${LOGGER} is not already at ERROR, so raising it to ERROR proves something`).to.not.equal('ERROR');
          expect(level, 'a level was captured before the change').to.match(/^(TRACE|DEBUG|INFO|WARN|ERROR|OFF)$/);

          // Filter first. The unfiltered table is ~1300 rows of six buttons each, and every
          // `cy.contains` below would walk all of it; this also makes the row match unambiguous.
          cy.get('#logs-filter').type(LOGGER);
          // The screen agrees with the actuator before anything is clicked. Without this the case
          // would prove the gateway changed and not that the table ever showed the old value.
          loggerRow(LOGGER).find('button:not(.btn-light)').should('contain.text', level);

          loggerRow(LOGGER).contains('button', 'ERROR').click();
          loggerRow(LOGGER).find('button.btn-danger').should('contain.text', 'ERROR');

          // Still set after leaving and coming back in-app.
          cy.openConsoleRoute('dashboard');
          cy.openConsoleRoute('admin/logs');
          cy.get('#logs-filter').type(LOGGER);
          loggerRow(LOGGER).find('button.btn-danger').should('contain.text', 'ERROR');

          // Put it back through the screen, which is what proves the control works in both
          // directions. The `afterEach` above is the safety net, not this.
          loggerRow(LOGGER).contains('button', level).click();
          // `contain.text`, not `have.text`: the template puts the label on its own line inside the
          // button, so the node's text carries surrounding whitespace. No level name is a substring
          // of another, so this is exact enough to mean what it says.
          loggerRow(LOGGER).find('button:not(.btn-light)').should('contain.text', level);
          // And the gateway agrees, which the table alone cannot say.
          effectiveLevel().should('equal', level);
        });
      });
    });

    /**
     * This expected exactly two rows for `springframework`; there are 824. What the filter has to do
     * is narrow the list and keep only matching rows, and both halves are needed — a filter that
     * returned everything passes the first, and one that returned nothing passes the second.
     */
    it('should filter the logger list', () => {
      cy.openConsoleRoute('admin/logs');

      cy.get('tbody tr')
        .its('length')
        .then(unfiltered => {
          cy.get('#logs-filter').type(LOGGER);

          cy.get('tbody tr').should('have.length.greaterThan', 0);
          cy.get('tbody tr').should('have.length.lessThan', unfiltered);
          cy.get('tbody tr td small').each($name => {
            expect($name.text()).to.contain(LOGGER);
          });
        });
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
