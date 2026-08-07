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

describe('RosterWeek e2e test', () => {
  const rosterWeekPageUrl = '/roster-week';
  let username: string;
  let password: string;
  const rosterWeekSample = { label: 'respray replicate unless', startDate: '2023-12-11', published: true };

  let rosterWeek;

  before(() => {
    cy.credentials().then(credentials => {
      ({ username, password } = credentials);
    });
  });

  beforeEach(() => {
    cy.login(username, password);
  });

  beforeEach(() => {
    cy.intercept('GET', '/api/roster-weeks+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/api/roster-weeks').as('postEntityRequest');
    cy.intercept('DELETE', '/api/roster-weeks/*').as('deleteEntityRequest');
  });

  afterEach(() => {
    if (rosterWeek) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/api/roster-weeks/${rosterWeek.id}`,
      }).then(() => {
        rosterWeek = undefined;
      });
    }
  });

  it('RosterWeeks menu should load RosterWeeks page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('roster-week');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response?.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('RosterWeek').should('exist');
    cy.location('pathname').should('eq', rosterWeekPageUrl);
  });

  describe('RosterWeek page', () => {
    it('should have translated page title', () => {
      cy.visit(rosterWeekPageUrl);
      cy.getEntityHeading('RosterWeek').should('not.contain', 'hcAdminApp.operationsRosterWeek.home.title');
    });

    describe('create button click', () => {
      beforeEach(() => {
        cy.visit(rosterWeekPageUrl);
        cy.wait('@entitiesRequest');
      });

      it('should load create RosterWeek page', () => {
        cy.get(entityCreateButtonSelector).click();
        cy.location('pathname').should('eq', `${rosterWeekPageUrl}/new`);
        cy.getEntityCreateUpdateHeading('RosterWeek');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', rosterWeekPageUrl);
      });
    });

    describe('with existing value', () => {
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/api/roster-weeks',
          body: rosterWeekSample,
        }).then(({ body }) => {
          rosterWeek = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/api/roster-weeks+(?*|)',
              times: 1,
            },
            {
              statusCode: 200,
              body: [rosterWeek],
            },
          ).as('entitiesRequestInternal');
        });

        cy.visit(rosterWeekPageUrl);

        cy.wait('@entitiesRequestInternal');
      });

      it('detail button click should load details RosterWeek page', () => {
        cy.get(entityDetailsButtonSelector).first().click();
        cy.getEntityDetailsHeading('rosterWeek');
        cy.get(entityDetailsBackButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', rosterWeekPageUrl);
      });

      it('edit button click should load edit RosterWeek page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('RosterWeek');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', rosterWeekPageUrl);
      });

      it('edit button click should load edit RosterWeek page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('RosterWeek');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', rosterWeekPageUrl);
      });

      it('last delete button click should delete instance of RosterWeek', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('rosterWeek').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', rosterWeekPageUrl);

        rosterWeek = undefined;
      });
    });
  });

  describe('new RosterWeek page', () => {
    beforeEach(() => {
      cy.visit(rosterWeekPageUrl);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('RosterWeek');
    });

    it('should create an instance of RosterWeek', () => {
      cy.get(`[data-cy="label"]`).type('times');
      cy.get(`[data-cy="label"]`).should('have.value', 'times');

      cy.get(`[data-cy="startDate"]`).type('2023-12-10');
      cy.get(`[data-cy="startDate"]`).blur();
      cy.get(`[data-cy="startDate"]`).should('have.value', '2023-12-10');

      cy.get(`[data-cy="published"]`).should('not.be.checked');
      cy.get(`[data-cy="published"]`).click();
      cy.get(`[data-cy="published"]`).should('be.checked');

      cy.get(`[data-cy="publishedAt"]`).type('2023-12-11T13:23');
      cy.get(`[data-cy="publishedAt"]`).blur();
      cy.get(`[data-cy="publishedAt"]`).should('have.value', '2023-12-11T13:23');

      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(201);
        rosterWeek = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(200);
      });
      cy.location('pathname').should('eq', rosterWeekPageUrl);
    });
  });
});
