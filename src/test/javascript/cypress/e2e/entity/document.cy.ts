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

describe('Document e2e test', () => {
  const documentPageUrl = '/document';
  let username: string;
  let password: string;
  const documentSample = { name: 'yahoo young consequently', url: 'beneficial', uploadedAt: '2023-12-11T17:41:37.959Z' };

  let document;

  before(() => {
    cy.credentials().then(credentials => {
      ({ username, password } = credentials);
    });
  });

  beforeEach(() => {
    cy.login(username, password);
  });

  beforeEach(() => {
    cy.intercept('GET', '/api/documents+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/api/documents').as('postEntityRequest');
    cy.intercept('DELETE', '/api/documents/*').as('deleteEntityRequest');
  });

  afterEach(() => {
    if (document) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/api/documents/${document.id}`,
      }).then(() => {
        document = undefined;
      });
    }
  });

  it('Documents menu should load Documents page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('document');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response?.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('Document').should('exist');
    cy.location('pathname').should('eq', documentPageUrl);
  });

  describe('Document page', () => {
    it('should have translated page title', () => {
      cy.visit(documentPageUrl);
      cy.getEntityHeading('Document').should('not.contain', 'hcAdminApp.platformDocument.home.title');
    });

    describe('create button click', () => {
      beforeEach(() => {
        cy.visit(documentPageUrl);
        cy.wait('@entitiesRequest');
      });

      it('should load create Document page', () => {
        cy.get(entityCreateButtonSelector).click();
        cy.location('pathname').should('eq', `${documentPageUrl}/new`);
        cy.getEntityCreateUpdateHeading('Document');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', documentPageUrl);
      });
    });

    describe('with existing value', () => {
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/api/documents',
          body: documentSample,
        }).then(({ body }) => {
          document = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/api/documents+(?*|)',
              times: 1,
            },
            {
              statusCode: 200,
              headers: {
                link: '<http://localhost/api/documents?page=0&size=20>; rel="last",<http://localhost/api/documents?page=0&size=20>; rel="first"',
              },
              body: [document],
            },
          ).as('entitiesRequestInternal');
        });

        cy.visit(documentPageUrl);

        cy.wait('@entitiesRequestInternal');
      });

      it('detail button click should load details Document page', () => {
        cy.get(entityDetailsButtonSelector).first().click();
        cy.getEntityDetailsHeading('document');
        cy.get(entityDetailsBackButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', documentPageUrl);
      });

      it('edit button click should load edit Document page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Document');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', documentPageUrl);
      });

      it('edit button click should load edit Document page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Document');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', documentPageUrl);
      });

      it('last delete button click should delete instance of Document', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('document').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', documentPageUrl);

        document = undefined;
      });
    });
  });

  describe('new Document page', () => {
    beforeEach(() => {
      cy.visit(documentPageUrl);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('Document');
    });

    it('should create an instance of Document', () => {
      cy.get(`[data-cy="name"]`).type('reconstitute likewise biodegrade');
      cy.get(`[data-cy="name"]`).should('have.value', 'reconstitute likewise biodegrade');

      cy.get(`[data-cy="description"]`).type('as talkative bruised');
      cy.get(`[data-cy="description"]`).should('have.value', 'as talkative bruised');

      cy.get(`[data-cy="url"]`).type('memorise astride');
      cy.get(`[data-cy="url"]`).should('have.value', 'memorise astride');

      cy.get(`[data-cy="uploadedAt"]`).type('2023-12-11T15:06');
      cy.get(`[data-cy="uploadedAt"]`).blur();
      cy.get(`[data-cy="uploadedAt"]`).should('have.value', '2023-12-11T15:06');

      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(201);
        document = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(200);
      });
      cy.location('pathname').should('eq', documentPageUrl);
    });
  });
});
