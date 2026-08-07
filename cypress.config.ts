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
    // The mock auth layer accepts any password for a known console login;
    // the role comes from the login, not the credential. See
    // src/main/webapp/app/core/mock/mock-auth.ts.
    adminUsername: 'efua.mensah@abofonsa.care',
    adminPassword: 'demopassword',
    username: 'efua.mensah@abofonsa.care',
    password: 'demopassword',
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
