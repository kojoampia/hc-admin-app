import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { readFileSync } from 'node:fs';

import dayjs from 'dayjs/esm';

import DutyRoster, { MAX_VISITS_PER_ROUND, SHIFT_CYCLE, nextShift, visitWindow } from './duty-roster';

/**
 * The grid's arithmetic, which the dashboard now has to match.
 *
 * <p>The hero said "roster cover at 0% for the week" while this screen, one click away, said 80%
 * over the same roster. Both were internally consistent and neither was obviously wrong — they did
 * not mean the same thing by "cover", and nothing on either side asserted what it meant.
 *
 * <p>These figures are the definition the api adopted, so the numbers below are deliberately the
 * same ones `RosterCoverIT.coverIsTheGridsFraction` asserts server-side: two rosterable
 * professionals, nine planned cells of fourteen, one of them OFF. <b>If you change a number here,
 * that suite has to change with it</b> — which is the point, because the alternative is the two
 * drifting apart in silence again.
 */
describe('duty roster figures', () => {
  let component: DutyRoster;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideTranslateService()],
    });
    // Constructed in an injection context rather than rendered: these are pure computed signals over
    // `rows`, and going through the template would drag in the whole entity stack to assert nothing
    // extra. `ngOnInit` is deliberately never called, so no request is made.
    component = TestBed.runInInjectionContext(() => new DutyRoster());
  });

  /** Nine of fourteen — a fraction no rounding accident and no all-or-nothing formula can reach. */
  it('measures cover against the whole grid, not against the cells that are filled', () => {
    component.rows.set([
      row('p1', ['DAY', 'DAY', 'OFF', 'NIGHT', 'EVENING', null, null]),
      row('p2', ['NIGHT', 'NIGHT', 'DAY', 'DAY', null, null, null]),
    ]);

    expect(component.totalSlots()).toBe(14);
    expect(component.filledSlots()).toBe(9);
    expect(component.coverPercent()).toBe(64);
    expect(component.unassignedSlots()).toBe(5);
    expect(component.rows().length).toBe(2);
    // Eight, not nine: OFF is planned, but it is not a shift.
    expect(component.workedShifts()).toBe(8);
  });

  /**
   * A professional with an entirely empty week is still a row.
   *
   * <p>They are the person the screen exists to surface. Were capacity taken from "professionals who
   * have a shift" instead of from the grid, their seven empty cells would leave both the numerator
   * and the denominator, and a half-planned roster would report itself fully covered.
   */
  it('counts an unrostered professional as capacity', () => {
    component.rows.set([
      row('p1', ['DAY', 'DAY', 'DAY', 'DAY', 'DAY', 'DAY', 'DAY']),
      row('p2', [null, null, null, null, null, null, null]),
    ]);

    expect(component.coverPercent()).toBe(50);
    expect(component.unassignedSlots()).toBe(7);
  });

  /** An empty roster is uncovered, not perfectly covered, and an empty grid must not divide by zero. */
  it('reports no cover rather than full cover for an empty grid', () => {
    component.rows.set([]);

    expect(component.coverPercent()).toBe(0);
    expect(component.unassignedSlots()).toBe(0);
  });

  /**
   * `FLEXIBLE` is a worked shift, and the three cell states do not move because of it.
   *
   * <p>The states this grid has to keep apart are *no row*, *rostered rest* and *worked*. Adding a
   * fifth enum value adds a worked one, so `unassignedSlots` stays a subtraction from capacity and
   * `OFF` stays the only planned value that is not a shift. The row below is deliberately the same
   * shape as the cover fixture with one `DAY` swapped for a `FLEXIBLE`: every figure has to be
   * unchanged, which is a stronger statement than any of them being right.
   */
  it('counts a flexible block as worked, leaving the three cell states where they were', () => {
    component.rows.set([
      row('p1', ['FLEXIBLE', 'DAY', 'OFF', 'NIGHT', 'EVENING', null, null]),
      row('p2', ['NIGHT', 'NIGHT', 'DAY', 'DAY', null, null, null]),
    ]);

    expect(component.filledSlots()).toBe(9);
    expect(component.unassignedSlots()).toBe(5);
    expect(component.coverPercent()).toBe(64);
    // Still eight, and still because of the OFF rather than because of the FLEXIBLE.
    expect(component.workedShifts()).toBe(8);
    expect(component.onDutyPerDay()[0]).toBe(2);
  });

  /**
   * The cycle, and specifically where `FLEXIBLE` sits in it.
   *
   * <p>`OFF` has to remain the last stop before the wrap, because it is the wrap **past `OFF`** that
   * deletes the assignment — unassigned is the absence of a row, not a row with a null shift. Append
   * `FLEXIBLE` at the end instead and cycling past a rest day produces a shift rather than clearing
   * the cell, which is a different grid and would not fail any of the arithmetic above.
   */
  it('cycles unassigned -> day -> evening -> night -> flexible -> off -> unassigned', () => {
    expect(SHIFT_CYCLE).toEqual([null, 'DAY', 'EVENING', 'NIGHT', 'FLEXIBLE', 'OFF']);

    expect(nextShift(null)).toBe('DAY');
    expect(nextShift('NIGHT')).toBe('FLEXIBLE');
    expect(nextShift('FLEXIBLE')).toBe('OFF');
    expect(nextShift('OFF')).toBeNull();
  });

  function row(id: string, shifts: (string | null)[]): any {
    return {
      professional: { id, status: 'ACTIVE' },
      name: id,
      cells: shifts.map((shift, dayIndex) => ({ dayIndex, shift, assignmentId: shift === null ? null : `${id}-${dayIndex}` })),
    };
  }
});

