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

describe('Category e2e test', () => {
  const categoryPageUrl = '/category';
  let username: string;
  let password: string;
  const categorySample = { name: 'less athletic' };

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
    cy.intercept('GET', '/api/categories+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/api/categories').as('postEntityRequest');
    cy.intercept('DELETE', '/api/categories/*').as('deleteEntityRequest');
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

  it('Categories menu should load Categories page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('category');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response?.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('Category').should('exist');
    cy.location('pathname').should('eq', categoryPageUrl);
  });

  describe('Category page', () => {
    it('should have translated page title', () => {
      cy.visit(categoryPageUrl);
      cy.getEntityHeading('Category').should('not.contain', 'hcAdminApp.catalogueCategory.home.title');
    });

    describe('create button click', () => {
      beforeEach(() => {
        cy.visit(categoryPageUrl);
        cy.wait('@entitiesRequest');
      });

      it('should load create Category page', () => {
        cy.get(entityCreateButtonSelector).click();
        cy.location('pathname').should('eq', `${categoryPageUrl}/new`);
        cy.getEntityCreateUpdateHeading('Category');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', categoryPageUrl);
      });
    });

    describe('with existing value', () => {
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/api/categories',
          body: categorySample,
        }).then(({ body }) => {
          category = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/api/categories+(?*|)',
              times: 1,
            },
            {
              statusCode: 200,
              body: [category],
            },
          ).as('entitiesRequestInternal');
        });

        cy.visit(categoryPageUrl);

        cy.wait('@entitiesRequestInternal');
      });

      it('detail button click should load details Category page', () => {
        cy.get(entityDetailsButtonSelector).first().click();
        cy.getEntityDetailsHeading('category');
        cy.get(entityDetailsBackButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', categoryPageUrl);
      });

      it('edit button click should load edit Category page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Category');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', categoryPageUrl);
      });

      it('edit button click should load edit Category page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Category');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', categoryPageUrl);
      });

      it('last delete button click should delete instance of Category', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('category').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', categoryPageUrl);

        category = undefined;
      });
    });
  });

  describe('new Category page', () => {
    beforeEach(() => {
      cy.visit(categoryPageUrl);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('Category');
    });

    it('should create an instance of Category', () => {
      cy.get(`[data-cy="name"]`).type('behind or');
      cy.get(`[data-cy="name"]`).should('have.value', 'behind or');

      cy.get(`[data-cy="description"]`).type('pfft');
      cy.get(`[data-cy="description"]`).should('have.value', 'pfft');

      cy.get(`[data-cy="iconKey"]`).type('haze whether');
      cy.get(`[data-cy="iconKey"]`).should('have.value', 'haze whether');

      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(201);
        category = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(200);
      });
      cy.location('pathname').should('eq', categoryPageUrl);
    });
  });
});
