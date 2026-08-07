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

describe('Angel e2e test', () => {
  const angelPageUrl = '/angel';
  let username: string;
  let password: string;
  const angelSample = { name: 'how', relationship: 'excepting even interestingly', phone: 'bitterly inside' };

  let angel;

  before(() => {
    cy.credentials().then(credentials => {
      ({ username, password } = credentials);
    });
  });

  beforeEach(() => {
    cy.login(username, password);
  });

  beforeEach(() => {
    cy.intercept('GET', '/api/angels+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/api/angels').as('postEntityRequest');
    cy.intercept('DELETE', '/api/angels/*').as('deleteEntityRequest');
  });

  afterEach(() => {
    if (angel) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/api/angels/${angel.id}`,
      }).then(() => {
        angel = undefined;
      });
    }
  });

  it('Angels menu should load Angels page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('angel');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response?.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('Angel').should('exist');
    cy.location('pathname').should('eq', angelPageUrl);
  });

  describe('Angel page', () => {
    it('should have translated page title', () => {
      cy.visit(angelPageUrl);
      cy.getEntityHeading('Angel').should('not.contain', 'hcAdminApp.directoryAngel.home.title');
    });

    describe('create button click', () => {
      beforeEach(() => {
        cy.visit(angelPageUrl);
        cy.wait('@entitiesRequest');
      });

      it('should load create Angel page', () => {
        cy.get(entityCreateButtonSelector).click();
        cy.location('pathname').should('eq', `${angelPageUrl}/new`);
        cy.getEntityCreateUpdateHeading('Angel');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', angelPageUrl);
      });
    });

    describe('with existing value', () => {
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/api/angels',
          body: angelSample,
        }).then(({ body }) => {
          angel = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/api/angels+(?*|)',
              times: 1,
            },
            {
              statusCode: 200,
              body: [angel],
            },
          ).as('entitiesRequestInternal');
        });

        cy.visit(angelPageUrl);

        cy.wait('@entitiesRequestInternal');
      });

      it('detail button click should load details Angel page', () => {
        cy.get(entityDetailsButtonSelector).first().click();
        cy.getEntityDetailsHeading('angel');
        cy.get(entityDetailsBackButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', angelPageUrl);
      });

      it('edit button click should load edit Angel page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Angel');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', angelPageUrl);
      });

      it('edit button click should load edit Angel page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Angel');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', angelPageUrl);
      });

      it('last delete button click should delete instance of Angel', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('angel').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', angelPageUrl);

        angel = undefined;
      });
    });
  });

  describe('new Angel page', () => {
    beforeEach(() => {
      cy.visit(angelPageUrl);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('Angel');
    });

    it('should create an instance of Angel', () => {
      cy.get(`[data-cy="name"]`).type('along vengeful');
      cy.get(`[data-cy="name"]`).should('have.value', 'along vengeful');

      cy.get(`[data-cy="relationship"]`).type('wherever');
      cy.get(`[data-cy="relationship"]`).should('have.value', 'wherever');

      cy.get(`[data-cy="phone"]`).type('provision');
      cy.get(`[data-cy="phone"]`).should('have.value', 'provision');

      cy.get(`[data-cy="email"]`).type('vista fooey by');
      cy.get(`[data-cy="email"]`).should('have.value', 'vista fooey by');

      cy.get(`[data-cy="country"]`).type('tectonics recompense');
      cy.get(`[data-cy="country"]`).should('have.value', 'tectonics recompense');

      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(201);
        angel = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(200);
      });
      cy.location('pathname').should('eq', angelPageUrl);
    });
  });
});
