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

describe('Profile e2e test', () => {
  const profilePageUrl = '/profile';
  let username: string;
  let password: string;
  const profileSample = {
    firstName: 'huzzah amid',
    lastName: 'that whereas if',
    dateOfBirth: '2023-12-11',
    sex: 'MALE',
    mobilePhone: 'boo typewriter',
    email: 'px@g~^*g=.-',
    idType: 'GHANA_CARD',
    idNumber: 'forage whenever sure-footed',
  };

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
    cy.intercept('GET', '/api/profiles+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/api/profiles').as('postEntityRequest');
    cy.intercept('DELETE', '/api/profiles/*').as('deleteEntityRequest');
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

  it('Profiles menu should load Profiles page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('profile');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response?.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('Profile').should('exist');
    cy.location('pathname').should('eq', profilePageUrl);
  });

  describe('Profile page', () => {
    it('should have translated page title', () => {
      cy.visit(profilePageUrl);
      cy.getEntityHeading('Profile').should('not.contain', 'hcAdminApp.directoryProfile.home.title');
    });

    describe('create button click', () => {
      beforeEach(() => {
        cy.visit(profilePageUrl);
        cy.wait('@entitiesRequest');
      });

      it('should load create Profile page', () => {
        cy.get(entityCreateButtonSelector).click();
        cy.location('pathname').should('eq', `${profilePageUrl}/new`);
        cy.getEntityCreateUpdateHeading('Profile');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', profilePageUrl);
      });
    });

    describe('with existing value', () => {
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/api/profiles',
          body: profileSample,
        }).then(({ body }) => {
          profile = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/api/profiles+(?*|)',
              times: 1,
            },
            {
              statusCode: 200,
              body: [profile],
            },
          ).as('entitiesRequestInternal');
        });

        cy.visit(profilePageUrl);

        cy.wait('@entitiesRequestInternal');
      });

      it('detail button click should load details Profile page', () => {
        cy.get(entityDetailsButtonSelector).first().click();
        cy.getEntityDetailsHeading('profile');
        cy.get(entityDetailsBackButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', profilePageUrl);
      });

      it('edit button click should load edit Profile page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Profile');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', profilePageUrl);
      });

      it('edit button click should load edit Profile page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Profile');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', profilePageUrl);
      });

      it('last delete button click should delete instance of Profile', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('profile').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', profilePageUrl);

        profile = undefined;
      });
    });
  });

  describe('new Profile page', () => {
    beforeEach(() => {
      cy.visit(profilePageUrl);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('Profile');
    });

    it('should create an instance of Profile', () => {
      cy.get(`[data-cy="title"]`).select('MR');

      cy.get(`[data-cy="firstName"]`).type('boo truthfully');
      cy.get(`[data-cy="firstName"]`).should('have.value', 'boo truthfully');

      cy.get(`[data-cy="middleName"]`).type('through chiffonier guilt');
      cy.get(`[data-cy="middleName"]`).should('have.value', 'through chiffonier guilt');

      cy.get(`[data-cy="lastName"]`).type('minus uh-huh onto');
      cy.get(`[data-cy="lastName"]`).should('have.value', 'minus uh-huh onto');

      cy.get(`[data-cy="dateOfBirth"]`).type('2023-12-11');
      cy.get(`[data-cy="dateOfBirth"]`).blur();
      cy.get(`[data-cy="dateOfBirth"]`).should('have.value', '2023-12-11');

      cy.get(`[data-cy="sex"]`).select('FEMALE');

      cy.get(`[data-cy="mobilePhone"]`).type('impolite');
      cy.get(`[data-cy="mobilePhone"]`).should('have.value', 'impolite');

      cy.get(`[data-cy="email"]`).type('i=jrE4@L..B');
      cy.get(`[data-cy="email"]`).should('have.value', 'i=jrE4@L..B');

      cy.get(`[data-cy="idType"]`).select('VOTER_ID');

      cy.get(`[data-cy="idNumber"]`).type('pfft presume');
      cy.get(`[data-cy="idNumber"]`).should('have.value', 'pfft presume');

      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(201);
        profile = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(200);
      });
      cy.location('pathname').should('eq', profilePageUrl);
    });
  });
});
