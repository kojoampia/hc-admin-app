import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faBoxArchive, faBoxOpen, faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import { provideTranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

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
