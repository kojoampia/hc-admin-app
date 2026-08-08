import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faBoxArchive, faBoxOpen, faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import { provideTranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

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
});
