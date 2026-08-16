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

    // The generated screen showed the id and nothing else, which is what made the record
    // unreadable. A record with no profile still has to render something.
    it('should fall back to the id when there is no profile', () => {
      fixture.componentRef.setInput('patient', { id: 'a1' });
      expect(comp.initials()).toBe('A1');
      expect(comp.fullName()).toBeNull();
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
