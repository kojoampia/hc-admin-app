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

describe('ShiftAssignment e2e test', () => {
  const shiftAssignmentPageUrl = '/shift-assignment';
  let username: string;
  let password: string;
  // const shiftAssignmentSample = {"dayIndex":2,"shiftDate":"2023-12-11","shift":"OFF"};

  let shiftAssignment;
  // let rosterWeek;
  // let professional;

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
      url: '/api/roster-weeks',
      body: {"label":"athwart","startDate":"2023-12-11","published":true,"publishedAt":"2023-12-11T12:14:46.742Z"},
    }).then(({ body }) => {
      rosterWeek = body;
    });
    // create an instance at the required relationship entity:
    cy.authenticatedRequest({
      method: 'POST',
      url: '/api/professionals',
      body: {"role":"CAREGIVER","speciality":"omelet","licenceNumber":"anenst","verification":"VERIFIED","status":"ON_LEAVE","patientCount":2288,"caseCount":26526,"visitCount":29287,"rating":0.82,"joinedOn":"2023-12-11"},
    }).then(({ body }) => {
      professional = body;
    });
  });
   */

  beforeEach(() => {
    cy.intercept('GET', '/api/shift-assignments+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/api/shift-assignments').as('postEntityRequest');
    cy.intercept('DELETE', '/api/shift-assignments/*').as('deleteEntityRequest');
  });

  /* Disabled due to incompatibility
  beforeEach(() => {
    // Simulate relationships api for better performance and reproducibility.
    cy.intercept('GET', '/api/roster-weeks', {
      statusCode: 200,
      body: [rosterWeek],
    });

    cy.intercept('GET', '/api/professionals', {
      statusCode: 200,
      body: [professional],
    });

  });
   */

  afterEach(() => {
    if (shiftAssignment) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/api/shift-assignments/${shiftAssignment.id}`,
      }).then(() => {
        shiftAssignment = undefined;
      });
    }
  });

  /* Disabled due to incompatibility
  afterEach(() => {
    if (rosterWeek) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/api/roster-weeks/${rosterWeek.id}`,
      }).then(() => {
        rosterWeek = undefined;
      });
    }
    if (professional) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/api/professionals/${professional.id}`,
      }).then(() => {
        professional = undefined;
      });
    }
  });
   */

  it('ShiftAssignments menu should load ShiftAssignments page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('shift-assignment');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response?.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('ShiftAssignment').should('exist');
    cy.location('pathname').should('eq', shiftAssignmentPageUrl);
  });

  describe('ShiftAssignment page', () => {
    it('should have translated page title', () => {
      cy.visit(shiftAssignmentPageUrl);
      cy.getEntityHeading('ShiftAssignment').should('not.contain', 'hcAdminApp.operationsShiftAssignment.home.title');
    });

    describe('create button click', () => {
      beforeEach(() => {
        cy.visit(shiftAssignmentPageUrl);
        cy.wait('@entitiesRequest');
      });

      it('should load create ShiftAssignment page', () => {
        cy.get(entityCreateButtonSelector).click();
        cy.location('pathname').should('eq', `${shiftAssignmentPageUrl}/new`);
        cy.getEntityCreateUpdateHeading('ShiftAssignment');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', shiftAssignmentPageUrl);
      });
    });

    describe('with existing value', () => {
      /* Disabled due to incompatibility
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/api/shift-assignments',
          body: {
            ...shiftAssignmentSample,
            week: rosterWeek,
            professional: professional,
          },
        }).then(({ body }) => {
          shiftAssignment = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/api/shift-assignments+(?*|)',
              times: 1,
            },
            {
              statusCode: 200,
              headers: {
                link: '<http://localhost/api/shift-assignments?page=0&size=20>; rel="last",<http://localhost/api/shift-assignments?page=0&size=20>; rel="first"',
              },
              body: [shiftAssignment],
            }
          ).as('entitiesRequestInternal');
        });

        cy.visit(shiftAssignmentPageUrl);

        cy.wait('@entitiesRequestInternal');
      });
       */

      beforeEach(function () {
        cy.visit(shiftAssignmentPageUrl);

        cy.wait('@entitiesRequest').then(({ response }) => {
          if (response?.body.length === 0) {
            this.skip();
          }
        });
      });

      it('detail button click should load details ShiftAssignment page', () => {
        cy.get(entityDetailsButtonSelector).first().click();
        cy.getEntityDetailsHeading('shiftAssignment');
        cy.get(entityDetailsBackButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', shiftAssignmentPageUrl);
      });

      it('edit button click should load edit ShiftAssignment page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('ShiftAssignment');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', shiftAssignmentPageUrl);
      });

      it('edit button click should load edit ShiftAssignment page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('ShiftAssignment');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', shiftAssignmentPageUrl);
      });

      // Reason: cannot create a required entity with relationship with required relationships.
      it.skip('last delete button click should delete instance of ShiftAssignment', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('shiftAssignment').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', shiftAssignmentPageUrl);

        shiftAssignment = undefined;
      });
    });
  });

  describe('new ShiftAssignment page', () => {
    beforeEach(() => {
      cy.visit(shiftAssignmentPageUrl);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('ShiftAssignment');
    });

    // Reason: cannot create a required entity with relationship with required relationships.
    it.skip('should create an instance of ShiftAssignment', () => {
      cy.get(`[data-cy="dayIndex"]`).type('2');
      cy.get(`[data-cy="dayIndex"]`).should('have.value', '2');

      cy.get(`[data-cy="shiftDate"]`).type('2023-12-11');
      cy.get(`[data-cy="shiftDate"]`).blur();
      cy.get(`[data-cy="shiftDate"]`).should('have.value', '2023-12-11');

      cy.get(`[data-cy="shift"]`).select('EVENING');

      cy.get(`[data-cy="week"]`).select(1);
      cy.get(`[data-cy="professional"]`).select(1);

      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(201);
        shiftAssignment = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(200);
      });
      cy.location('pathname').should('eq', shiftAssignmentPageUrl);
    });
  });
});
