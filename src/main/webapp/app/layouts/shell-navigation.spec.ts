import { describe, expect, it } from 'vitest';

import global from '../../i18n/en/global.json';

import { QUICK_ADD, SHELL_NAVIGATION } from './shell-navigation';

/**
 * The topbar's New menu, and the rule about what belongs in it.
 *
 * <p>Patient, professional and vendor were removed on 2026-08-22. Each is a person or an
 * organisation with an intake behind it, and the two that end in an account elsewhere — patients and
 * clinicians both register on their own stacks — are not the administrator's to invent from the
 * chrome. What is left is operational work the administrator genuinely authors.
 *
 * <p>This is pinned rather than left to review because the menu is a five-line const: adding a
 * create route back to it is a one-line change that reads as an improvement.
 */
describe('quick-add menu', () => {
  const labels = global.global.menu.quickAdd as Record<string, string>;

  it('offers only work the administrator authors', () => {
    expect(QUICK_ADD.map(item => item.route)).toEqual(['/task/new', '/service-activity/new']);
  });

  /** The three removed routes are the ones that must not come back through this menu. */
  it.each(['/patient/new', '/professional/new', '/vendor/new'])('does not offer %s', route => {
    expect(QUICK_ADD.some(item => item.route === route)).toBe(false);
  });

  /**
   * Creation moved off the global menu; it did not go away.
   *
   * <p>The three directories are still reachable from the sidebar and still carry their own Create
   * buttons, which is the distinction this change turns on.
   */
  it.each(['patient', 'professional', 'vendor'])('keeps the %s directory in the navigation', route => {
    expect(SHELL_NAVIGATION.some(item => item.route === route)).toBe(true);
  });

  /** Every remaining entry has a label, and no label outlives the entry it was written for. */
  it('carries exactly the labels the menu still uses', () => {
    expect(Object.keys(labels).sort()).toEqual(['serviceActivity', 'task']);
    QUICK_ADD.forEach(item => expect(labels[item.label.split('.').pop()!]).toBeTruthy());
  });
});
