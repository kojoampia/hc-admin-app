import {
  entityConfirmDeleteButtonSelector,
  entityCreateButtonSelector,
  entityCreateCancelButtonSelector,
  entityCreateSaveButtonSelector,
  entityDeleteButtonSelector,
  entityDetailsBackButtonSelector,
  entityDetailsButtonSelector,
  entityEditButtonSelector,
  entityTableSelector,
} from '../../support/entity';

describe('Hub e2e test', () => {
  const hubPageUrl = '/hub';
  let username: string;
  let password: string;
  const hubSample = { name: 'wilderness yippee soon' };

  let hub;

  before(() => {
    cy.credentials().then(credentials => {
      ({ username, password } = credentials);
    });
  });

  beforeEach(() => {
    cy.login(username, password);
  });

  beforeEach(() => {
    cy.intercept('GET', '/api/hubs+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/api/hubs').as('postEntityRequest');
    cy.intercept('DELETE', '/api/hubs/*').as('deleteEntityRequest');
  });

  afterEach(() => {
    if (hub) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/api/hubs/${hub.id}`,
      }).then(() => {
        hub = undefined;
      });
    }
  });

  it('Hubs menu should load Hubs page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('hub');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response?.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('Hub').should('exist');
    cy.location('pathname').should('eq', hubPageUrl);
  });

  describe('Hub page', () => {
    it('should have translated page title', () => {
      cy.visit(hubPageUrl);
      cy.getEntityHeading('Hub').should('not.contain', 'hcAdminApp.platformHub.home.title');
    });

    describe('create button click', () => {
      beforeEach(() => {
        cy.visit(hubPageUrl);
        cy.wait('@entitiesRequest');
      });

      it('should load create Hub page', () => {
        cy.get(entityCreateButtonSelector).click();
        cy.location('pathname').should('eq', `${hubPageUrl}/new`);
        cy.getEntityCreateUpdateHeading('Hub');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', hubPageUrl);
      });
    });

    describe('with existing value', () => {
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/api/hubs',
          body: hubSample,
        }).then(({ body }) => {
          hub = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/api/hubs+(?*|)',
              times: 1,
            },
            {
              statusCode: 200,
              body: [hub],
            },
          ).as('entitiesRequestInternal');
        });

        cy.visit(hubPageUrl);

        cy.wait('@entitiesRequestInternal');
      });

      it('detail button click should load details Hub page', () => {
        cy.get(entityDetailsButtonSelector).first().click();
        cy.getEntityDetailsHeading('hub');
        cy.get(entityDetailsBackButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', hubPageUrl);
      });

      it('edit button click should load edit Hub page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Hub');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', hubPageUrl);
      });

      it('edit button click should load edit Hub page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Hub');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', hubPageUrl);
      });

      it('last delete button click should delete instance of Hub', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('hub').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', hubPageUrl);

        hub = undefined;
      });
    });
  });

  describe('new Hub page', () => {
    beforeEach(() => {
      cy.visit(hubPageUrl);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('Hub');
    });

    it('should create an instance of Hub', () => {
      cy.get(`[data-cy="name"]`).type('once');
      cy.get(`[data-cy="name"]`).should('have.value', 'once');

      cy.get(`[data-cy="staffCount"]`).type('29021');
      cy.get(`[data-cy="staffCount"]`).should('have.value', '29021');

      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(201);
        hub = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(200);
      });
      cy.location('pathname').should('eq', hubPageUrl);
    });
  });
});
