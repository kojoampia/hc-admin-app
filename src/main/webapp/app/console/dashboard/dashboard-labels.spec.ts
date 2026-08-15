import { describe, expect, it } from 'vitest';

import { ProfessionalRole } from 'app/entities/enumerations/professional-role.model';

import dashboard from '../../../i18n/en/dashboard.json';

/**
 * Every role the account-mix chart can be handed has a label.
 *
 * <p>`GET /api/dashboard/metrics` builds `accountMix` by grouping professionals on
 * `ProfessionalRole`, so the segment keys are enum constants — `DOCTOR`, `NURSE` — not the
 * `patients` / `professionals` / `vendors` the chart was first written against. ngx-translate
 * returns the key it was given when there is no entry, so the mismatch was not an error anywhere:
 * it was `dashboard.charts.mix.DOCTOR` rendered as a chart label, in the legend, the SVG and the
 * table view at once.
 *
 * <p>The enum is the contract, so drive the test from it. A role added to `ProfessionalRole` — the
 * api's copy and this one are generated together — fails here rather than on the screen.
 */
describe('account mix labels', () => {
  const roles = dashboard.dashboard.charts.mix.roles as Record<string, string>;

  it.each(Object.values(ProfessionalRole))('labels the %s role', role => {
    expect(roles[role]).toBeTruthy();
  });

  it('carries no label for a segment the api cannot return', () => {
    // The chart used to show a patient/professional/vendor split. It does not any more, and a
    // leftover key here is a sign the copy has drifted back to describing that.
    expect(Object.keys(roles).sort()).toEqual(Object.values(ProfessionalRole).sort());
  });
});
