import { afterAll, vitest } from 'vitest';

/**
 * Hand real timers back at the end of every spec file.
 *
 * Twenty-four generated `list/…spec.ts` files call `vitest.useFakeTimers()` at module scope, and
 * `alert.service.spec.ts` calls it in a `beforeEach`. Not one of them ever calls
 * `useRealTimers()` — before this file, that string did not appear in the repository at all.
 *
 * Fake timers replace the global `setTimeout` and freeze `Date.now()`. A file that installs them and
 * never restores leaves them installed for whatever runs next in the same worker, so a later spec
 * awaiting a real timer waits forever.
 *
 * That is what it did. `console-testing`'s `settle()` awaits four `setTimeout(…, 0)` calls, so every
 * `beforeEach` in `duty-roster.spec.ts` hung at exactly that line on CI and nowhere else — the file
 * ordering that put a fake-timer spec ahead of it in the same worker happened on the runner and not
 * on a developer machine. It presented as nine hook timeouts, which reads like slowness and is not:
 * instrumenting the hook showed every stamp reporting `t=0ms`, because `Date.now()` was frozen.
 *
 * `afterAll` rather than `afterEach`: the twenty-four install once at module scope and their own
 * tests depend on fake timers, so restoring between tests would break them. Restoring when the file
 * is done leaves behaviour inside each file untouched and stops the leak at the boundary.
 */
afterAll(() => {
  vitest.useRealTimers();
});
