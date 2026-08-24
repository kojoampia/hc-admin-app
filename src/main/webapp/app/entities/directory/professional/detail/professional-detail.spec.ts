import { MockInstance, beforeEach, describe, expect, it, vitest } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft,
  faBoxArchive,
  faBan,
  faBoxOpen,
  faCalendarAlt,
  faCheck,
  faClockRotateLeft,
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
import { ProfessionalVerificationService } from '../service/professional-verification.service';
import { ProfessionalDetail } from './professional-detail';

describe('Professional Management Detail Component', () => {
  let comp: ProfessionalDetail;
  let fixture: ComponentFixture<ProfessionalDetail>;
  let verificationHistory: MockInstance;
  let recordVerification: MockInstance;

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
    // clock-rotate-left and the two decision icons go in with the rest: an icon missing from
    // the library throws at render, so every test in this file fails on the chrome rather than
    // on what it asserts.
    library.addIcons(faUser, faShieldHalved, faCalendarAlt, faSync, faTriangleExclamation, faClockRotateLeft, faCheck, faBan);
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ProfessionalDetail);
    comp = fixture.componentInstance;
    // Setting `professional` now also loads the verification history. Stubbed by default so every
    // test below is asserting its own subject rather than answering a request it does not care
    // about; the cases that are about the history override it.
    verificationHistory = vitest.spyOn(TestBed.inject(ProfessionalVerificationService), 'history').mockReturnValue(of([]));
    recordVerification = vitest
      .spyOn(TestBed.inject(ProfessionalVerificationService), 'record')
      .mockImplementation(request => of({ id: 'v-new', status: request.status, recordedAt: dayjs(), recordedBy: 'admin' }));
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

  /**
   * Verification is recorded, not patched.
   *
   * Until 2026-08-24 each of these actions was a `PATCH { verification: ... }` on the professional,
   * and the assertions below were written against that. The field is now server-written from a
   * recorded decision, so the console posts the decision — which is why the first case asserts that
   * `partialUpdate` is **not** called: reintroducing the patch would restore a path where the badge
   * can be set with nothing behind it, and would leave every other assertion here passing.
   */
  describe('Verification', () => {
    it('should record a PENDING decision rather than patching the professional', () => {
      const patch = vitest.spyOn(TestBed.inject(ProfessionalService), 'partialUpdate');
      fixture.componentRef.setInput('professional', { id: 'p1', verification: 'VERIFIED' });

      comp.requestReverification();

      expect(recordVerification).toHaveBeenCalledWith({ professionalId: 'p1', status: 'PENDING' });
      expect(patch).not.toHaveBeenCalled();
      expect(comp.verification()).toBe('PENDING');
    });

    it('should record a VERIFIED decision', () => {
      fixture.componentRef.setInput('professional', { id: 'p1', verification: 'PENDING' });

      comp.verify();

      expect(recordVerification).toHaveBeenCalledWith({ professionalId: 'p1', status: 'VERIFIED' });
      expect(comp.verification()).toBe('VERIFIED');
    });

    it('should record a REVOKED decision', () => {
      fixture.componentRef.setInput('professional', { id: 'p1', verification: 'VERIFIED' });

      comp.revoke();

      expect(recordVerification).toHaveBeenCalledWith({ professionalId: 'p1', status: 'REVOKED' });
      expect(comp.verification()).toBe('REVOKED');
    });

    it('should do nothing when the decision would not change anything', () => {
      fixture.componentRef.setInput('professional', { id: 'p1', verification: 'PENDING' });

      comp.requestReverification();

      expect(recordVerification).not.toHaveBeenCalled();
    });

    /** A failed write must not relabel the badge — the server still says the old state. */
    it('should leave the badge alone when the write fails', () => {
      recordVerification.mockReturnValue(throwError(() => new Error('nope')));
      fixture.componentRef.setInput('professional', { id: 'p1', verification: 'PENDING' });

      comp.verify();

      expect(comp.verification()).toBe('PENDING');
      expect(comp.isSaving()).toBe(false);
    });

    it('should show the history newest first, and prepend a decision it just recorded', () => {
      verificationHistory.mockReturnValue(of([{ id: 'v1', status: 'PENDING', recordedAt: dayjs('2026-08-01T09:00:00Z') }]));
      fixture.componentRef.setInput('professional', { id: 'p1', verification: 'PENDING' });
      // The history loads from an effect, which runs on change detection rather than on setInput.
      fixture.detectChanges();

      expect(comp.verifications()).toHaveLength(1);

      comp.verify();

      // Prepended from the response rather than re-fetched: the server just said what the row is,
      // and asking again would be asking it to repeat itself.
      expect(comp.verifications()).toHaveLength(2);
      expect(comp.verifications()[0].status).toBe('VERIFIED');
      expect(verificationHistory).toHaveBeenCalledTimes(1);
    });

    /**
     * Never verified is a real state, and it renders as an empty history rather than an error —
     * every applicant mid-onboarding is in it.
     */
    it('should show an empty history when nothing has been recorded', () => {
      fixture.componentRef.setInput('professional', { id: 'p1', verification: 'PENDING' });
      fixture.detectChanges();

      expect(comp.verifications()).toEqual([]);
    });

    /** A failed history read empties the panel rather than breaking the record around it. */
    it('should survive a failed history read', () => {
      verificationHistory.mockReturnValue(throwError(() => new Error('nope')));
      fixture.componentRef.setInput('professional', { id: 'p1', verification: 'PENDING' });
      fixture.detectChanges();

      expect(comp.verifications()).toEqual([]);
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

    /**
     * The narrowing is the api's, and asking for it is the whole of this record's correctness.
     *
     * Both names were undeclared parameters until the api declared them, and Spring drops those
     * without complaint — so this asked for one professional's week, received the whole collection,
     * and filtered it here one page deep. Anyone whose shifts fell past that page showed an empty
     * week. A fixture cannot catch a filter the server ignores; asserting the query can.
     */
    it('should ask the api for this professional and this week', () => {
      vitest
        .spyOn(TestBed.inject(RosterWeekService), 'query')
        .mockReturnValue(of(new HttpResponse({ body: [{ id: 'w1', startDate: dayjs('2026-08-03') }] })));
      const shifts = vitest.spyOn(TestBed.inject(ShiftAssignmentService), 'query').mockReturnValue(of(new HttpResponse({ body: [] })));

      fixture.componentRef.setInput('professional', { id: 'p1' });
      fixture.detectChanges();

      expect(shifts).toHaveBeenCalledWith(expect.objectContaining({ 'professionalId.equals': 'p1', 'weekId.equals': 'w1' }));
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
