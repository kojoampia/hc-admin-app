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

describe('ServicePlan e2e test', () => {
  const servicePlanPageUrl = '/service-plan';
  let username: string;
  let password: string;
  const servicePlanSample = {
    name: 'mockingly before stealthily',
    tier: 'ESSENTIAL',
    monthlyPrice: 19194.47,
    currency: 'at ',
    featured: true,
  };

  let servicePlan;

  before(() => {
    cy.credentials().then(credentials => {
      ({ username, password } = credentials);
    });
  });

  beforeEach(() => {
    cy.login(username, password);
  });

  beforeEach(() => {
    cy.intercept('GET', '/api/service-plans+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/api/service-plans').as('postEntityRequest');
    cy.intercept('DELETE', '/api/service-plans/*').as('deleteEntityRequest');
  });

  afterEach(() => {
    if (servicePlan) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/api/service-plans/${servicePlan.id}`,
      }).then(() => {
        servicePlan = undefined;
      });
    }
  });

  it('ServicePlans menu should load ServicePlans page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('service-plan');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response?.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('ServicePlan').should('exist');
    cy.location('pathname').should('eq', servicePlanPageUrl);
  });

  describe('ServicePlan page', () => {
    it('should have translated page title', () => {
      cy.visit(servicePlanPageUrl);
      cy.getEntityHeading('ServicePlan').should('not.contain', 'hcAdminApp.catalogueServicePlan.home.title');
    });

    describe('create button click', () => {
      beforeEach(() => {
        cy.visit(servicePlanPageUrl);
        cy.wait('@entitiesRequest');
      });

      it('should load create ServicePlan page', () => {
        cy.get(entityCreateButtonSelector).click();
        cy.location('pathname').should('eq', `${servicePlanPageUrl}/new`);
        cy.getEntityCreateUpdateHeading('ServicePlan');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', servicePlanPageUrl);
      });
    });

    describe('with existing value', () => {
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/api/service-plans',
          body: servicePlanSample,
        }).then(({ body }) => {
          servicePlan = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/api/service-plans+(?*|)',
              times: 1,
            },
            {
              statusCode: 200,
              body: [servicePlan],
            },
          ).as('entitiesRequestInternal');
        });

        cy.visit(servicePlanPageUrl);

        cy.wait('@entitiesRequestInternal');
      });

      it('detail button click should load details ServicePlan page', () => {
        cy.get(entityDetailsButtonSelector).first().click();
        cy.getEntityDetailsHeading('servicePlan');
        cy.get(entityDetailsBackButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', servicePlanPageUrl);
      });

      it('edit button click should load edit ServicePlan page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('ServicePlan');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', servicePlanPageUrl);
      });

      it('edit button click should load edit ServicePlan page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('ServicePlan');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', servicePlanPageUrl);
      });

      it('last delete button click should delete instance of ServicePlan', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('servicePlan').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', servicePlanPageUrl);

        servicePlan = undefined;
      });
    });
  });

  describe('new ServicePlan page', () => {
    beforeEach(() => {
      cy.visit(servicePlanPageUrl);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('ServicePlan');
    });

    it('should create an instance of ServicePlan', () => {
      cy.get(`[data-cy="name"]`).type('regulate');
      cy.get(`[data-cy="name"]`).should('have.value', 'regulate');

      cy.get(`[data-cy="tier"]`).select('ESSENTIAL');

      cy.get(`[data-cy="tierLabel"]`).type('condense');
      cy.get(`[data-cy="tierLabel"]`).should('have.value', 'condense');

      cy.get(`[data-cy="monthlyPrice"]`).type('16697.6');
      cy.get(`[data-cy="monthlyPrice"]`).should('have.value', '16697.6');

      cy.get(`[data-cy="currency"]`).type('upw');
      cy.get(`[data-cy="currency"]`).should('have.value', 'upw');

      cy.get(`[data-cy="summary"]`).type('anenst oof rigidly');
      cy.get(`[data-cy="summary"]`).should('have.value', 'anenst oof rigidly');

      cy.get(`[data-cy="featured"]`).should('not.be.checked');
      cy.get(`[data-cy="featured"]`).click();
      cy.get(`[data-cy="featured"]`).should('be.checked');

      cy.get(`[data-cy="subscriberCount"]`).type('29560');
      cy.get(`[data-cy="subscriberCount"]`).should('have.value', '29560');

      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(201);
        servicePlan = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(200);
      });
      cy.location('pathname').should('eq', servicePlanPageUrl);
    });
  });
});
