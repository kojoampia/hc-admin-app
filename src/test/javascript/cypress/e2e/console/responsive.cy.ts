import { menuToggleSelector, sidebarSelector, tabbarSelector, topbarSelector } from '../../support/console';

describe('responsive', () => {
  describe('on a phone', () => {
    beforeEach(() => {
      cy.viewport(400, 860);
      cy.signInAs('ops');
    });

    it('should collapse the sidebar out of the flow', () => {
      // Still in the DOM — it becomes an off-canvas drawer, not a deletion.
      cy.get(sidebarSelector).should('exist').should('not.be.visible');
      cy.get(menuToggleSelector).should('be.visible');
    });

    it('should show the five-item tab bar', () => {
      cy.get(tabbarSelector).should('be.visible');
      cy.get(tabbarSelector).find('a').should('have.length', 5);
    });

    it('should open and close the drawer', () => {
      cy.get(menuToggleSelector).click();
      cy.get(sidebarSelector).should('be.visible');

      // The scrim closes it.
      cy.get('.abf-scrim').click({ force: true });
      cy.get(sidebarSelector).should('not.be.visible');
    });

    it('should close the drawer after following a link', () => {
      cy.get(menuToggleSelector).click();
      cy.get(sidebarSelector).find('a[href="/task-board"]').click();

      cy.location('pathname').should('eq', '/task-board');
      cy.get(sidebarSelector).should('not.be.visible');
    });

    it('should navigate from the tab bar', () => {
      cy.get(tabbarSelector).find('a[href="/duty-roster"]').click();
      cy.location('pathname').should('eq', '/duty-roster');
    });

    it('should scroll the roster horizontally rather than squeezing seven days in', () => {
      cy.visit('/duty-roster');
      cy.get('[data-cy="rosterGrid"]').should('exist');
      cy.get('.tbl-wrap').then($wrap => {
        const element = $wrap[0];
        expect(element.scrollWidth).to.be.greaterThan(element.clientWidth);
      });
    });

    it('should keep the topbar pinned while the page scrolls', () => {
      // The topbar is position:sticky. Its component host must not box it in
      // — a host as tall as the header sticks for zero pixels.
      cy.scrollTo(0, 400);
      cy.get(topbarSelector).then($topbar => {
        expect(Math.round($topbar[0].getBoundingClientRect().top)).to.equal(0);
      });
    });

    it('should not scroll the page body sideways', () => {
      cy.document().then(document => {
        expect(document.documentElement.scrollWidth).to.be.at.most(document.documentElement.clientWidth + 1);
      });
    });
  });

  describe('on a desktop', () => {
    beforeEach(() => {
      cy.viewport(1440, 900);
      cy.signInAs('ops');
    });

    it('should show the sidebar and hide the tab bar', () => {
      cy.get(sidebarSelector).should('be.visible');
      cy.get(tabbarSelector).should('not.be.visible');
      cy.get(menuToggleSelector).should('not.be.visible');
    });

    it('should keep the topbar pinned while the page scrolls', () => {
      cy.scrollTo(0, 400);
      cy.get(topbarSelector).then($topbar => {
        expect(Math.round($topbar[0].getBoundingClientRect().top)).to.equal(0);
      });
    });

    it('should start a fresh navigation at the top of the page', () => {
      cy.scrollTo(0, 500);
      cy.get('[data-cy="sidebarNav"]').find('a[href="/task-board"]').click();
      cy.window().its('scrollY').should('equal', 0);
    });

    it('should give the sidebar its own column rather than overlaying the content', () => {
      cy.get(sidebarSelector).then($sidebar => {
        const sidebar = $sidebar[0].getBoundingClientRect();
        cy.get('.abf-content').then($content => {
          const content = $content[0].getBoundingClientRect();
          expect(content.left).to.be.at.least(sidebar.right - 1);
        });
      });
    });
  });
});
