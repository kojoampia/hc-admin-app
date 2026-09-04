import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import DutyRoster, { SHIFT_CYCLE, nextShift } from './duty-roster';

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
