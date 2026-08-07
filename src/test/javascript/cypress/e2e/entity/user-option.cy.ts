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

describe('UserOption e2e test', () => {
  const userOptionPageUrl = '/user-option';
  let username: string;
  let password: string;
  const userOptionSample = { category: 'boo instead soulful', userRef: 'beneath via' };

  let userOption;

  before(() => {
    cy.credentials().then(credentials => {
      ({ username, password } = credentials);
    });
  });

  beforeEach(() => {
    cy.login(username, password);
  });

  beforeEach(() => {
    cy.intercept('GET', '/api/user-options+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/api/user-options').as('postEntityRequest');
    cy.intercept('DELETE', '/api/user-options/*').as('deleteEntityRequest');
  });

  afterEach(() => {
    if (userOption) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/api/user-options/${userOption.id}`,
      }).then(() => {
        userOption = undefined;
      });
    }
  });

  it('UserOptions menu should load UserOptions page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('user-option');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response?.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('UserOption').should('exist');
    cy.location('pathname').should('eq', userOptionPageUrl);
  });

  describe('UserOption page', () => {
    it('should have translated page title', () => {
      cy.visit(userOptionPageUrl);
      cy.getEntityHeading('UserOption').should('not.contain', 'hcAdminApp.platformUserOption.home.title');
    });

    describe('create button click', () => {
      beforeEach(() => {
        cy.visit(userOptionPageUrl);
        cy.wait('@entitiesRequest');
      });

      it('should load create UserOption page', () => {
        cy.get(entityCreateButtonSelector).click();
        cy.location('pathname').should('eq', `${userOptionPageUrl}/new`);
        cy.getEntityCreateUpdateHeading('UserOption');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', userOptionPageUrl);
      });
    });

    describe('with existing value', () => {
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/api/user-options',
          body: userOptionSample,
        }).then(({ body }) => {
          userOption = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/api/user-options+(?*|)',
              times: 1,
            },
            {
              statusCode: 200,
              body: [userOption],
            },
          ).as('entitiesRequestInternal');
        });

        cy.visit(userOptionPageUrl);

        cy.wait('@entitiesRequestInternal');
      });

      it('detail button click should load details UserOption page', () => {
        cy.get(entityDetailsButtonSelector).first().click();
        cy.getEntityDetailsHeading('userOption');
        cy.get(entityDetailsBackButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', userOptionPageUrl);
      });

      it('edit button click should load edit UserOption page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('UserOption');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', userOptionPageUrl);
      });

      it('edit button click should load edit UserOption page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('UserOption');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', userOptionPageUrl);
      });

      it('last delete button click should delete instance of UserOption', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('userOption').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', userOptionPageUrl);

        userOption = undefined;
      });
    });
  });

  describe('new UserOption page', () => {
    beforeEach(() => {
      cy.visit(userOptionPageUrl);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('UserOption');
    });

    it('should create an instance of UserOption', () => {
      cy.get(`[data-cy="category"]`).type('bah');
      cy.get(`[data-cy="category"]`).should('have.value', 'bah');

      cy.get(`[data-cy="userRef"]`).type('while');
      cy.get(`[data-cy="userRef"]`).should('have.value', 'while');

      cy.get(`[data-cy="metadata"]`).type('equally');
      cy.get(`[data-cy="metadata"]`).should('have.value', 'equally');

      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(201);
        userOption = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(200);
      });
      cy.location('pathname').should('eq', userOptionPageUrl);
    });
  });
});
