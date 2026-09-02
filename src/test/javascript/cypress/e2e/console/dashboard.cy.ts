/**
 * Read the figures the screen is supposed to be showing, straight from the endpoint it reads.
 *
 * <p>The two cases below asserted the literals `116`, `24` and `80%` until 2026-09-02. Those came
 * from the in-browser mock deleted on 2026-08-08 — this file was last touched the day before that —
 * and against a real backend the seeded network holds 12 patients, so both cases failed. They were
 * found on the quality stack rather than by CI, because Cypress runs in neither workflow.
 *
 * <p>**They are not fixed by substituting today's numbers.** A literal here is a copy of the seed
 * fixture, and the fixture moves — it went from 215 records to 1189 to 1199 over three weeks, and
 * nothing reports that a spec has drifted from it. Deriving the expectation from the endpoint is
 * what makes these cases survive the next fixture change, and it is the same rule the api applies to
 * `PaginationIT` (discover the paths, never enumerate them).
 *
 * <p>What is deliberately still asserted by hand is the *relationship* — `network` differing from
 * `loaded` — because that is the claim the second case's title makes and no fixture can supply it.
 */
interface DashboardFigures {
  network: { patients: number; professionals: number; vendors: number };
  loaded: { patients: number; professionals: number; vendors: number };
  unreadMessages: number;
  roster: { coverPercent: number };
}

const metrics = (): Cypress.Chainable<DashboardFigures> =>
  cy.window().then(win => {
    const stored =
      win.sessionStorage.getItem(Cypress.expose('jwtStorageName')) ?? win.localStorage.getItem(Cypress.expose('jwtStorageName'));
    // `.request<T>()` rather than `.its('body')` — the latter is `Chainable<any>`, and an `any`
    // here would silently un-type every assertion below, which is the opposite of the point.
    return cy
      .request<DashboardFigures>({
        url: '/services/hcadminservice/api/dashboard/metrics',
        headers: { Authorization: `Bearer ${JSON.parse(stored!) as string}` },
      })
      .then(response => response.body);
  });

describe('dashboard', () => {
  beforeEach(() => {
    cy.signInAs('ops');
    cy.visit('/dashboard');
  });

  it('should greet with the live figures rather than fixed copy', () => {
    cy.get('.hero').should('contain.text', 'Good morning Efua');

    // The hero interpolates `unreadMessages` and `roster.coverPercent` into one translated
    // sentence, so read both from the endpoint and require the rendered copy to carry them. The
    // old form asserted "3 messages" and "80%" — the second was the number the *mock* served, and
    // the real roster covers 100%.
    metrics().then(m => {
      cy.get('.hero').should('contain.text', `${m.unreadMessages}`);
      cy.get('.hero').should('contain.text', `${m.roster.coverPercent}%`);
    });
  });

  it('should report network totals, not the size of the loaded extract', () => {
    metrics().then(m => {
      // The claim in the title: these tiles show the whole network, not how many rows the
      // directories happen to hold. Assert the difference is real before asserting the values,
      // because if the fixture ever made them equal both tiles would pass while showing the wrong
      // figure — which is precisely the bug this case was written for.
      expect(m.network.patients, 'the fixture still distinguishes network from loaded').to.be.greaterThan(m.loaded.patients);

      cy.get('.stat').eq(0).should('contain.text', `${m.network.patients}`);
      cy.get('.stat').eq(1).should('contain.text', `${m.network.professionals}`);
    });
  });

  it('should give every KPI tile a sparkline', () => {
    cy.get('.stat').should('have.length', 4);
    cy.get('abf-sparkline canvas').should('have.length', 4);
  });

  it('should navigate from a KPI tile to its module', () => {
    cy.get('.stat').eq(2).click();
    cy.location('pathname').should('eq', '/message-desk');
  });

  it('should render three charts, each with a working table view', () => {
    cy.get('abf-chart-card').should('have.length', 3);

    cy.get('abf-chart-card').each($card => {
      cy.wrap($card).find('.viz-toggle button').contains('Table').click();
      cy.wrap($card).find('table.viz-tbl').should('be.visible');

      cy.wrap($card).find('.viz-toggle button').contains('Chart').click();
      cy.wrap($card).find('svg.viz-figure').should('exist');
    });
  });

  it('should list the accounts waiting for approval', () => {
    // Two patients, two professionals and one vendor are PENDING.
    cy.get('[data-cy="approvals"]').find('.lrow').should('have.length', 5);
    cy.get('[data-cy="approvals"]').should('contain.text', 'Beatrice Sarsah');
  });

  it('should link a desk row through to its thread', () => {
    cy.get('[data-cy="latestMessages"]').find('.lrow').should('have.length', 4);
    cy.get('[data-cy="latestMessages"]').find('.lrow').first().click();
    cy.location('pathname').should('match', /\/message-desk\/[\w-]+$/);
  });
});
