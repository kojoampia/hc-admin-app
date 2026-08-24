import { describe, expect, it } from 'vitest';

import dashboard from '../../../i18n/en/dashboard.json';

/**
 * The KPI notes, which used to be sentences and are now templates.
 *
 * <p>Item 14: "▲ +3 this week" sat under a patient count of 12 and "+2 verified" under 9
 * professionals — on the demo and on the console alike — and neither could ever change. They were
 * copy shaped like a measurement, which is the worst kind: nothing on the screen distinguishes an
 * out-of-date number from a live one.
 *
 * <p>Each string now interpolates `{{count}}` from `deltas` on the metrics payload. A template that
 * lost its placeholder would render a fixed sentence again and nothing would fail — this is what
 * fails instead.
 */
describe('KPI notes', () => {
  const kpi = dashboard.dashboard.kpi as Record<string, string>;

  /** The four tiles, and the delta key each one's note is filled from. */
  const NOTES = ['patientsNote', 'professionalsNote', 'unreadMessagesNote', 'openTasksNote'];

  it.each(NOTES)('%s interpolates a measured count', key => {
    expect(kpi[key]).toContain('{{count}}');
  });

  /**
   * The professionals note says "verified", and the api counts verifications.
   *
   * <p>This assertion used to be the inverse — "joined", not "verified" — because nothing recorded
   * when a professional was verified and the copy had to say what was actually measured. The
   * measurement arrived on 2026-08-24 with the verification history, so `deltas.professionals` now
   * counts decisions rather than arrivals and the caption is literal.
   *
   * <p>The rule the old assertion protected has not changed and is why this one is still here: the
   * note must name what the number is. If `DashboardMetricsService.deltas()` is ever pointed back at
   * `joined_on`, this fails — which is the point. `professionalsJoined` carries the arrivals count
   * separately for anything that wants it.
   */
  it('describes the professionals note as what the api actually counts', () => {
    expect(kpi.professionalsNote).toContain('verified');
    expect(kpi.professionalsNote).not.toContain('joined');
  });

  /** The unread tile counts a backlog; its note counts arrivals, and says so rather than implying. */
  it('does not describe message inflow as though it were the backlog', () => {
    expect(kpi.unreadMessagesNote).toContain('arrived');
  });
});
