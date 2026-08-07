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

describe('PlanFeature e2e test', () => {
  const planFeaturePageUrl = '/plan-feature';
  let username: string;
  let password: string;
  const planFeatureSample = { label: 'when instead evenly', position: 16850 };

  let planFeature;
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
    // create an instance at the required relationship entity:
    cy.authenticatedRequest({
      method: 'POST',
      url: '/api/service-plans',
      body: {
        name: 'once',
        tier: 'PLUS',
        tierLabel: 'gadzooks editor mmm',
        monthlyPrice: 8542.3,
        currency: 'clo',
        summary: 'likewise ownership scale',
        featured: false,
        subscriberCount: 4672,
      },
    }).then(({ body }) => {
      servicePlan = body;
    });
  });

  beforeEach(() => {
    cy.intercept('GET', '/api/plan-features+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/api/plan-features').as('postEntityRequest');
    cy.intercept('DELETE', '/api/plan-features/*').as('deleteEntityRequest');
  });

  beforeEach(() => {
    // Simulate relationships api for better performance and reproducibility.
    cy.intercept('GET', '/api/service-plans', {
      statusCode: 200,
      body: [servicePlan],
    });
  });

  afterEach(() => {
    if (planFeature) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/api/plan-features/${planFeature.id}`,
      }).then(() => {
        planFeature = undefined;
      });
    }
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

  it('PlanFeatures menu should load PlanFeatures page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('plan-feature');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response?.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('PlanFeature').should('exist');
    cy.location('pathname').should('eq', planFeaturePageUrl);
  });

  describe('PlanFeature page', () => {
    it('should have translated page title', () => {
      cy.visit(planFeaturePageUrl);
      cy.getEntityHeading('PlanFeature').should('not.contain', 'hcAdminApp.cataloguePlanFeature.home.title');
    });

    describe('create button click', () => {
      beforeEach(() => {
        cy.visit(planFeaturePageUrl);
        cy.wait('@entitiesRequest');
      });

      it('should load create PlanFeature page', () => {
        cy.get(entityCreateButtonSelector).click();
        cy.location('pathname').should('eq', `${planFeaturePageUrl}/new`);
        cy.getEntityCreateUpdateHeading('PlanFeature');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', planFeaturePageUrl);
      });
    });

    describe('with existing value', () => {
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/api/plan-features',
          body: {
            ...planFeatureSample,
            plan: servicePlan,
          },
        }).then(({ body }) => {
          planFeature = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/api/plan-features+(?*|)',
              times: 1,
            },
            {
              statusCode: 200,
              body: [planFeature],
            },
          ).as('entitiesRequestInternal');
        });

        cy.visit(planFeaturePageUrl);

        cy.wait('@entitiesRequestInternal');
      });

      it('detail button click should load details PlanFeature page', () => {
        cy.get(entityDetailsButtonSelector).first().click();
        cy.getEntityDetailsHeading('planFeature');
        cy.get(entityDetailsBackButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', planFeaturePageUrl);
      });

      it('edit button click should load edit PlanFeature page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('PlanFeature');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', planFeaturePageUrl);
      });

      it('edit button click should load edit PlanFeature page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('PlanFeature');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', planFeaturePageUrl);
      });

      it('last delete button click should delete instance of PlanFeature', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('planFeature').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', planFeaturePageUrl);

        planFeature = undefined;
      });
    });
  });

  describe('new PlanFeature page', () => {
    beforeEach(() => {
      cy.visit(planFeaturePageUrl);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('PlanFeature');
    });

    it('should create an instance of PlanFeature', () => {
      cy.get(`[data-cy="label"]`).type('vastly acidic indeed');
      cy.get(`[data-cy="label"]`).should('have.value', 'vastly acidic indeed');

      cy.get(`[data-cy="position"]`).type('541');
      cy.get(`[data-cy="position"]`).should('have.value', '541');

      cy.get(`[data-cy="plan"]`).select(1);

      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(201);
        planFeature = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(200);
      });
      cy.location('pathname').should('eq', planFeaturePageUrl);
    });
  });
});
