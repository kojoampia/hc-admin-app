import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft,
  faBoxArchive,
  faBoxOpen,
  faCreditCard,
  faHeart,
  faLocationDot,
  faPencilAlt,
  faShieldHalved,
  faStethoscope,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { provideTranslateService } from '@ngx-translate/core';
import dayjs from 'dayjs/esm';
import { of, throwError } from 'rxjs';

import { ProfessionalService } from 'app/entities/directory/professional/service/professional.service';
import { PatientService } from '../service/patient.service';
import { PatientDetail } from './patient-detail';

describe('Patient Management Detail Component', () => {
  let comp: PatientDetail;
  let fixture: ComponentFixture<PatientDetail>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideTranslateService(),
        provideRouter(
          [
            {
              path: '**',
              loadComponent: () => import('./patient-detail').then(m => m.PatientDetail),
              resolve: { patient: () => of({ id: '88928db1-656e-430d-95c0-5cde75285e55' }) },
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
    // The six card icons. A record that renders every field and throws on an icon is still broken.
    library.addIcons(faUser, faLocationDot, faShieldHalved, faHeart, faCreditCard, faStethoscope);
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PatientDetail);
    comp = fixture.componentInstance;
  });

  describe('OnInit', () => {
    it('should load patient on init', async () => {
      const harness = await RouterTestingHarness.create();
      const instance = await harness.navigateByUrl('/', PatientDetail);

      // THEN
      expect(instance.patient()).toEqual(expect.objectContaining({ id: '88928db1-656e-430d-95c0-5cde75285e55' }));
    });
  });

  describe('PreviousState', () => {
    it('should navigate to previous state', () => {
      vitest.spyOn(globalThis.history, 'back');
      comp.previousState();
      expect(globalThis.history.back).toHaveBeenCalled();
    });
  });

  describe('The record header', () => {
    it('should build initials from the profile, not the id', () => {
      fixture.componentRef.setInput('patient', { id: 'a1', profile: { firstName: 'Kojo', lastName: 'Ampia-Addison' } });
      expect(comp.initials()).toBe('KA');
      expect(comp.fullName()).toBe('Kojo Ampia-Addison');
    });

    /**
     * Backlog item 45, and the reversal of what this case used to assert.
     *
     * It read "should fall back to the id when there is no profile" and expected `A1` — the id's
     * first two characters. On a real record that id is a 24-character Mongo ObjectId, so the chip
     * said `68` above a heading reading `68b4f2a19c3d5e7f81a02c44`, and an operator reported it
     * from production as a corrupted record. A patient learned from a sibling domain event has no
     * profile and can never be given one from the wire, so this is not a rare state — it is every
     * patient who registers.
     */
    it('should never build initials or a heading out of the record id', () => {
      fixture.componentRef.setInput('patient', { id: '68b4f2a19c3d5e7f81a02c44' });

      expect(comp.initials()).not.toBe('68');
      expect(comp.initials()).toBe('—');
      expect(comp.fullName()).toBeNull();
      expect(comp.headingName()).toBeNull();
    });

    it('should head the record with the linked address when there is no profile', () => {
      fixture.componentRef.setInput('patient', { id: '68b4f2a19c3d5e7f81a02c44' });
      comp.resolvedLinkIdentity.set({ id: '68b4f2a19c3d5e7f81a02c44', identity: 'ama.mensah@example.com' });

      expect(comp.headingName()).toBe('ama.mensah@example.com');
      expect(comp.initials()).toBe('AM');
    });

    it('should prefer a real name over the linked address', () => {
      fixture.componentRef.setInput('patient', { id: 'a1', profile: { firstName: 'Kojo', lastName: 'Ampia-Addison' } });
      comp.resolvedLinkIdentity.set({ id: 'a1', identity: 'ama.mensah@example.com' });

      expect(comp.headingName()).toBe('Kojo Ampia-Addison');
      expect(comp.initials()).toBe('KA');
    });

    /**
     * **One patient's email address must not print on another patient's record.**
     *
     * `/patient/A/view` → `/patient/B/view` reuses this component instance, because the two routes
     * share a `routeConfig` and Angular does not recreate it. So both effects re-run against B while
     * A's `findByLocalIds` may still be in flight, and an unkeyed signal takes whichever response
     * lands last. Until 2026-09-07 that was exactly the shape here, and the heading is the one place
     * on the screen where showing the wrong person's contact address is not a cosmetic fault.
     *
     * The record already solved this fifty lines up — `archivedOverride` carries `{ id, isArchived }`
     * so a stale override is ignored rather than claiming the new record's state — and this is that
     * pattern applied to the other two resolved values.
     */
    it('should ignore a linked identity that belongs to a record no longer on screen', () => {
      fixture.componentRef.setInput('patient', { id: 'patient-b' });
      comp.resolvedLinkIdentity.set({ id: 'patient-a', identity: 'ama.mensah@example.com' });

      expect(comp.linkIdentity()).toBeNull();
      expect(comp.headingName()).toBeNull();
      expect(comp.initials()).toBe('—');
    });

    it('should include a middle name in the full name but not the initials', () => {
      fixture.componentRef.setInput('patient', { id: 'a1', profile: { firstName: 'Kojo', middleName: 'Kwesi', lastName: 'Addison' } });
      expect(comp.fullName()).toBe('Kojo Kwesi Addison');
      expect(comp.initials()).toBe('KA');
    });
  });

  describe('Age', () => {
    it('should derive whole years from the date of birth', () => {
      const born = dayjs().subtract(50, 'year').subtract(3, 'month');
      fixture.componentRef.setInput('patient', { id: 'a1', profile: { dateOfBirth: born } });
      expect(comp.age()).toBe(50);
    });

    /**
     * PatientService converts joinedOn and lastActiveOn and nothing else, so the nested profile's
     * dateOfBirth arrives as a string while its type says dayjs. Piping that straight into
     * formatMediumDate threw `day.format is not a function` on a record that otherwise rendered.
     */
    it('should accept a nested date of birth that arrives as a string', () => {
      fixture.componentRef.setInput('patient', { id: 'a1', profile: { dateOfBirth: '1976-04-19' as any } });
      expect(comp.dateOfBirth()?.format('YYYY-MM-DD')).toBe('1976-04-19');
      expect(comp.age()).toBeGreaterThan(40);
    });

    it('should be null when the date of birth cannot be parsed', () => {
      fixture.componentRef.setInput('patient', { id: 'a1', profile: { dateOfBirth: 'not-a-date' as any } });
      expect(comp.dateOfBirth()).toBeNull();
      expect(comp.age()).toBeNull();
    });

    it('should be null when there is no date of birth', () => {
      fixture.componentRef.setInput('patient', { id: 'a1', profile: {} });
      expect(comp.age()).toBeNull();
    });
  });

  /**
   * The patient payload nests the profile, address, angel, plan and hub, but `clinicalLead` arrives
   * without a profile of its own — so it carries a licence number and no name. The record fetches
   * the professional for it, and must degrade to the licence number rather than to nothing.
   */
  describe('Clinical lead', () => {
    it('should fetch the name the patient payload does not carry', () => {
      const service = TestBed.inject(ProfessionalService);
      vitest.spyOn(service, 'find').mockReturnValue(of({ id: 'p1', profile: { firstName: 'Ama', lastName: 'Boateng' } }) as any);

      fixture.componentRef.setInput('patient', { id: 'a1', clinicalLead: { id: 'p1', licenceNumber: 'MDC/RN/23-4471' } });
      fixture.detectChanges();

      expect(service.find).toHaveBeenCalledWith('p1');
      expect(comp.clinicalLeadName()).toBe('Ama Boateng');
    });

    it('should leave the name null when the lookup fails', () => {
      const service = TestBed.inject(ProfessionalService);
      vitest.spyOn(service, 'find').mockReturnValue(throwError(() => new Error('nope')));

      fixture.componentRef.setInput('patient', { id: 'a1', clinicalLead: { id: 'p1', licenceNumber: 'MDC/RN/23-4471' } });
      fixture.detectChanges();

      expect(comp.clinicalLeadName()).toBeNull();
    });

    /**
     * The same stale-response window as the linked identity above, and it was pre-existing rather
     * than introduced by item 45 — fixed in the same pass because it is one bug in two places.
     * A clinician's name attached to the wrong patient reads as a real assignment.
     */
    it('should ignore a resolved name that belongs to a lead no longer on screen', () => {
      fixture.componentRef.setInput('patient', { id: 'a2', clinicalLead: { id: 'p2', licenceNumber: 'NMC/GH/19-8820' } });
      comp.resolvedLeadName.set({ leadId: 'p1', name: 'Ama Boateng' });

      expect(comp.clinicalLeadName()).toBeNull();
    });

    it('should not call the service when there is no lead', () => {
      const service = TestBed.inject(ProfessionalService);
      vitest.spyOn(service, 'find');

      fixture.componentRef.setInput('patient', { id: 'a1' });
      fixture.detectChanges();

      expect(service.find).not.toHaveBeenCalled();
    });
  });

  describe('Archiving', () => {
    it('should PATCH only isArchived, never the whole record', () => {
      const service = TestBed.inject(PatientService);
      const setArchived = vitest.spyOn(service, 'setArchived').mockReturnValue(of({ id: 'a' }));
      fixture.componentRef.setInput('patient', { id: 'a', isArchived: false });

      comp.toggleArchived();

      expect(setArchived).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }), true);
      expect(comp.isArchived()).toBe(true);
    });

    it('should flip back to Archive when unarchiving', () => {
      const service = TestBed.inject(PatientService);
      vitest.spyOn(service, 'setArchived').mockReturnValue(of({ id: 'a' }));
      fixture.componentRef.setInput('patient', { id: 'a', isArchived: true });

      comp.toggleArchived();

      expect(comp.isArchived()).toBe(false);
    });

    // A failed write must not relabel the button: that would claim the record is
    // archived when the server still says it is not.
    it('should leave the flag alone when the write fails', () => {
      const service = TestBed.inject(PatientService);
      vitest.spyOn(service, 'setArchived').mockReturnValue(throwError(() => new Error('nope')));
      fixture.componentRef.setInput('patient', { id: 'a', isArchived: false });

      comp.toggleArchived();

      expect(comp.isArchived()).toBe(false);
      expect(comp.isSaving()).toBe(false);
    });
  });
});