/**
 * Planning writes to another stack, so this screen has to be able to say so.
 *
 * <p>Decision 10 of the roster migration: an empty roster grid and an unreachable roster service
 * must not look alike. Three states have to stay distinguishable — filed, could not be staffed,
 * could not be filed — and the last of them has to be a standing panel rather than a toast, because
 * a toast is gone by the time anybody asks why the roster is empty.
 */
describe('duty roster planning', () => {
  const template = readFileSync('src/main/webapp/app/console/duty-roster/duty-roster.html', 'utf8');
  let component: DutyRoster;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideTranslateService()],
    });
    component = TestBed.runInInjectionContext(() => new DutyRoster());
  });

  /**
   * The publish call no longer sends `publishedAt`.
   *
   * <p>The api derives it from `published` and discards whatever arrives, so a client that still
   * sent one would be writing a value nothing reads — the two would differ with nothing failing.
   * Asserted on the request body rather than on the component, because the component is not where
   * it would come back.
   */
  it('publishes without claiming a publication time', () => {
    const sent: any[] = [];
    (component as any).rosterWeekService = { partialUpdate: (week: any) => (sent.push(week), { subscribe: () => undefined }) };
    component.week.set({ id: 'week-1', label: 'W', published: false });

    component.publish();

    expect(sent).toHaveLength(1);
    expect(sent[0]).toEqual({ id: 'week-1', published: true });
    expect(sent[0]).not.toHaveProperty('publishedAt');
  });

  /**
   * A failed cross-stack write is a standing panel on the screen, and it is not the same panel as a
   * failed call to our own api.
   *
   * <p>Read out of the template, because that is where the decision lives: a spec asserting a signal
   * would pass against a component that set the flag and rendered nothing.
   */
  it('renders an outage panel for a failed cross-stack write, distinct from a failed request', () => {
    expect(template).toContain('data-cy="rosterServiceOutage"');
    expect(template).toContain('data-cy="planCallFailed"');
    expect(template).toContain('!result.rosterServiceReachable');
    // role="alert" on both: an outage has to reach a screen reader, not only a sighted reader.
    expect(template.match(/role="alert"/g) ?? []).toHaveLength(2);
  });

  /** Filed, not staffed and not filed are three renderings, and colour is never the only signal. */
  it('renders the three round outcomes distinctly', () => {
    expect(template).toContain("@case ('PLANNED')");
    expect(template).toContain("@case ('UNPLANNED')");
    expect(template).toContain("@case ('FAILED')");
    expect(template).toContain("'plan-result plan-result--' + round.outcome.toLowerCase()");
  });

  /** `OFF` is not offered: hc-professional refuses visits on a rest day, so the round would 400. */
  it('offers the four worked shifts and not OFF', () => {
    expect(component.planShifts).toEqual(['DAY', 'EVENING', 'NIGHT', 'FLEXIBLE']);
  });

  /**
   * Visit times land inside their shift's window, and successive visits do not overlap.
   *
   * <p>Both are rules hc-professional enforces with a 400, and both would arrive back here as "the
   * roster service refused the round" — which reads as a server fault rather than as a client that
   * sent 09:00 for a night shift. The night case is the one worth pinning: 23:00 belongs to the
   * round's own date and 00:00 to the next, which is the wrap the whole shift model turns on.
   */
  it('places visits inside the shift window and one hour apart', () => {
    expect(visitWindow('DAY', 0)).toEqual({ startTime: '08:00', endTime: '09:00' });
    expect(visitWindow('EVENING', 0)).toEqual({ startTime: '16:00', endTime: '17:00' });
    expect(visitWindow('NIGHT', 0)).toEqual({ startTime: '23:00', endTime: '00:00' });
    expect(visitWindow('NIGHT', 1)).toEqual({ startTime: '00:00', endTime: '01:00' });
    expect(visitWindow('FLEXIBLE', 0)).toEqual({ startTime: '10:00', endTime: '11:00' });
    // Second visit on a day round starts where the first ended, so they cannot overlap.
    expect(visitWindow('DAY', 1)).toEqual({ startTime: '09:00', endTime: '10:00' });
  });

  /**
   * The last visit that fits, and the first that does not.
   *
   * <p>`visitWindow` walks an hour per visit and nothing stopped it walking out of the shift, so an
   * eighth visit on a `DAY` round ran 15:00–16:00 and hc-professional refused the whole round. The
   * user was then told `ROSTER_SERVICE_REFUSED_THE_ROUND` — the far stack named for something they
   * typed in this box, with no way to connect the two.
   *
   * <p>Asserted against the window bounds rather than against the constant, so the cap and the
   * arithmetic cannot drift apart quietly. Both ends are inclusive in
   * `DutyRosterService.resolve`, which is why the last visit may end exactly on the boundary.
   */
  it('caps visits at the last one that fits inside the shift', () => {
    expect(visitWindow('DAY', MAX_VISITS_PER_ROUND.DAY - 1)).toEqual({ startTime: '14:00', endTime: '15:00' });
    expect(visitWindow('EVENING', MAX_VISITS_PER_ROUND.EVENING - 1)).toEqual({ startTime: '22:00', endTime: '23:00' });
    expect(visitWindow('NIGHT', MAX_VISITS_PER_ROUND.NIGHT - 1)).toEqual({ startTime: '06:00', endTime: '07:00' });
    expect(visitWindow('FLEXIBLE', MAX_VISITS_PER_ROUND.FLEXIBLE - 1)).toEqual({ startTime: '22:00', endTime: '23:00' });

    // And one past the cap leaves the window, which is what the far service refuses.
    expect(visitWindow('DAY', MAX_VISITS_PER_ROUND.DAY)).toEqual({ startTime: '15:00', endTime: '16:00' });
    expect(visitWindow('NIGHT', MAX_VISITS_PER_ROUND.NIGHT)).toEqual({ startTime: '07:00', endTime: '08:00' });
  });

  /** An OFF round carrying any visit at all is refused over there, so the cap is zero rather than small. */
  it('allows no visits on an OFF round', () => {
    expect(MAX_VISITS_PER_ROUND.OFF).toBe(0);
  });

  /**
   * The count is refused here, so the message names the input rather than the far service.
   *
   * <p>`canPlan()` is what the Plan button is disabled on, so this is the half a user meets.
   */
  it('refuses to plan more visits than the shift can hold', () => {
    component.week.set({ id: 'week-1', label: 'W', startDate: dayjs('2026-08-10') });
    component.planSpaceId = 'space-osu';
    component.planName = 'Morning round';
    component.planShift = 'DAY';

    component.planCustomerIds = Array.from({ length: MAX_VISITS_PER_ROUND.DAY }, (_, i) => `patient-${i}`).join(',');
    expect(component.tooManyVisits()).toBeNull();
    expect(component.canPlan()).toBe(true);

    component.planCustomerIds += ',patient-one-too-many';
    expect(component.visitCount()).toBe(MAX_VISITS_PER_ROUND.DAY + 1);
    expect(component.tooManyVisits()).toBe(MAX_VISITS_PER_ROUND.DAY + 1);
    expect(component.canPlan()).toBe(false);
  });

  /** Blank entries are dropped before counting, so trailing commas do not cost a visit. */
  it('counts only the ids that will become visits', () => {
    component.planCustomerIds = ' patient-a , , patient-b,  ,';
    expect(component.visitCount()).toBe(2);
  });

  /** The panel will not submit an unnamed or unplaced round; the api would refuse it anyway. */
  it('refuses to plan without an area and a name', () => {
    component.week.set({ id: 'week-1', label: 'W', startDate: dayjs('2026-08-10') });
    expect(component.canPlan()).toBe(false);

    component.planSpaceId = 'space-osu';
    expect(component.canPlan()).toBe(false);

    component.planName = 'Morning round';
    expect(component.canPlan()).toBe(true);
  });

  /** The date planned for is the chosen day of the week on screen, not "today". */
  it('plans for the chosen day of the displayed week', () => {
    component.week.set({ id: 'week-1', label: 'W', startDate: dayjs('2026-08-10') });
    component.planDayIndex = 3;

    expect(component.planDate()?.format('YYYY-MM-DD')).toBe('2026-08-13');
  });
});
