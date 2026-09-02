describe('organisation profile', () => {
  beforeEach(() => {
    cy.signInAs('ops');
    cy.visit('/organisation-profile');
  });

  it('should show all five tabs', () => {
    cy.get('[role="tab"]').should('have.length', 5);
    cy.contains('[role="tab"]', 'About').should('have.attr', 'aria-selected', 'true');
  });

  it('should show the organisation record on the About tab', () => {
    cy.contains('Abofonsa BridgeCare Ltd.').should('be.visible');
    cy.contains('CS-2019-0884417').should('be.visible');
    cy.contains('operations@abofonsa.care').should('be.visible');
  });

  it('should show the registered digital address', () => {
    cy.contains('[role="tab"]', 'Address').click();
    cy.contains('GA-184-7723').should('be.visible');
  });

  it('should list the teams with a named supervisor', () => {
    cy.contains('[role="tab"]', 'Team & roles').click();
    cy.get('table tbody tr').should('have.length', 4);
    cy.contains('Clinical review').should('be.visible');
    cy.get('table tbody tr').first().should('not.contain.text', 'MDC/');
  });

  it('should show the seeded audit trail', () => {
    cy.contains('[role="tab"]', 'Audit trail').click();
    cy.get('table tbody tr').should('have.length', 7);
    cy.contains('rotated API credential').should('be.visible');
  });

  it('should show the signed-in account and its real authorities on the Security tab', () => {
    cy.contains('[role="tab"]', 'Security').click();

    // The tab is a read-only `<dl>` over the account the token describes: login, derived role label,
    // and the authority list verbatim. `ops` is the harness administrator, so ROLE_ADMIN is what the
    // gateway seeded it with — and the label beside it is what `roleByAuthorities()` made of that.
    cy.contains('dd', 'ROLE_ADMIN').should('be.visible');
    cy.contains('dd', 'Operations administrator').should('be.visible');
  });

  // Removed 2026-09-02: "should re-render authority-gated controls when the role is switched". It
  // clicked `.opt` "Supervisor (read only)" on the Security tab and then expected the sidebar to
  // read "Supervisor" and the quick-add to disappear. **Neither half can happen.**
  //
  // The switcher itself is gone: `organisation-profile.html`'s `@case ('security')` renders a
  // read-only `<dl>` and nothing clickable, `.opt` appears nowhere in that template, and the option
  // label lives on only as `global.role.sup.label` in i18n. The class comment on
  // `organisation-profile.ts` still advertised the switcher, which is what kept this case looking
  // reasonable; it has been corrected in the same change.
  //
  // And "Supervisor" could not have been reached even with a switcher: no gateway mints
  // ROLE_SUPERVISOR. `AuthoritiesMigration` seeds exactly ROLE_USER / ROLE_ADMIN / ROLE_OPERATOR,
  // `hc-admin-gw-data.json` names no other, and `UserService.updateUser` maps each requested
  // authority through `authorityRepository::findById` — a name with no stored document is silently
  // dropped rather than rejected, so asking for ROLE_SUPERVISOR would return a token without it and
  // the sidebar would still read "Operations administrator" (`login.cy.ts` case 3 records why).
  //
  // What the case was worth asserting — write chrome hidden from a read-only account, and every
  // roster cell disabled — is asserted properly in `duty-roster.cy.ts:153-166`, by signing in as
  // `sup` for real rather than by switching role in-app. It is not re-created here.
});
