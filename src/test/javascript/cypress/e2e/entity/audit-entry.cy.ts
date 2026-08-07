import { entityDetailsBackButtonSelector, entityDetailsButtonSelector, entityTableSelector } from '../../support/entity';

describe('AuditEntry e2e test', () => {
  const auditEntryPageUrl = '/audit-entry';
  let username: string;
  let password: string;

  let auditEntry;

  before(() => {
    cy.credentials().then(credentials => {
      ({ username, password } = credentials);
    });
  });

  beforeEach(() => {
    cy.login(username, password);
  });

  beforeEach(() => {
    cy.intercept('GET', '/api/audit-entries+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/api/audit-entries').as('postEntityRequest');
    cy.intercept('DELETE', '/api/audit-entries/*').as('deleteEntityRequest');
  });

  afterEach(() => {
    if (auditEntry) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/api/audit-entries/${auditEntry.id}`,
      }).then(() => {
        auditEntry = undefined;
      });
    }
  });

  it('AuditEntries menu should load AuditEntries page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('audit-entry');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response?.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('AuditEntry').should('exist');
    cy.location('pathname').should('eq', auditEntryPageUrl);
  });

  describe('AuditEntry page', () => {
    it('should have translated page title', () => {
      cy.visit(auditEntryPageUrl);
      cy.getEntityHeading('AuditEntry').should('not.contain', 'hcAdminApp.platformAuditEntry.home.title');
    });

    describe('with existing value', () => {
      beforeEach(function () {
        cy.visit(auditEntryPageUrl);

        cy.wait('@entitiesRequest').then(({ response }) => {
          if (response?.body.length === 0) {
            this.skip();
          }
        });
      });

      it('detail button click should load details AuditEntry page', () => {
        cy.get(entityDetailsButtonSelector).first().click();
        cy.getEntityDetailsHeading('auditEntry');
        cy.get(entityDetailsBackButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', auditEntryPageUrl);
      });
    });
  });
});
