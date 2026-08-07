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

describe('Professional e2e test', () => {
  const professionalPageUrl = '/professional';
  let username: string;
  let password: string;
  const professionalSample = {
    role: 'NURSE',
    licenceNumber: 'annually fiddle',
    verification: 'REJECTED',
    status: 'UNDER_REVIEW',
    joinedOn: '2023-12-11',
  };

  let professional;
  let profile;

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
      url: '/api/profiles',
      body: {
        title: 'MRS',
        firstName: 'bind',
        middleName: 'punctual destock minus',
        lastName: 'er recommendation',
        dateOfBirth: '2023-12-11',
        sex: 'MALE',
        mobilePhone: 'feminize euphonium well-',
        email: 'O@76<k%.OP=d^',
        idType: 'GHANA_CARD',
        idNumber: 'but for',
      },
    }).then(({ body }) => {
      profile = body;
    });
  });

  beforeEach(() => {
    cy.intercept('GET', '/api/professionals+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/api/professionals').as('postEntityRequest');
    cy.intercept('DELETE', '/api/professionals/*').as('deleteEntityRequest');
  });

  beforeEach(() => {
    // Simulate relationships api for better performance and reproducibility.
    cy.intercept('GET', '/api/profiles', {
      statusCode: 200,
      body: [profile],
    });

    cy.intercept('GET', '/api/credentials', {
      statusCode: 200,
      body: [],
    });

    cy.intercept('GET', '/api/shift-assignments', {
      statusCode: 200,
      body: [],
    });

    cy.intercept('GET', '/api/teams', {
      statusCode: 200,
      body: [],
    });

    cy.intercept('GET', '/api/hubs', {
      statusCode: 200,
      body: [],
    });
  });

  afterEach(() => {
    if (professional) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/api/professionals/${professional.id}`,
      }).then(() => {
        professional = undefined;
      });
    }
  });

  afterEach(() => {
    if (profile) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/api/profiles/${profile.id}`,
      }).then(() => {
        profile = undefined;
      });
    }
  });

  it('Professionals menu should load Professionals page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('professional');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response?.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('Professional').should('exist');
    cy.location('pathname').should('eq', professionalPageUrl);
  });

  describe('Professional page', () => {
    it('should have translated page title', () => {
      cy.visit(professionalPageUrl);
      cy.getEntityHeading('Professional').should('not.contain', 'hcAdminApp.directoryProfessional.home.title');
    });

    describe('create button click', () => {
      beforeEach(() => {
        cy.visit(professionalPageUrl);
        cy.wait('@entitiesRequest');
      });

      it('should load create Professional page', () => {
        cy.get(entityCreateButtonSelector).click();
        cy.location('pathname').should('eq', `${professionalPageUrl}/new`);
        cy.getEntityCreateUpdateHeading('Professional');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', professionalPageUrl);
      });
    });

    describe('with existing value', () => {
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/api/professionals',
          body: {
            ...professionalSample,
            profile,
          },
        }).then(({ body }) => {
          professional = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/api/professionals+(?*|)',
              times: 1,
            },
            {
              statusCode: 200,
              headers: {
                link: '<http://localhost/api/professionals?page=0&size=20>; rel="last",<http://localhost/api/professionals?page=0&size=20>; rel="first"',
              },
              body: [professional],
            },
          ).as('entitiesRequestInternal');
        });

        cy.visit(professionalPageUrl);

        cy.wait('@entitiesRequestInternal');
      });

      it('detail button click should load details Professional page', () => {
        cy.get(entityDetailsButtonSelector).first().click();
        cy.getEntityDetailsHeading('professional');
        cy.get(entityDetailsBackButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', professionalPageUrl);
      });

      it('edit button click should load edit Professional page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Professional');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', professionalPageUrl);
      });

      it('edit button click should load edit Professional page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Professional');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', professionalPageUrl);
      });

      it('last delete button click should delete instance of Professional', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('professional').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', professionalPageUrl);

        professional = undefined;
      });
    });
  });

  describe('new Professional page', () => {
    beforeEach(() => {
      cy.visit(professionalPageUrl);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('Professional');
    });

    it('should create an instance of Professional', () => {
      cy.get(`[data-cy="role"]`).select('NURSE');

      cy.get(`[data-cy="speciality"]`).type('repeatedly');
      cy.get(`[data-cy="speciality"]`).should('have.value', 'repeatedly');

      cy.get(`[data-cy="licenceNumber"]`).type('that given uh-huh');
      cy.get(`[data-cy="licenceNumber"]`).should('have.value', 'that given uh-huh');

      cy.get(`[data-cy="verification"]`).select('VERIFIED');

      cy.get(`[data-cy="status"]`).select('ACTIVE');

      cy.get(`[data-cy="patientCount"]`).type('18150');
      cy.get(`[data-cy="patientCount"]`).should('have.value', '18150');

      cy.get(`[data-cy="caseCount"]`).type('26095');
      cy.get(`[data-cy="caseCount"]`).should('have.value', '26095');

      cy.get(`[data-cy="visitCount"]`).type('5616');
      cy.get(`[data-cy="visitCount"]`).should('have.value', '5616');

      cy.get(`[data-cy="rating"]`).type('2.92');
      cy.get(`[data-cy="rating"]`).should('have.value', '2.92');

      cy.get(`[data-cy="joinedOn"]`).type('2023-12-11');
      cy.get(`[data-cy="joinedOn"]`).blur();
      cy.get(`[data-cy="joinedOn"]`).should('have.value', '2023-12-11');

      cy.get(`[data-cy="profile"]`).select(1);

      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(201);
        professional = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(200);
      });
      cy.location('pathname').should('eq', professionalPageUrl);
    });
  });
});
