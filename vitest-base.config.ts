// Learn more about Vitest configuration options at https://vitest.dev/config/

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      reportsDirectory: 'target/test-results',
    },

    // Vitest defaults both of these to 5s and 10s. That is comfortable on a developer machine and
    // marginal on a CI runner: the whole suite takes about 10s of test time here and about 100s on
    // ubuntu-latest, and the console specs are the slowest in it — each `beforeEach` resets the
    // TestBed, rebuilds the mock database and renders a real screen against it, and duty-roster
    // builds a full week's grid. Nine of its hooks timed out on the first CI run while passing
    // locally every time.
    //
    // Raised rather than made conditional on CI, so a local run fails the same way a CI run does.
    // These are ceilings for a hung test, not a target — if a hook ever genuinely approaches 30s,
    // the answer is a cheaper fixture, not a larger number here.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
