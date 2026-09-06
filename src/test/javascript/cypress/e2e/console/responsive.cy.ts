// e2e-fixture: read-only
// Resizes, scrolls and follows links.

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

    /**
     * FIXED AND UN-SKIPPED 2026-09-06 — backlog item 34(a).
     *
     * <p>Its first ever run, on 2026-09-05, failed: at 400x860 the dashboard's `documentElement`
     * measured `scrollWidth` 475 against `clientWidth` 391, so the page really did scroll sideways
     * on a phone. It was `it.skip` for one day, reported as pending on every run, because the cause
     * was a layout decision rather than a bad expectation — and an assertion relaxed to pass against
     * the defect it was written to catch is exactly what `dashboard.cy.ts`'s `116` was.
     *
     * <p><b>What was 457 wide.</b> Not a width anywhere — a line of text refusing to wrap. The
     * `.abf-grid.abf-g-2` DOES collapse to one column at this width and its box is 354, but `1fr` is
     * `minmax(auto, 1fr)` and `auto` as a track minimum is the ITEM's min-content. The "Latest at
     * the desk" item measured 457, its `.card` 457, its widest `.lrow` 455. `.lrow .grow` already
     * had `min-width: 0` and its `.tl`/`.st` already had `.trunc` — `overflow: hidden` plus
     * `white-space: nowrap` — which zeroes the automatic minimum size and NOT the min-content. A
     * nowrap text run's min-content is the whole untruncated subject line, so the row truncated
     * correctly at every width it was given while telling the track it needed 455.
     *
     * <p>The fix is one declaration, `.abf-grid > * { min-width: 0 }` in `_console-components.scss`,
     * with the reasoning beside it. Nothing about the row changed; the track stopped asking.
     *
     * <p>Kept as a whole-document assertion rather than a measurement of the grid: what a phone user
     * experiences is the page sliding, and any future element can cause it. The `+ 1` absorbs
     * sub-pixel rounding, not a defect — the measured gap was 84px.
     */
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
