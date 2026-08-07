import { beforeEach, describe, expect, it } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { ConsoleAuthority } from 'app/shared/auth/console-role';

import { provideConsoleTesting, settle, signInAs } from '../shared/console-testing';
import DutyRoster, { SHIFT_CYCLE, nextShift } from './duty-roster';

describe('DutyRoster', () => {
  describe('nextShift', () => {
    it('should cycle unassigned -> DAY -> EVENING -> NIGHT -> OFF -> unassigned', () => {
      expect(nextShift(null)).toBe('DAY');
      expect(nextShift('DAY')).toBe('EVENING');
      expect(nextShift('EVENING')).toBe('NIGHT');
      expect(nextShift('NIGHT')).toBe('OFF');
      // OFF wraps back to unassigned, which is what makes a cell clearable.
      expect(nextShift('OFF')).toBeNull();
    });

    it('should return to the start after a full lap', () => {
      // Five states including unassigned, so five steps come back to
      // unassigned — a cell can always be cleared by clicking round again.
      let shift = null as ReturnType<typeof nextShift>;
      for (const _step of SHIFT_CYCLE) {
        shift = nextShift(shift);
      }
      expect(shift).toBeNull();
    });
  });

  describe('the grid', () => {
    let fixture: ComponentFixture<DutyRoster>;
    let component: DutyRoster;

    beforeEach(async () => {
      provideConsoleTesting([{ provide: ActivatedRoute, useValue: { snapshot: { data: {} } } }]);
      signInAs([ConsoleAuthority.ADMIN, ConsoleAuthority.USER]);

      fixture = TestBed.createComponent(DutyRoster);
      component = fixture.componentInstance;
      component.ngOnInit();
      await settle();
    });

    it('should list every rosterable professional, including one with an empty week', () => {
      // Seven of the nine on file: the two PENDING applicants are excluded and
      // the suspended nurse with no shifts at all still gets a row, because
      // membership is not "has an assignment".
      expect(component.rows().length).toBe(7);
      const empty = component.rows().filter(row => row.cells.every(cell => cell.shift === null));
      expect(empty.length).toBe(1);
    });

    it('should compute cover, gaps and worked shifts the way the prototype does', () => {
      expect(component.totalSlots()).toBe(49);
      expect(component.filledSlots()).toBe(39);
      expect(component.unassignedSlots()).toBe(10);
      expect(component.coverPercent()).toBe(80);
      // OFF is planned but not worked, so it counts toward cover and not here.
      expect(component.workedShifts()).toBe(24);
    });

    it('should tally on-duty per day, excluding OFF', () => {
      const perDay = component.onDutyPerDay();
      expect(perDay.length).toBe(7);
      // Monday: p1 D, p2 E, p3 D, p4 N, p6 D — p5 is OFF, p9 unassigned.
      expect(perDay[0]).toBe(5);
      // Sunday: p2 E, p4 D only.
      expect(perDay[6]).toBe(2);
      expect(perDay.some(count => count < 3)).toBe(true);
    });

    it('should cycle a cell and move the derived counts with it', async () => {
      const row = component.rows().find(candidate => candidate.cells.some(cell => cell.shift === null))!;
      const dayIndex = row.cells.findIndex(cell => cell.shift === null);
      const gapsBefore = component.unassignedSlots();

      component.cycle(row, dayIndex);
      await settle();

      expect(component.rows().find(r => r.professional.id === row.professional.id)!.cells[dayIndex].shift).toBe('DAY');
      expect(component.unassignedSlots()).toBe(gapsBefore - 1);
    });

    it('should clear a cell when the cycle wraps past OFF', async () => {
      const row = component.rows().find(candidate => candidate.cells.some(cell => cell.shift === 'OFF'))!;
      const dayIndex = row.cells.findIndex(cell => cell.shift === 'OFF');
      const gapsBefore = component.unassignedSlots();

      component.cycle(row, dayIndex);
      await settle();

      const cell = component.rows().find(r => r.professional.id === row.professional.id)!.cells[dayIndex];
      expect(cell.shift).toBeNull();
      expect(cell.assignmentId).toBeNull();
      expect(component.unassignedSlots()).toBe(gapsBefore + 1);
    });

    it('should not roster a professional who is not active when auto-filling', async () => {
      component.autoFill();
      await settle();

      const suspended = component.rows().find(row => row.professional.status === 'SUSPENDED');
      expect(suspended?.cells.every(cell => cell.shift === null)).toBe(true);

      const onLeave = component.rows().find(row => row.professional.status === 'ON_LEAVE');
      // Already fully planned as OFF, so auto-fill leaves it alone either way.
      expect(onLeave?.cells.some(cell => cell.shift === 'DAY')).toBe(false);
    });

    it('should fill every gap for active staff when auto-filling', async () => {
      component.autoFill();
      await settle();

      const activeRows = component.rows().filter(row => row.professional.status === 'ACTIVE');
      expect(activeRows.every(row => row.cells.every(cell => cell.shift !== null))).toBe(true);
    });

    it('should publish the week without touching a single assignment', async () => {
      const filledBefore = component.filledSlots();
      component.publish();
      await settle();

      expect(component.week()?.published).toBe(true);
      expect(component.filledSlots()).toBe(filledBefore);
    });
  });

  describe('authority gating', () => {
    let fixture: ComponentFixture<DutyRoster>;
    let component: DutyRoster;

    beforeEach(async () => {
      provideConsoleTesting([{ provide: ActivatedRoute, useValue: { snapshot: { data: {} } } }]);
      signInAs([ConsoleAuthority.SUPERVISOR, ConsoleAuthority.USER]);

      fixture = TestBed.createComponent(DutyRoster);
      component = fixture.componentInstance;
      component.ngOnInit();
      await settle();
    });

    it('should not let a read-only supervisor edit a cell', async () => {
      expect(component.canEdit()).toBe(false);

      const row = component.rows().find(candidate => candidate.cells.some(cell => cell.shift === null))!;
      const dayIndex = row.cells.findIndex(cell => cell.shift === null);
      const gapsBefore = component.unassignedSlots();

      component.cycle(row, dayIndex);
      await settle();

      // The guard is on the method, not only on the template's [disabled].
      expect(component.unassignedSlots()).toBe(gapsBefore);
    });
  });
});
