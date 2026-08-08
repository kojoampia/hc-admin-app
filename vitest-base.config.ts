// Learn more about Vitest configuration options at https://vitest.dev/config/
//
// KNOWN FAILURE, unsolved: duty-roster.spec.ts's nine hooks time out on ubuntu-latest at every
// ceiling tried — 10s, 30s and 60s — while that whole file runs in 399ms on a developer machine and
// the other 193 spec files pass on the same runs.
//
// A 150x gap is not a slower CPU, so "raise the timeout" is the wrong shape of fix, and this note
// exists to stop the next person reaching for it a fourth time. Two hypotheses were tested and
// neither survived:
//
//   - Worker contention. Capping to two workers under CI made it *worse*: test time across three
//     runs went 100s, then 285s, then 551s with the cap in place. Reverted.
//   - Reproducing it locally. Pinning the machine to two cores with `taskset` and running the full
//     suite passes with or without a cap, so the failure does not reproduce off the runner.
//
// What is known: always this file, only this file, always every hook in it, and those hooks do
// nothing exotic — `TestBed.createComponent`, `ngOnInit`, then four macrotask ticks. Worth
// instrumenting the hook on a runner rather than guessing again from the outside.

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      reportsDirectory: 'target/test-results',
    },

    // Vitest defaults these to 5s and 10s, comfortable on a developer machine and not on a runner.
    // 60s covers every spec except the one described above, and is a ceiling for a hung test rather
    // than a target: if a hook genuinely approaches it, the answer is a cheaper fixture.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
