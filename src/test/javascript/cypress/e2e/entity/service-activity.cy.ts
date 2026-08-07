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

describe('ServiceActivity e2e test', () => {
  const serviceActivityPageUrl = '/service-activity';
  let username: string;
  let password: string;
  const serviceActivitySample = { name: 'consequently why outside', unit: 'though super ouch', unitPrice: 31151.95, published: true };

  let serviceActivity;
  let category;

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
      url: '/api/categories',
      body: { name: 'politely so waltz', description: 'or couch ouch', iconKey: 'boo' },
    }).then(({ body }) => {
      category = body;
    });
  });

  beforeEach(() => {
    cy.intercept('GET', '/api/service-activities+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/api/service-activities').as('postEntityRequest');
    cy.intercept('DELETE', '/api/service-activities/*').as('deleteEntityRequest');
  });

  beforeEach(() => {
    // Simulate relationships api for better performance and reproducibility.
    cy.intercept('GET', '/api/categories', {
      statusCode: 200,
      body: [category],
    });
  });

  afterEach(() => {
    if (serviceActivity) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/api/service-activities/${serviceActivity.id}`,
      }).then(() => {
        serviceActivity = undefined;
      });
    }
  });

  afterEach(() => {
    if (category) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/api/categories/${category.id}`,
      }).then(() => {
        category = undefined;
      });
    }
  });

  it('ServiceActivities menu should load ServiceActivities page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('service-activity');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response?.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('ServiceActivity').should('exist');
    cy.location('pathname').should('eq', serviceActivityPageUrl);
  });

  describe('ServiceActivity page', () => {
    it('should have translated page title', () => {
      cy.visit(serviceActivityPageUrl);
      cy.getEntityHeading('ServiceActivity').should('not.contain', 'hcAdminApp.catalogueServiceActivity.home.title');
    });

    describe('create button click', () => {
      beforeEach(() => {
        cy.visit(serviceActivityPageUrl);
        cy.wait('@entitiesRequest');
      });

      it('should load create ServiceActivity page', () => {
        cy.get(entityCreateButtonSelector).click();
        cy.location('pathname').should('eq', `${serviceActivityPageUrl}/new`);
        cy.getEntityCreateUpdateHeading('ServiceActivity');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', serviceActivityPageUrl);
      });
    });

    describe('with existing value', () => {
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/api/service-activities',
          body: {
            ...serviceActivitySample,
            category,
          },
        }).then(({ body }) => {
          serviceActivity = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/api/service-activities+(?*|)',
              times: 1,
            },
            {
              statusCode: 200,
              headers: {
                link: '<http://localhost/api/service-activities?page=0&size=20>; rel="last",<http://localhost/api/service-activities?page=0&size=20>; rel="first"',
              },
              body: [serviceActivity],
            },
          ).as('entitiesRequestInternal');
        });

        cy.visit(serviceActivityPageUrl);

        cy.wait('@entitiesRequestInternal');
      });

      it('detail button click should load details ServiceActivity page', () => {
        cy.get(entityDetailsButtonSelector).first().click();
        cy.getEntityDetailsHeading('serviceActivity');
        cy.get(entityDetailsBackButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', serviceActivityPageUrl);
      });

      it('edit button click should load edit ServiceActivity page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('ServiceActivity');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', serviceActivityPageUrl);
      });

      it('edit button click should load edit ServiceActivity page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('ServiceActivity');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', serviceActivityPageUrl);
      });

      it('last delete button click should delete instance of ServiceActivity', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('serviceActivity').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', serviceActivityPageUrl);

        serviceActivity = undefined;
      });
    });
  });

  describe('new ServiceActivity page', () => {
    beforeEach(() => {
      cy.visit(serviceActivityPageUrl);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('ServiceActivity');
    });

    it('should create an instance of ServiceActivity', () => {
      cy.get(`[data-cy="name"]`).type('gift');
      cy.get(`[data-cy="name"]`).should('have.value', 'gift');

      cy.get(`[data-cy="unit"]`).type('accessorise wherever');
      cy.get(`[data-cy="unit"]`).should('have.value', 'accessorise wherever');

      cy.get(`[data-cy="unitPrice"]`).type('7289.31');
      cy.get(`[data-cy="unitPrice"]`).should('have.value', '7289.31');

      cy.get(`[data-cy="duration"]`).type('inasmuch');
      cy.get(`[data-cy="duration"]`).should('have.value', 'inasmuch');

      cy.get(`[data-cy="published"]`).should('not.be.checked');
      cy.get(`[data-cy="published"]`).click();
      cy.get(`[data-cy="published"]`).should('be.checked');

      cy.get(`[data-cy="category"]`).select(1);

      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(201);
        serviceActivity = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(200);
      });
      cy.location('pathname').should('eq', serviceActivityPageUrl);
    });
  });
});
