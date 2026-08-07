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

describe('Patient e2e test', () => {
  const patientPageUrl = '/patient';
  let username: string;
  let password: string;
  const patientSample = { status: 'SUSPENDED', joinedOn: '2023-12-11' };

  let patient;
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
        title: 'PROF',
        firstName: 'yum',
        middleName: 'whimsical within',
        lastName: 'breed',
        dateOfBirth: '2023-12-10',
        sex: 'MALE',
        mobilePhone: 'geez pick if',
        email: '~ScFWx@M.X7M{',
        idType: 'PASSPORT',
        idNumber: 'however incandescence gym',
      },
    }).then(({ body }) => {
      profile = body;
    });
  });

  beforeEach(() => {
    cy.intercept('GET', '/api/patients+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/api/patients').as('postEntityRequest');
    cy.intercept('DELETE', '/api/patients/*').as('deleteEntityRequest');
  });

  beforeEach(() => {
    // Simulate relationships api for better performance and reproducibility.
    cy.intercept('GET', '/api/profiles', {
      statusCode: 200,
      body: [profile],
    });

    cy.intercept('GET', '/api/angels', {
      statusCode: 200,
      body: [],
    });

    cy.intercept('GET', '/api/documents', {
      statusCode: 200,
      body: [],
    });

    cy.intercept('GET', '/api/care-activities', {
      statusCode: 200,
      body: [],
    });

    cy.intercept('GET', '/api/service-plans', {
      statusCode: 200,
      body: [],
    });

    cy.intercept('GET', '/api/professionals', {
      statusCode: 200,
      body: [],
    });

    cy.intercept('GET', '/api/hubs', {
      statusCode: 200,
      body: [],
    });
  });

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

  it('Patients menu should load Patients page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('patient');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response?.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('Patient').should('exist');
    cy.location('pathname').should('eq', patientPageUrl);
  });

  describe('Patient page', () => {
    it('should have translated page title', () => {
      cy.visit(patientPageUrl);
      cy.getEntityHeading('Patient').should('not.contain', 'hcAdminApp.directoryPatient.home.title');
    });

    describe('create button click', () => {
      beforeEach(() => {
        cy.visit(patientPageUrl);
        cy.wait('@entitiesRequest');
      });

      it('should load create Patient page', () => {
        cy.get(entityCreateButtonSelector).click();
        cy.location('pathname').should('eq', `${patientPageUrl}/new`);
        cy.getEntityCreateUpdateHeading('Patient');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', patientPageUrl);
      });
    });

    describe('with existing value', () => {
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/api/patients',
          body: {
            ...patientSample,
            profile,
          },
        }).then(({ body }) => {
          patient = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/api/patients+(?*|)',
              times: 1,
            },
            {
              statusCode: 200,
              headers: {
                link: '<http://localhost/api/patients?page=0&size=20>; rel="last",<http://localhost/api/patients?page=0&size=20>; rel="first"',
              },
              body: [patient],
            },
          ).as('entitiesRequestInternal');
        });

        cy.visit(patientPageUrl);

        cy.wait('@entitiesRequestInternal');
      });

      it('detail button click should load details Patient page', () => {
        cy.get(entityDetailsButtonSelector).first().click();
        cy.getEntityDetailsHeading('patient');
        cy.get(entityDetailsBackButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', patientPageUrl);
      });

      it('edit button click should load edit Patient page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Patient');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', patientPageUrl);
      });

      it('edit button click should load edit Patient page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Patient');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', patientPageUrl);
      });

      it('last delete button click should delete instance of Patient', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('patient').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', patientPageUrl);

        patient = undefined;
      });
    });
  });

  describe('new Patient page', () => {
    beforeEach(() => {
      cy.visit(patientPageUrl);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('Patient');
    });

    it('should create an instance of Patient', () => {
      cy.get(`[data-cy="status"]`).select('ACTIVE');

      cy.get(`[data-cy="joinedOn"]`).type('2023-12-11');
      cy.get(`[data-cy="joinedOn"]`).blur();
      cy.get(`[data-cy="joinedOn"]`).should('have.value', '2023-12-11');

      cy.get(`[data-cy="lastActiveOn"]`).type('2023-12-11');
      cy.get(`[data-cy="lastActiveOn"]`).blur();
      cy.get(`[data-cy="lastActiveOn"]`).should('have.value', '2023-12-11');

      cy.get(`[data-cy="caseCount"]`).type('19370');
      cy.get(`[data-cy="caseCount"]`).should('have.value', '19370');

      cy.get(`[data-cy="profile"]`).select(1);

      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(201);
        patient = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(200);
      });
      cy.location('pathname').should('eq', patientPageUrl);
    });
  });
});
