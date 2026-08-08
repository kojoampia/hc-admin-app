import { defineConfig } from 'cypress';

export default defineConfig({
  video: false,
  fixturesFolder: 'src/test/javascript/cypress/fixtures',
  screenshotsFolder: 'target/cypress/screenshots',
  downloadsFolder: 'target/cypress/downloads',
  videosFolder: 'target/cypress/videos',
  chromeWebSecurity: true,
  viewportWidth: 1200,
  viewportHeight: 720,
  retries: 2,
  allowCypressEnv: false,
  expose: {
    // A real gateway checks these. They are the `dev` profile's seeded admin from
    // hc-admin-gateway's hc-admin-gw-data.json — the console logins these used to name
    // (efua.mensah@abofonsa.care and friends) existed only in the in-browser mock, which
    // was removed in #11, and no gateway has ever held them.
    adminUsername: 'admin',
    adminPassword: 'Admin@01234',
    username: 'admin',
    password: 'Admin@01234',
    authenticationUrl: '/api/authenticate',
    jwtStorageName: 'abf-authenticationToken',
  },
  e2e: {
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
    async setupNodeEvents(on, config) {
      return (await import('./src/test/javascript/cypress/plugins/index')).default(on, config);
    },
    baseUrl: 'http://localhost:9000/',
    specPattern: 'src/test/javascript/cypress/e2e/**/*.cy.ts',
    supportFile: 'src/test/javascript/cypress/support/index.ts',
    experimentalRunAllSpecs: true,
  },
});
