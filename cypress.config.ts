import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'cypress';

const SPEC_ROOT = 'src/test/javascript/cypress/e2e';

/**
 * The spec sets, and why a run has to choose one.
 *
 * <p>Some of these specs write to the backend they run against — a task is created, a message is
 * marked read, a shift is cycled — and Cypress does not reseed between specs. `dev`/`test` seed data
 * is applied by `DevelopmentDataInitializer` at application START, so nothing puts it back until the
 * api restarts, and even then only rows carrying seeded ids are upserted: anything created under a
 * generated id stays.
 *
 * <p>That is fine against `deploy/e2e/compose.yml`, which has no volume and is destroyed with the
 * job. It is not fine against jacserver's quality stack, where the same database is what
 * `startup.sh --verify` reads — a spec that raises a task moves a dashboard tile for every later
 * reader, and the failure arrives later, somewhere else, naming something unrelated.
 *
 * <p><b>So `read-only` is the default and the other set is opt-in</b>, on the same principle as
 * `--images=local` over there: the safe thing happens when nobody chose, and choosing says so on
 * every run.
 *
 * <p>There is a second reason the two sets cannot simply be concatenated, and it is worth knowing
 * before anyone tries. Cypress runs specs in alphabetical order, `message-desk.cy.ts` raises a task
 * from a thread, and `task-board.cy.ts` — five files later — asserts the seeded columns hold exactly
 * 5/4/4 cards. One pass over the whole folder is red on a pristine stack, and reads as a broken task
 * board.
 */
type SpecSet = 'read-only' | 'mutating';

/**
 * Every spec must declare which set it is in, on a line of its own:
 *
 *     // e2e-fixture: read-only
 *     // e2e-fixture: mutating
 *
 * <p>Deliberately a marker in the file rather than a list here. A list is an enumeration somebody
 * has to remember to extend, and this repository's sibling has the lesson written down: `PaginationIT`
 * asserted a literal list of 23 paths and silently stopped covering the eight entities generated
 * after it was written. A spec with no marker fails the run below and names itself, so the question
 * is asked of whoever adds the file, which is the only person who knows the answer.
 */
const MARKER = /^\/\/ e2e-fixture: (read-only|mutating)\s*$/m;

const specFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return specFiles(path);
    }
    return entry.name.endsWith('.cy.ts') ? [path] : [];
  });

const specsIn = (set: SpecSet): string[] => {
  const all = specFiles(SPEC_ROOT).sort();
  const undeclared = all.filter(path => !MARKER.exec(readFileSync(path, 'utf8')));
  if (undeclared.length > 0) {
    throw new Error(
      `These specs do not declare a fixture set:\n  ${undeclared.join('\n  ')}\n` +
        `Add one of these as a line of its own, near the top:\n` +
        `  // e2e-fixture: read-only   (asserts, never writes)\n` +
        `  // e2e-fixture: mutating    (writes to the backend; run only against a throwaway stack)\n` +
        `See the note above MARKER in cypress.config.ts for why this is not a list in one place.`,
    );
  }

  const chosen = all.filter(path => MARKER.exec(readFileSync(path, 'utf8'))![1] === set);
  if (chosen.length === 0) {
    throw new Error(`No spec declares "${set}". Nothing would run, which a green result would not distinguish from a passing suite.`);
  }
  return chosen;
};

const requested = process.env.ABF_E2E_SPECS ?? 'read-only';
if (requested !== 'read-only' && requested !== 'mutating') {
  throw new Error(`ABF_E2E_SPECS must be "read-only" or "mutating"; got "${requested}".`);
}
const specSet: SpecSet = requested;
const specPattern = specsIn(specSet);

// Said on every run, both ways round, because either default is wrong somewhere: a `read-only` run
// that the reader thought was the whole suite is a false all-clear, and a `mutating` run against the
// quality stack is a fixture nobody restores.
/* eslint-disable-next-line no-console */
console.log(
  `cypress: running the ${specSet} spec set (${specPattern.length} specs). ` +
    `ABF_E2E_SPECS=mutating selects the writing ones — throwaway stacks only.`,
);

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
    // 9000 is the console's port whichever thing is serving it: `ng serve` binds it
    // (angular.json), and `deploy/e2e/compose.yml` publishes the console container on it. That is
    // why no script and no spec has to know which is running.
    baseUrl: 'http://localhost:9000/',
    // A resolved list of files, not a glob — the glob is what `specsIn` walked. See MARKER above.
    specPattern,
    supportFile: 'src/test/javascript/cypress/support/index.ts',
    experimentalRunAllSpecs: true,
  },
});
