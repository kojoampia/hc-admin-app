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

describe('Address e2e test', () => {
  const addressPageUrl = '/address';
  let username: string;
  let password: string;
  const addressSample = {
    digitalAddress: 'WU-942-1831',
    streetAddress: 'zowie now',
    cityState: 'spook restructure know',
    region: 'clear-cut',
    country: 'ha table state',
  };

  let address;

  before(() => {
    cy.credentials().then(credentials => {
      ({ username, password } = credentials);
    });
  });

  beforeEach(() => {
    cy.login(username, password);
  });

  beforeEach(() => {
    cy.intercept('GET', '/api/addresses+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/api/addresses').as('postEntityRequest');
    cy.intercept('DELETE', '/api/addresses/*').as('deleteEntityRequest');
  });

  afterEach(() => {
    if (address) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/api/addresses/${address.id}`,
      }).then(() => {
        address = undefined;
      });
    }
  });

  it('Addresses menu should load Addresses page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('address');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response?.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('Address').should('exist');
    cy.location('pathname').should('eq', addressPageUrl);
  });

  describe('Address page', () => {
    it('should have translated page title', () => {
      cy.visit(addressPageUrl);
      cy.getEntityHeading('Address').should('not.contain', 'hcAdminApp.directoryAddress.home.title');
    });

    describe('create button click', () => {
      beforeEach(() => {
        cy.visit(addressPageUrl);
        cy.wait('@entitiesRequest');
      });

      it('should load create Address page', () => {
        cy.get(entityCreateButtonSelector).click();
        cy.location('pathname').should('eq', `${addressPageUrl}/new`);
        cy.getEntityCreateUpdateHeading('Address');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', addressPageUrl);
      });
    });

    describe('with existing value', () => {
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/api/addresses',
          body: addressSample,
        }).then(({ body }) => {
          address = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/api/addresses+(?*|)',
              times: 1,
            },
            {
              statusCode: 200,
              body: [address],
            },
          ).as('entitiesRequestInternal');
        });

        cy.visit(addressPageUrl);

        cy.wait('@entitiesRequestInternal');
      });

      it('detail button click should load details Address page', () => {
        cy.get(entityDetailsButtonSelector).first().click();
        cy.getEntityDetailsHeading('address');
        cy.get(entityDetailsBackButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', addressPageUrl);
      });

      it('edit button click should load edit Address page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Address');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', addressPageUrl);
      });

      it('edit button click should load edit Address page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Address');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', addressPageUrl);
      });

      it('last delete button click should delete instance of Address', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('address').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', addressPageUrl);

        address = undefined;
      });
    });
  });

  describe('new Address page', () => {
    beforeEach(() => {
      cy.visit(addressPageUrl);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('Address');
    });

    it('should create an instance of Address', () => {
      cy.get(`[data-cy="digitalAddress"]`).type('XB-986-9373');
      cy.get(`[data-cy="digitalAddress"]`).should('have.value', 'XB-986-9373');

      cy.get(`[data-cy="streetAddress"]`).type('whole psst woeful');
      cy.get(`[data-cy="streetAddress"]`).should('have.value', 'whole psst woeful');

      cy.get(`[data-cy="townDistrict"]`).type('pluck worthwhile');
      cy.get(`[data-cy="townDistrict"]`).should('have.value', 'pluck worthwhile');

      cy.get(`[data-cy="cityState"]`).type('across cheerfully');
      cy.get(`[data-cy="cityState"]`).should('have.value', 'across cheerfully');

      cy.get(`[data-cy="region"]`).type('where irritably oof');
      cy.get(`[data-cy="region"]`).should('have.value', 'where irritably oof');

      cy.get(`[data-cy="country"]`).type('icy where');
      cy.get(`[data-cy="country"]`).should('have.value', 'icy where');

      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(201);
        address = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(200);
      });
      cy.location('pathname').should('eq', addressPageUrl);
    });
  });
});
