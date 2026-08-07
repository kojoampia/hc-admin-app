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

describe('Message e2e test', () => {
  const messagePageUrl = '/message';
  let username: string;
  let password: string;
  const messageSample = {
    sentAt: '2023-12-11T15:39:42.820Z',
    fromAddress: 'ethical loosely silently',
    senderName: 'unnecessarily disposer absolve',
    subject: 'lest worriedly',
    body: 'Li4vZmFrZS1kYXRhL2Jsb2IvaGlwc3Rlci50eHQ=',
    channel: 'VENDOR_PORTAL',
    status: 'READ',
    priority: 'NORMAL',
  };

  let message;

  before(() => {
    cy.credentials().then(credentials => {
      ({ username, password } = credentials);
    });
  });

  beforeEach(() => {
    cy.login(username, password);
  });

  beforeEach(() => {
    cy.intercept('GET', '/api/messages+(?*|)').as('entitiesRequest');
    cy.intercept('POST', '/api/messages').as('postEntityRequest');
    cy.intercept('DELETE', '/api/messages/*').as('deleteEntityRequest');
  });

  afterEach(() => {
    if (message) {
      cy.authenticatedRequest({
        method: 'DELETE',
        url: `/api/messages/${message.id}`,
      }).then(() => {
        message = undefined;
      });
    }
  });

  it('Messages menu should load Messages page', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem('message');
    cy.wait('@entitiesRequest').then(({ response }) => {
      if (response?.body.length === 0) {
        cy.get(entityTableSelector).should('not.exist');
      } else {
        cy.get(entityTableSelector).should('exist');
      }
    });
    cy.getEntityHeading('Message').should('exist');
    cy.location('pathname').should('eq', messagePageUrl);
  });

  describe('Message page', () => {
    it('should have translated page title', () => {
      cy.visit(messagePageUrl);
      cy.getEntityHeading('Message').should('not.contain', 'hcAdminApp.operationsMessage.home.title');
    });

    describe('create button click', () => {
      beforeEach(() => {
        cy.visit(messagePageUrl);
        cy.wait('@entitiesRequest');
      });

      it('should load create Message page', () => {
        cy.get(entityCreateButtonSelector).click();
        cy.location('pathname').should('eq', `${messagePageUrl}/new`);
        cy.getEntityCreateUpdateHeading('Message');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', messagePageUrl);
      });
    });

    describe('with existing value', () => {
      beforeEach(() => {
        cy.authenticatedRequest({
          method: 'POST',
          url: '/api/messages',
          body: messageSample,
        }).then(({ body }) => {
          message = body;

          cy.intercept(
            {
              method: 'GET',
              url: '/api/messages+(?*|)',
              times: 1,
            },
            {
              statusCode: 200,
              headers: {
                link: '<http://localhost/api/messages?page=0&size=20>; rel="last",<http://localhost/api/messages?page=0&size=20>; rel="first"',
              },
              body: [message],
            },
          ).as('entitiesRequestInternal');
        });

        cy.visit(messagePageUrl);

        cy.wait('@entitiesRequestInternal');
      });

      it('detail button click should load details Message page', () => {
        cy.get(entityDetailsButtonSelector).first().click();
        cy.getEntityDetailsHeading('message');
        cy.get(entityDetailsBackButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', messagePageUrl);
      });

      it('edit button click should load edit Message page and go back', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Message');
        cy.get(entityCreateSaveButtonSelector).should('exist');
        cy.get(entityCreateCancelButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', messagePageUrl);
      });

      it('edit button click should load edit Message page and save', () => {
        cy.get(entityEditButtonSelector).first().click();
        cy.getEntityCreateUpdateHeading('Message');
        cy.get(entityCreateSaveButtonSelector).click();
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', messagePageUrl);
      });

      it('last delete button click should delete instance of Message', () => {
        cy.get(entityDeleteButtonSelector).last().click();
        cy.getEntityDeleteDialogHeading('message').should('exist');
        cy.get(entityConfirmDeleteButtonSelector).click();
        cy.wait('@deleteEntityRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(204);
        });
        cy.wait('@entitiesRequest').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
        });
        cy.location('pathname').should('eq', messagePageUrl);

        message = undefined;
      });
    });
  });

  describe('new Message page', () => {
    beforeEach(() => {
      cy.visit(messagePageUrl);
      cy.get(entityCreateButtonSelector).click();
      cy.getEntityCreateUpdateHeading('Message');
    });

    it('should create an instance of Message', () => {
      cy.get(`[data-cy="sentAt"]`).type('2023-12-11T09:08');
      cy.get(`[data-cy="sentAt"]`).blur();
      cy.get(`[data-cy="sentAt"]`).should('have.value', '2023-12-11T09:08');

      cy.get(`[data-cy="fromAddress"]`).type('giant pish');
      cy.get(`[data-cy="fromAddress"]`).should('have.value', 'giant pish');

      cy.get(`[data-cy="senderName"]`).type('than');
      cy.get(`[data-cy="senderName"]`).should('have.value', 'than');

      cy.get(`[data-cy="subject"]`).type('rarely scamper');
      cy.get(`[data-cy="subject"]`).should('have.value', 'rarely scamper');

      cy.get(`[data-cy="body"]`).type('../fake-data/blob/hipster.txt');
      cy.get(`[data-cy="body"]`).invoke('val').should('match', new RegExp('../fake-data/blob/hipster.txt'));

      cy.get(`[data-cy="channel"]`).select('EMAIL');

      cy.get(`[data-cy="status"]`).select('REPLIED');

      cy.get(`[data-cy="priority"]`).select('NORMAL');

      cy.get(entityCreateSaveButtonSelector).click();

      cy.wait('@postEntityRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(201);
        message = response.body;
      });
      cy.wait('@entitiesRequest').then(({ response }) => {
        expect(response?.statusCode).to.equal(200);
      });
      cy.location('pathname').should('eq', messagePageUrl);
    });
  });
});
