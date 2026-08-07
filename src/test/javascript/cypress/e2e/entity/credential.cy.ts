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

describe('Credential e2e test', () => {
  const credentialPageUrl = '/credential';
  let username: string;
  let password: string;
  const credentialSample = { email: 'versus boohoo overdue', role: 'DESK_OFFICER', enabled: false };

  let credential;

  before(() => {
    cy.credentials().then(credentials => {
      ({ username, password } = credentials);
    });
  });

  beforeEach(() => {
    cy.login(username, password);
  });

  beforeEach(() => {
    cy.intercept('GET', '/api/credentials+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/api/credentials').as('postEntityRequest');
    cy.intercept('DELETE', '/api/credentials/*').as('deleteEntityRequest');
  });

  afterEach(() => {
    if (credential) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/api/credentials/${credential.id}`,
      }).then(() => {
        credential = undefined;
      });
    }
  });

  it('Credentials menu should load Credentials page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('credential');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response?.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('Credential').should('exist');
    cy.location('pathname').should('eq', credentialPageUrl);
  });

  describe('Credential page', () => {
    it('should have translated page title', () => {
      cy.visit(credentialPageUrl);
      cy.getEntityHeading('Credential').should('not.contain', 'hcAdminApp.platformCredential.home.title');
    });

    describe('create button click', () => {
      beforeEach(() => {
        cy.visit(credentialPageUrl);
        cy.wait('@entitiesRequest');
      });

      it('should load create Credential page', () => {
        cy.get(entityCreateButtonSelector).click();
        cy.location('pathname').should('eq', `${credentialPageUrl}/new`);
        cy.getEntityCreateUpdateHeading('Credential');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', credentialPageUrl);
      });
    });

    describe('with existing value', () => {
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/api/credentials',
          body: credentialSample,
        }).then(({ body }) => {
          credential = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/api/credentials+(?*|)',
              times: 1,
            },
            {
              statusCode: 200,
              body: [credential],
            },
          ).as('entitiesRequestInternal');
        });

        cy.visit(credentialPageUrl);

        cy.wait('@entitiesRequestInternal');
      });

      it('detail button click should load details Credential page', () => {
        cy.get(entityDetailsButtonSelector).first().click();
        cy.getEntityDetailsHeading('credential');
        cy.get(entityDetailsBackButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', credentialPageUrl);
      });

      it('edit button click should load edit Credential page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Credential');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', credentialPageUrl);
      });

      it('edit button click should load edit Credential page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Credential');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', credentialPageUrl);
      });

      it('last delete button click should delete instance of Credential', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('credential').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', credentialPageUrl);

        credential = undefined;
      });
    });
  });

  describe('new Credential page', () => {
    beforeEach(() => {
      cy.visit(credentialPageUrl);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('Credential');
    });

    it('should create an instance of Credential', () => {
      cy.get(`[data-cy="email"]`).type('amidst onto yahoo');
      cy.get(`[data-cy="email"]`).should('have.value', 'amidst onto yahoo');

      cy.get(`[data-cy="phoneNumber"]`).type('punctually');
      cy.get(`[data-cy="phoneNumber"]`).should('have.value', 'punctually');

      cy.get(`[data-cy="passwordHash"]`).type('excitable frenetically wound');
      cy.get(`[data-cy="passwordHash"]`).should('have.value', 'excitable frenetically wound');

      cy.get(`[data-cy="role"]`).select('PROFESSIONAL');

      cy.get(`[data-cy="enabled"]`).should('not.be.checked');
      cy.get(`[data-cy="enabled"]`).click();
      cy.get(`[data-cy="enabled"]`).should('be.checked');

      cy.get(`[data-cy="lastLoginAt"]`).type('2023-12-11T07:28');
      cy.get(`[data-cy="lastLoginAt"]`).blur();
      cy.get(`[data-cy="lastLoginAt"]`).should('have.value', '2023-12-11T07:28');

      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(201);
        credential = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(200);
      });
      cy.location('pathname').should('eq', credentialPageUrl);
    });
  });
});
