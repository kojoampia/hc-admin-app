// Learn more about Vitest configuration options at https://vitest.dev/config/

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      reportsDirectory: 'target/test-results',

      // A floor at what the suite already covers, so it can only go up.
      //
      // Measured 2026-08-23 at 64.14 / 63.75 / 77.24 / 67.53 and set one point below each, rounded
      // down. Two reasons for the gap rather than pinning the exact number: a threshold equal to
      // current coverage fails on a rounding difference in an unrelated change, and the point of a
      // ratchet is to catch a real regression rather than to punish noise.
      //
      // `api` and `gateway` have carried JaCoCo minima since the August audit — 0.70 instruction,
      // 0.45 branch — and the console had none, so its coverage was measured on every run and
      // enforced on none. Raise these when the number rises; that is the whole mechanism.
      thresholds: {
        statements: 63,
        branches: 62,
        functions: 76,
        lines: 66,
      },
    },

    // Hands real timers back at the end of every spec file. Twenty-four generated list specs install
    // fake timers at module scope and none of them restore, which froze `Date.now()` and the global
    // `setTimeout` for whatever ran next in the same worker. See the file itself for the full story;
    // it is the reason duty-roster.spec.ts hung on CI and nowhere else.
    setupFiles: ['src/main/webapp/vitest-setup.ts'],

    // Left at Vitest's defaults deliberately. Raising them to 30s and then 60s was my attempt at
    // that hang before it was understood, and it made things strictly worse: nine hooks waiting on
    // a timer that could never fire simply waited longer, and the suite's reported test time tracked
    // the ceiling almost exactly — 100s, then 285s, then 551s. A timeout cannot fix a deadlock, and
    // leaving the defaults in place means the next one surfaces in seconds instead of minutes.
  },
});
