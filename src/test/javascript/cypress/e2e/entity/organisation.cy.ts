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

describe('Organisation e2e test', () => {
  const organisationPageUrl = '/organisation';
  let username: string;
  let password: string;
  const organisationSample = { name: 'seldom warmly', legalName: 'annual selfishly' };

  let organisation;

  before(() => {
    cy.credentials().then(credentials => {
      ({ username, password } = credentials);
    });
  });

  beforeEach(() => {
    cy.login(username, password);
  });

  beforeEach(() => {
    cy.intercept('GET', '/api/organisations+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/api/organisations').as('postEntityRequest');
    cy.intercept('DELETE', '/api/organisations/*').as('deleteEntityRequest');
  });

  afterEach(() => {
    if (organisation) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/api/organisations/${organisation.id}`,
      }).then(() => {
        organisation = undefined;
      });
    }
  });

  it('Organisations menu should load Organisations page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('organisation');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response?.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('Organisation').should('exist');
    cy.location('pathname').should('eq', organisationPageUrl);
  });

  describe('Organisation page', () => {
    it('should have translated page title', () => {
      cy.visit(organisationPageUrl);
      cy.getEntityHeading('Organisation').should('not.contain', 'hcAdminApp.platformOrganisation.home.title');
    });

    describe('create button click', () => {
      beforeEach(() => {
        cy.visit(organisationPageUrl);
        cy.wait('@entitiesRequest');
      });

      it('should load create Organisation page', () => {
        cy.get(entityCreateButtonSelector).click();
        cy.location('pathname').should('eq', `${organisationPageUrl}/new`);
        cy.getEntityCreateUpdateHeading('Organisation');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', organisationPageUrl);
      });
    });

    describe('with existing value', () => {
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/api/organisations',
          body: organisationSample,
        }).then(({ body }) => {
          organisation = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/api/organisations+(?*|)',
              times: 1,
            },
            {
              statusCode: 200,
              body: [organisation],
            },
          ).as('entitiesRequestInternal');
        });

        cy.visit(organisationPageUrl);

        cy.wait('@entitiesRequestInternal');
      });

      it('detail button click should load details Organisation page', () => {
        cy.get(entityDetailsButtonSelector).first().click();
        cy.getEntityDetailsHeading('organisation');
        cy.get(entityDetailsBackButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', organisationPageUrl);
      });

      it('edit button click should load edit Organisation page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Organisation');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', organisationPageUrl);
      });

      it('edit button click should load edit Organisation page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Organisation');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', organisationPageUrl);
      });

      it('last delete button click should delete instance of Organisation', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('organisation').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', organisationPageUrl);

        organisation = undefined;
      });
    });
  });

  describe('new Organisation page', () => {
    beforeEach(() => {
      cy.visit(organisationPageUrl);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('Organisation');
    });

    it('should create an instance of Organisation', () => {
      cy.get(`[data-cy="name"]`).type('dulcimer');
      cy.get(`[data-cy="name"]`).should('have.value', 'dulcimer');

      cy.get(`[data-cy="legalName"]`).type('character who geez');
      cy.get(`[data-cy="legalName"]`).should('have.value', 'character who geez');

      cy.get(`[data-cy="description"]`).type('mid');
      cy.get(`[data-cy="description"]`).should('have.value', 'mid');

      cy.get(`[data-cy="registrationNumber"]`).type('which');
      cy.get(`[data-cy="registrationNumber"]`).should('have.value', 'which');

      cy.get(`[data-cy="tin"]`).type('zowie regular pillow');
      cy.get(`[data-cy="tin"]`).should('have.value', 'zowie regular pillow');

      cy.get(`[data-cy="foundedOn"]`).type('2023-12-11');
      cy.get(`[data-cy="foundedOn"]`).blur();
      cy.get(`[data-cy="foundedOn"]`).should('have.value', '2023-12-11');

      cy.get(`[data-cy="switchboard"]`).type('a');
      cy.get(`[data-cy="switchboard"]`).should('have.value', 'a');

      cy.get(`[data-cy="email"]`).type('elegantly bookend horst');
      cy.get(`[data-cy="email"]`).should('have.value', 'elegantly bookend horst');

      cy.get(`[data-cy="deskHours"]`).type('yum');
      cy.get(`[data-cy="deskHours"]`).should('have.value', 'yum');

      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(201);
        organisation = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(200);
      });
      cy.location('pathname').should('eq', organisationPageUrl);
    });
  });
});
