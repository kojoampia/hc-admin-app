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

describe('CareActivity e2e test', () => {
  const careActivityPageUrl = '/care-activity';
  let username: string;
  let password: string;
  // const careActivitySample = {"name":"uh-huh cone nocturnal","occurredOn":"2023-12-11"};

  let careActivity;
  // let patient;

  before(() => {
    cy.credentials().then(credentials => {
      ({ username, password } = credentials);
    });
  });

  beforeEach(() => {
    cy.login(username, password);
  });

  /* Disabled due to incompatibility
  beforeEach(() => {
    // create an instance at the required relationship entity:
    cy.authenticatedRequest({
      method: 'POST',
      url: '/api/patients',
      body: {"status":"ACTIVE","joinedOn":"2023-12-11","lastActiveOn":"2023-12-11","caseCount":14783},
    }).then(({ body }) => {
      patient = body;
    });
  });
   */

  beforeEach(() => {
    cy.intercept('GET', '/api/care-activities+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/api/care-activities').as('postEntityRequest');
    cy.intercept('DELETE', '/api/care-activities/*').as('deleteEntityRequest');
  });

  /* Disabled due to incompatibility
  beforeEach(() => {
    // Simulate relationships api for better performance and reproducibility.
    cy.intercept('GET', '/api/patients', {
      statusCode: 200,
      body: [patient],
    });

  });
   */

  afterEach(() => {
    if (careActivity) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/api/care-activities/${careActivity.id}`,
      }).then(() => {
        careActivity = undefined;
      });
    }
  });

  /* Disabled due to incompatibility
  afterEach(() => {
    if (patient) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/api/patients/${patient.id}`,
      }).then(() => {
        patient = undefined;
      });
    }
  });
   */

  it('CareActivities menu should load CareActivities page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('care-activity');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response?.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('CareActivity').should('exist');
    cy.location('pathname').should('eq', careActivityPageUrl);
  });

  describe('CareActivity page', () => {
    it('should have translated page title', () => {
      cy.visit(careActivityPageUrl);
      cy.getEntityHeading('CareActivity').should('not.contain', 'hcAdminApp.platformCareActivity.home.title');
    });

    describe('create button click', () => {
      beforeEach(() => {
        cy.visit(careActivityPageUrl);
        cy.wait('@entitiesRequest');
      });

      it('should load create CareActivity page', () => {
        cy.get(entityCreateButtonSelector).click();
        cy.location('pathname').should('eq', `${careActivityPageUrl}/new`);
        cy.getEntityCreateUpdateHeading('CareActivity');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', careActivityPageUrl);
      });
    });

    describe('with existing value', () => {
      /* Disabled due to incompatibility
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/api/care-activities',
          body: {
            ...careActivitySample,
            patient: patient,
          },
        }).then(({ body }) => {
          careActivity = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/api/care-activities+(?*|)',
              times: 1,
            },
            {
              statusCode: 200,
              headers: {
                link: '<http://localhost/api/care-activities?page=0&size=20>; rel="last",<http://localhost/api/care-activities?page=0&size=20>; rel="first"',
              },
              body: [careActivity],
            }
          ).as('entitiesRequestInternal');
        });

        cy.visit(careActivityPageUrl);

        cy.wait('@entitiesRequestInternal');
      });
       */

      beforeEach(function () {
        cy.visit(careActivityPageUrl);

        cy.wait('@entitiesRequest').then(({ response }) => {
          if (response?.body.length === 0) {
            this.skip();
          }
        });
      });

      it('detail button click should load details CareActivity page', () => {
        cy.get(entityDetailsButtonSelector).first().click();
        cy.getEntityDetailsHeading('careActivity');
        cy.get(entityDetailsBackButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', careActivityPageUrl);
      });

      it('edit button click should load edit CareActivity page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('CareActivity');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', careActivityPageUrl);
      });

      it('edit button click should load edit CareActivity page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('CareActivity');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', careActivityPageUrl);
      });

      // Reason: cannot create a required entity with relationship with required relationships.
      it.skip('last delete button click should delete instance of CareActivity', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('careActivity').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', careActivityPageUrl);

        careActivity = undefined;
      });
    });
  });

  describe('new CareActivity page', () => {
    beforeEach(() => {
      cy.visit(careActivityPageUrl);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('CareActivity');
    });

    // Reason: cannot create a required entity with relationship with required relationships.
    it.skip('should create an instance of CareActivity', () => {
      cy.get(`[data-cy="name"]`).type('beard among');
      cy.get(`[data-cy="name"]`).should('have.value', 'beard among');

      cy.get(`[data-cy="description"]`).type('unnecessarily brr compete');
      cy.get(`[data-cy="description"]`).should('have.value', 'unnecessarily brr compete');

      cy.get(`[data-cy="occurredOn"]`).type('2023-12-11');
      cy.get(`[data-cy="occurredOn"]`).blur();
      cy.get(`[data-cy="occurredOn"]`).should('have.value', '2023-12-11');

      cy.get(`[data-cy="patient"]`).select(1);

      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(201);
        careActivity = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(200);
      });
      cy.location('pathname').should('eq', careActivityPageUrl);
    });
  });
});
