import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

import { RosterWeekDetail } from './roster-week-detail';

describe('RosterWeek Management Detail Component', () => {
  let comp: RosterWeekDetail;
  let fixture: ComponentFixture<RosterWeekDetail>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideTranslateService(),
        provideRouter(
          [
            {
              path: '**',
              loadComponent: () => import('./roster-week-detail').then(m => m.RosterWeekDetail),
              resolve: { rosterWeek: () => of({ id: 'ade462b2-f291-49db-a5f8-d4638f0545b4' }) },
            },
          ],
          withComponentInputBinding(),
        ),
      ],
    });
    const library = TestBed.inject(FaIconLibrary);
    library.addIcons(faArrowLeft);
    library.addIcons(faPencilAlt);
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RosterWeekDetail);
    comp = fixture.componentInstance;
  });

  describe('OnInit', () => {
    it('should load rosterWeek on init', async () => {
      const harness = await RouterTestingHarness.create();
      const instance = await harness.navigateByUrl('/', RosterWeekDetail);

      // THEN
      expect(instance.rosterWeek()).toEqual(expect.objectContaining({ id: 'ade462b2-f291-49db-a5f8-d4638f0545b4' }));
    });
  });

  describe('PreviousState', () => {
    it('should navigate to previous state', () => {
      vitest.spyOn(globalThis.history, 'back');
      comp.previousState();
      expect(globalThis.history.back).toHaveBeenCalled();
    });
  });
});
