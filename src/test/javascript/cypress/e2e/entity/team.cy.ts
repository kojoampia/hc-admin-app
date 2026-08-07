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

describe('Team e2e test', () => {
  const teamPageUrl = '/team';
  let username: string;
  let password: string;
  const teamSample = { name: 'hollow yuck inasmuch' };

  let team;

  before(() => {
    cy.credentials().then(credentials => {
      ({ username, password } = credentials);
    });
  });

  beforeEach(() => {
    cy.login(username, password);
  });

  beforeEach(() => {
    cy.intercept('GET', '/api/teams+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/api/teams').as('postEntityRequest');
    cy.intercept('DELETE', '/api/teams/*').as('deleteEntityRequest');
  });

  afterEach(() => {
    if (team) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/api/teams/${team.id}`,
      }).then(() => {
        team = undefined;
      });
    }
  });

  it('Teams menu should load Teams page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('team');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response?.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('Team').should('exist');
    cy.location('pathname').should('eq', teamPageUrl);
  });

  describe('Team page', () => {
    it('should have translated page title', () => {
      cy.visit(teamPageUrl);
      cy.getEntityHeading('Team').should('not.contain', 'hcAdminApp.platformTeam.home.title');
    });

    describe('create button click', () => {
      beforeEach(() => {
        cy.visit(teamPageUrl);
        cy.wait('@entitiesRequest');
      });

      it('should load create Team page', () => {
        cy.get(entityCreateButtonSelector).click();
        cy.location('pathname').should('eq', `${teamPageUrl}/new`);
        cy.getEntityCreateUpdateHeading('Team');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', teamPageUrl);
      });
    });

    describe('with existing value', () => {
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/api/teams',
          body: teamSample,
        }).then(({ body }) => {
          team = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/api/teams+(?*|)',
              times: 1,
            },
            {
              statusCode: 200,
              body: [team],
            },
          ).as('entitiesRequestInternal');
        });

        cy.visit(teamPageUrl);

        cy.wait('@entitiesRequestInternal');
      });

      it('detail button click should load details Team page', () => {
        cy.get(entityDetailsButtonSelector).first().click();
        cy.getEntityDetailsHeading('team');
        cy.get(entityDetailsBackButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', teamPageUrl);
      });

      it('edit button click should load edit Team page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Team');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', teamPageUrl);
      });

      it('edit button click should load edit Team page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Team');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', teamPageUrl);
      });

      it('last delete button click should delete instance of Team', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('team').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', teamPageUrl);

        team = undefined;
      });
    });
  });

  describe('new Team page', () => {
    beforeEach(() => {
      cy.visit(teamPageUrl);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('Team');
    });

    it('should create an instance of Team', () => {
      cy.get(`[data-cy="name"]`).type('pilot');
      cy.get(`[data-cy="name"]`).should('have.value', 'pilot');

      cy.get(`[data-cy="description"]`).type('reluctantly wedding along');
      cy.get(`[data-cy="description"]`).should('have.value', 'reluctantly wedding along');

      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(201);
        team = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(200);
      });
      cy.location('pathname').should('eq', teamPageUrl);
    });
  });
});
