import { entityDetailsBackButtonSelector, entityDetailsButtonSelector, entityTableSelector } from '../../support/entity';

describe('PlatformService e2e test', () => {
  const platformServicePageUrl = '/platform-service';
  let username: string;
  let password: string;

  let platformService;

  before(() => {
    cy.credentials().then(credentials => {
      ({ username, password } = credentials);
    });
  });

  beforeEach(() => {
    cy.login(username, password);
  });

  beforeEach(() => {
    cy.intercept('GET', '/api/platform-services+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/api/platform-services').as('postEntityRequest');
    cy.intercept('DELETE', '/api/platform-services/*').as('deleteEntityRequest');
  });

  afterEach(() => {
    if (platformService) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/api/platform-services/${platformService.id}`,
      }).then(() => {
        platformService = undefined;
      });
    }
  });

  it('PlatformServices menu should load PlatformServices page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('platform-service');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response?.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('PlatformService').should('exist');
    cy.location('pathname').should('eq', platformServicePageUrl);
  });

  describe('PlatformService page', () => {
    it('should have translated page title', () => {
      cy.visit(platformServicePageUrl);
      cy.getEntityHeading('PlatformService').should('not.contain', 'hcAdminApp.platformPlatformService.home.title');
    });

    describe('with existing value', () => {
      beforeEach(function () {
        cy.visit(platformServicePageUrl);

        cy.wait('@entitiesRequest').then(({ response }) => {
          if (response?.body.length === 0) {
            this.skip();
          }
        });
      });

      it('detail button click should load details PlatformService page', () => {
        cy.get(entityDetailsButtonSelector).first().click();
        cy.getEntityDetailsHeading('platformService');
        cy.get(entityDetailsBackButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', platformServicePageUrl);
      });
    });
  });
});
