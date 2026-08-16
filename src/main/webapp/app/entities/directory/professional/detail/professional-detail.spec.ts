import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft,
  faBoxArchive,
  faBoxOpen,
  faCalendarAlt,
  faPencilAlt,
  faShieldHalved,
  faSync,
  faTriangleExclamation,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { provideTranslateService } from '@ngx-translate/core';
import { HttpResponse } from '@angular/common/http';
import dayjs from 'dayjs/esm';
import { of, throwError } from 'rxjs';

import { ShiftAssignmentService } from 'app/entities/operations/shift-assignment/service/shift-assignment.service';
import { RosterWeekService } from 'app/entities/operations/roster-week/service/roster-week.service';
import { ProfessionalService } from '../service/professional.service';
import { ProfessionalDetail } from './professional-detail';

describe('Professional Management Detail Component', () => {
  let comp: ProfessionalDetail;
  let fixture: ComponentFixture<ProfessionalDetail>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideTranslateService(),
        provideRouter(
          [
            {
              path: '**',
              loadComponent: () => import('./professional-detail').then(m => m.ProfessionalDetail),
              resolve: { professional: () => of({ id: '2c613901-f64b-4441-b80a-f5fb03b8e466' }) },
            },
          ],
          withComponentInputBinding(),
        ),
      ],
    });
    const library = TestBed.inject(FaIconLibrary);
    library.addIcons(faArrowLeft);
    library.addIcons(faPencilAlt);
    library.addIcons(faBoxArchive);
    library.addIcons(faBoxOpen);
    library.addIcons(faUser, faShieldHalved, faCalendarAlt, faSync, faTriangleExclamation);
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ProfessionalDetail);
    comp = fixture.componentInstance;
  });

  describe('OnInit', () => {
    it('should load professional on init', async () => {
      const harness = await RouterTestingHarness.create();
      const instance = await harness.navigateByUrl('/', ProfessionalDetail);

      // THEN
      expect(instance.professional()).toEqual(expect.objectContaining({ id: '2c613901-f64b-4441-b80a-f5fb03b8e466' }));
    });
  });

  describe('PreviousState', () => {
    it('should navigate to previous state', () => {
      vitest.spyOn(globalThis.history, 'back');
      comp.previousState();
      expect(globalThis.history.back).toHaveBeenCalled();
    });
  });

  describe('Archiving', () => {
    it('should PATCH only isArchived, never the whole record', () => {
      const service = TestBed.inject(ProfessionalService);
      const setArchived = vitest.spyOn(service, 'setArchived').mockReturnValue(of({ id: 'a' }));
      fixture.componentRef.setInput('professional', { id: 'a', isArchived: false });

      comp.toggleArchived();

      expect(setArchived).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }), true);
      expect(comp.isArchived()).toBe(true);
    });

    it('should flip back to Archive when unarchiving', () => {
      const service = TestBed.inject(ProfessionalService);
      vitest.spyOn(service, 'setArchived').mockReturnValue(of({ id: 'a' }));
      fixture.componentRef.setInput('professional', { id: 'a', isArchived: true });

      comp.toggleArchived();

      expect(comp.isArchived()).toBe(false);
    });

    // A failed write must not relabel the button: that would claim the record is
    // archived when the server still says it is not.
    it('should leave the flag alone when the write fails', () => {
      const service = TestBed.inject(ProfessionalService);
      vitest.spyOn(service, 'setArchived').mockReturnValue(throwError(() => new Error('nope')));
      fixture.componentRef.setInput('professional', { id: 'a', isArchived: false });

      comp.toggleArchived();

      expect(comp.isArchived()).toBe(false);
      expect(comp.isSaving()).toBe(false);
    });
  });

  describe('The record header', () => {
    it('should name a clinician with their title', () => {
      fixture.componentRef.setInput('professional', { id: 'p1', profile: { title: 'DR', firstName: 'Ama', lastName: 'Boateng' } });
      expect(comp.fullName()).toBe('Dr. Ama Boateng');
      expect(comp.initials()).toBe('AB');
    });

    it('should fall back to the id when there is no profile', () => {
      fixture.componentRef.setInput('professional', { id: 'p1' });
      expect(comp.fullName()).toBeNull();
      expect(comp.initials()).toBe('P1');
    });
  });

  /**
   * Suspending is not archiving: an archived professional leaves the directory, a suspended one
   * stays in it and cannot work. They write different fields and must not be conflated.
   */
  describe('Suspending', () => {
    it('should PATCH status rather than isArchived', () => {
      const service = TestBed.inject(ProfessionalService);
      const patch = vitest.spyOn(service, 'partialUpdate').mockReturnValue(of({ id: 'p1' }));
      fixture.componentRef.setInput('professional', { id: 'p1', status: 'ACTIVE' });

      comp.toggleSuspended();

      expect(patch).toHaveBeenCalledWith({ id: 'p1', status: 'SUSPENDED' });
      expect(comp.isSuspended()).toBe(true);
      expect(comp.isArchived()).toBe(false);
    });

    it('should reinstate a suspended professional', () => {
      const service = TestBed.inject(ProfessionalService);
      const patch = vitest.spyOn(service, 'partialUpdate').mockReturnValue(of({ id: 'p1' }));
      fixture.componentRef.setInput('professional', { id: 'p1', status: 'SUSPENDED' });

      comp.toggleSuspended();

      expect(patch).toHaveBeenCalledWith({ id: 'p1', status: 'ACTIVE' });
      expect(comp.isSuspended()).toBe(false);
    });

    it('should leave the pill alone when the write fails', () => {
      const service = TestBed.inject(ProfessionalService);
      vitest.spyOn(service, 'partialUpdate').mockReturnValue(throwError(() => new Error('nope')));
      fixture.componentRef.setInput('professional', { id: 'p1', status: 'ACTIVE' });

      comp.toggleSuspended();

      expect(comp.isSuspended()).toBe(false);
      expect(comp.isSaving()).toBe(false);
    });
  });

  describe('Re-verification', () => {
    it('should move the record back to PENDING', () => {
      const service = TestBed.inject(ProfessionalService);
      const patch = vitest.spyOn(service, 'partialUpdate').mockReturnValue(of({ id: 'p1' }));
      fixture.componentRef.setInput('professional', { id: 'p1', verification: 'VERIFIED' });

      comp.requestReverification();

      expect(patch).toHaveBeenCalledWith({ id: 'p1', verification: 'PENDING' });
      expect(comp.verification()).toBe('PENDING');
    });

    it('should do nothing when it is already pending', () => {
      const service = TestBed.inject(ProfessionalService);
      const patch = vitest.spyOn(service, 'partialUpdate');
      fixture.componentRef.setInput('professional', { id: 'p1', verification: 'PENDING' });

      comp.requestReverification();

      expect(patch).not.toHaveBeenCalled();
    });
  });

  describe('This week', () => {
    it('should place each assignment on its own day and leave the rest unassigned', () => {
      vitest
        .spyOn(TestBed.inject(RosterWeekService), 'query')
        .mockReturnValue(of(new HttpResponse({ body: [{ id: 'w1', startDate: dayjs('2026-08-03') }] })));
      vitest.spyOn(TestBed.inject(ShiftAssignmentService), 'query').mockReturnValue(
        of(
          new HttpResponse({
            body: [
              { id: 's1', dayIndex: 0, shift: 'DAY', professional: { id: 'p1' }, week: { id: 'w1' } },
              { id: 's2', dayIndex: 3, shift: 'OFF', professional: { id: 'p1' }, week: { id: 'w1' } },
              // Another professional's shift, which must not appear on this record.
              { id: 's3', dayIndex: 1, shift: 'NIGHT', professional: { id: 'p2' }, week: { id: 'w1' } },
            ],
          }),
        ) as any,
      );

      fixture.componentRef.setInput('professional', { id: 'p1' });
      fixture.detectChanges();

      expect(comp.week()).toHaveLength(7);
      expect(comp.week()[0].shift).toBe('DAY');
      expect(comp.week()[1].shift).toBeNull();
      expect(comp.week()[3].shift).toBe('OFF');
      expect(comp.week()[0].date?.format('YYYY-MM-DD')).toBe('2026-08-03');
    });

    it('should be empty when no week is published', () => {
      vitest.spyOn(TestBed.inject(RosterWeekService), 'query').mockReturnValue(of(new HttpResponse({ body: [] })));
      vitest.spyOn(TestBed.inject(ShiftAssignmentService), 'query').mockReturnValue(of(new HttpResponse({ body: [] })));

      fixture.componentRef.setInput('professional', { id: 'p1' });
      fixture.detectChanges();

      expect(comp.week()).toEqual([]);
    });
  });
});
