// Learn more about Vitest configuration options at https://vitest.dev/config/

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      reportsDirectory: 'target/test-results',
    },

    // Vitest defaults these to 5s and 10s. Comfortable here, not on a CI runner.
    //
    // duty-roster.spec.ts's `beforeEach` resets the TestBed, rebuilds the mock database and renders
    // a full week's grid against it. That is ~400ms on this 16-core machine. On ubuntu-latest its
    // nine hooks have timed out twice — first against the 10s default, then against 30s — while the
    // whole suite ran in under 10s of wall-clock locally on both occasions.
    //
    // The runner is also wildly variable: consecutive runs of the same commit reported 100s and
    // 285s of test time. 60s is sized for the slow end of that, and is a ceiling for a hung test
    // rather than a target. If a hook genuinely approaches it, the answer is a cheaper fixture.
    //
    // Raised unconditionally, unlike maxWorkers below, because a timeout is a correctness threshold
    // and a local run should fail the same way a CI run does.
    testTimeout: 60_000,
    hookTimeout: 60_000,

    // Vitest defaults to roughly one worker per core and each worker boots its own environment.
    // 194 spec files on a 2-4 vCPU runner means workers competing for cores, so a hook costing
    // 400ms of CPU can wait far longer in wall-clock — which is the shape of the failure above.
    //
    // Stated as a hypothesis rather than a diagnosis, because it is not proven: pinning this
    // machine to two cores with `taskset` and running the full suite passes with or without the cap,
    // so the CI failure does not reproduce locally and the cap's effect could not be measured
    // against it. What is measured is that it costs nothing — 14.4s pinned with the cap against
    // 19.0s pinned without.
    //
    // Conditional on CI, and that is a deliberate difference from the timeouts. This is a resource
    // limit, not a threshold: capping a 16-core machine to two workers would slow every local run
    // for no benefit, and unlike a timeout it cannot mask a defect.
    maxWorkers: process.env.CI ? 2 : undefined,
  },
});
