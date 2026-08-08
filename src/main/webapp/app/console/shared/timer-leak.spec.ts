import { beforeEach, describe, expect, it, vitest } from 'vitest';

import { ConsoleAuthority } from 'app/shared/auth/console-role';

import { consoleActivatedRoute, provideConsoleTesting, settle, signInAs } from './console-testing';

/**
 * A console spec must survive a predecessor that left fake timers installed.
 *
 * Twenty-four generated list specs call `vitest.useFakeTimers()` at module scope and none of them
 * restore. When one of those runs ahead of a console spec in the same worker, `setTimeout` is faked
 * and `settle()` — four `setTimeout(…, 0)` calls — never resolves. On CI that hung every
 * `beforeEach` in duty-roster.spec.ts and reported as a hook timeout, which reads like slowness and
 * is a deadlock: instrumenting the hook showed 60 real seconds passing between two stamps while
 * `Date.now()` did not move at all.
 *
 * This reproduces the condition directly rather than relying on file ordering, which is what made
 * the original impossible to reproduce off the runner.
 */
describe('console specs against leaked fake timers', () => {
  beforeEach(() => {
    // Exactly what a generated list spec leaves behind.
    vitest.useFakeTimers();
  });

  it('should settle rather than hang when a previous spec faked the clock', async () => {
    const frozen = Date.now();
    provideConsoleTesting([consoleActivatedRoute]);
    signInAs([ConsoleAuthority.ADMIN, ConsoleAuthority.USER]);

    // If provideConsoleTesting did not restore real timers, this never resolves and the test dies
    // on the hook timeout rather than failing here.
    await settle();

    expect(Date.now()).toBeGreaterThanOrEqual(frozen);
    expect(vitest.isFakeTimers()).toBe(false);
  });
});
