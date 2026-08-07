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

describe('Vendor e2e test', () => {
  const vendorPageUrl = '/vendor';
  let username: string;
  let password: string;
  const vendorSample = { name: 'amnesty confiscate indeed', category: 'damaged phooey', status: 'PENDING' };

  let vendor;

  before(() => {
    cy.credentials().then(credentials => {
      ({ username, password } = credentials);
    });
  });

  beforeEach(() => {
    cy.login(username, password);
  });

  beforeEach(() => {
    cy.intercept('GET', '/api/vendors+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/api/vendors').as('postEntityRequest');
    cy.intercept('DELETE', '/api/vendors/*').as('deleteEntityRequest');
  });

  afterEach(() => {
    if (vendor) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/api/vendors/${vendor.id}`,
      }).then(() => {
        vendor = undefined;
      });
    }
  });

  it('Vendors menu should load Vendors page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('vendor');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response?.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('Vendor').should('exist');
    cy.location('pathname').should('eq', vendorPageUrl);
  });

  describe('Vendor page', () => {
    it('should have translated page title', () => {
      cy.visit(vendorPageUrl);
      cy.getEntityHeading('Vendor').should('not.contain', 'hcAdminApp.directoryVendor.home.title');
    });

    describe('create button click', () => {
      beforeEach(() => {
        cy.visit(vendorPageUrl);
        cy.wait('@entitiesRequest');
      });

      it('should load create Vendor page', () => {
        cy.get(entityCreateButtonSelector).click();
        cy.location('pathname').should('eq', `${vendorPageUrl}/new`);
        cy.getEntityCreateUpdateHeading('Vendor');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', vendorPageUrl);
      });
    });

    describe('with existing value', () => {
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/api/vendors',
          body: vendorSample,
        }).then(({ body }) => {
          vendor = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/api/vendors+(?*|)',
              times: 1,
            },
            {
              statusCode: 200,
              headers: {
                link: '<http://localhost/api/vendors?page=0&size=20>; rel="last",<http://localhost/api/vendors?page=0&size=20>; rel="first"',
              },
              body: [vendor],
            },
          ).as('entitiesRequestInternal');
        });

        cy.visit(vendorPageUrl);

        cy.wait('@entitiesRequestInternal');
      });

      it('detail button click should load details Vendor page', () => {
        cy.get(entityDetailsButtonSelector).first().click();
        cy.getEntityDetailsHeading('vendor');
        cy.get(entityDetailsBackButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', vendorPageUrl);
      });

      it('edit button click should load edit Vendor page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Vendor');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', vendorPageUrl);
      });

      it('edit button click should load edit Vendor page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Vendor');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', vendorPageUrl);
      });

      it('last delete button click should delete instance of Vendor', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('vendor').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', vendorPageUrl);

        vendor = undefined;
      });
    });
  });

  describe('new Vendor page', () => {
    beforeEach(() => {
      cy.visit(vendorPageUrl);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('Vendor');
    });

    it('should create an instance of Vendor', () => {
      cy.get(`[data-cy="name"]`).type('besides although puppet');
      cy.get(`[data-cy="name"]`).should('have.value', 'besides although puppet');

      cy.get(`[data-cy="category"]`).type('till hence athwart');
      cy.get(`[data-cy="category"]`).should('have.value', 'till hence athwart');

      cy.get(`[data-cy="serviceSummary"]`).type('avaricious vicinity');
      cy.get(`[data-cy="serviceSummary"]`).should('have.value', 'avaricious vicinity');

      cy.get(`[data-cy="contactName"]`).type('uh-huh pure rubric');
      cy.get(`[data-cy="contactName"]`).should('have.value', 'uh-huh pure rubric');

      cy.get(`[data-cy="phone"]`).type('trial smoothly');
      cy.get(`[data-cy="phone"]`).should('have.value', 'trial smoothly');

      cy.get(`[data-cy="email"]`).type('nor duh gee');
      cy.get(`[data-cy="email"]`).should('have.value', 'nor duh gee');

      cy.get(`[data-cy="city"]`).type('among');
      cy.get(`[data-cy="city"]`).should('have.value', 'among');

      cy.get(`[data-cy="status"]`).select('UNDER_REVIEW');

      cy.get(`[data-cy="contractNote"]`).type('but perfection');
      cy.get(`[data-cy="contractNote"]`).should('have.value', 'but perfection');

      cy.get(`[data-cy="contractRenewsOn"]`).type('2023-12-10');
      cy.get(`[data-cy="contractRenewsOn"]`).blur();
      cy.get(`[data-cy="contractRenewsOn"]`).should('have.value', '2023-12-10');

      cy.get(`[data-cy="orderCount"]`).type('5623');
      cy.get(`[data-cy="orderCount"]`).should('have.value', '5623');

      cy.get(`[data-cy="spendToDate"]`).type('26592.95');
      cy.get(`[data-cy="spendToDate"]`).should('have.value', '26592.95');

      cy.get(`[data-cy="rating"]`).type('0.66');
      cy.get(`[data-cy="rating"]`).should('have.value', '0.66');

      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(201);
        vendor = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(200);
      });
      cy.location('pathname').should('eq', vendorPageUrl);
    });
  });
});
