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
   * The professionals note says "joined", not "verified".
   *
   * <p>The demo says "+2 verified" and nothing in this service records when a professional was
   * verified. The api counts who joined; the copy has to say the same thing, or the screen is back
   * to asserting something it has not measured — with a real number underneath it this time, which
   * makes it more convincing and no more true.
   */
  it('describes the professionals note as what the api actually counts', () => {
    expect(kpi.professionalsNote).toContain('joined');
    expect(kpi.professionalsNote).not.toContain('verified');
  });

  /** The unread tile counts a backlog; its note counts arrivals, and says so rather than implying. */
  it('does not describe message inflow as though it were the backlog', () => {
    expect(kpi.unreadMessagesNote).toContain('arrived');
  });
});
