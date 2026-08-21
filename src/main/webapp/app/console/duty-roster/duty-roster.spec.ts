import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import DutyRoster from './duty-roster';

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

  function row(id: string, shifts: (string | null)[]): any {
    return {
      professional: { id, status: 'ACTIVE' },
      name: id,
      cells: shifts.map((shift, dayIndex) => ({ dayIndex, shift, assignmentId: shift === null ? null : `${id}-${dayIndex}` })),
    };
  }
});
