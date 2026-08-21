import { describe, expect, it } from 'vitest';

import { ProfessionalRole } from 'app/entities/enumerations/professional-role.model';

import dashboard from '../../../i18n/en/dashboard.json';

/**
 * Every segment the account-mix chart can be handed has a label.
 *
 * <p>`instant()` returns the key it was given when there is no entry, so a missing label is not an
 * error anywhere: it is `dashboard.charts.mix.patients` rendered as a chart label, in the legend,
 * the SVG and the table at once. That has happened here before — the chart grouped professionals by
 * `ProfessionalRole` and the copy only covered the roles the enum held the day it was written.
 *
 * <p>Item 10 replaced that chart with the network's own split, so the keys are now three fixed
 * strings the api builds from `NetworkTotals` rather than enum constants it discovers. The guard is
 * the same shape and cheaper to keep true: these three, and no orphans beside them.
 */
describe('account mix labels', () => {
  const mix = dashboard.dashboard.charts.mix as Record<string, unknown>;

  /** The keys `DashboardMetricsService.accountMix()` emits, in the order it emits them. */
  const SEGMENTS = ['patients', 'professionals', 'vendors'];

  it.each(SEGMENTS)('labels the %s segment', key => {
    expect(mix[key]).toBeTruthy();
  });

  /**
   * The roles dictionary is gone with the chart it fed.
   *
   * <p>Left behind it would read as though the professionals-by-role chart were still wanted — the
   * decision was that it comes off the dashboard entirely, because the professional directory
   * already carries role tiles that filter, which is the better home for that question.
   */
  it('carries no leftover role dictionary from the chart this replaced', () => {
    expect(mix.roles).toBeUndefined();
    Object.values(ProfessionalRole).forEach(role => expect(mix[role]).toBeUndefined());
  });

  /** A label for something the api cannot send is a sign the copy has drifted back. */
  it('labels nothing the chart cannot show', () => {
    const labelled = Object.keys(mix).filter(key => !['title', 'subtitle', 'type', 'accounts', 'share'].includes(key));
    expect(labelled.sort()).toEqual([...SEGMENTS].sort());
  });
});
