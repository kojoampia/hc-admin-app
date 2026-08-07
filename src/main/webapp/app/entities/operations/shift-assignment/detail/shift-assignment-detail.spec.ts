import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

import { ShiftAssignmentDetail } from './shift-assignment-detail';

describe('ShiftAssignment Management Detail Component', () => {
  let comp: ShiftAssignmentDetail;
  let fixture: ComponentFixture<ShiftAssignmentDetail>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideTranslateService(),
        provideRouter(
          [
            {
              path: '**',
              loadComponent: () => import('./shift-assignment-detail').then(m => m.ShiftAssignmentDetail),
              resolve: { shiftAssignment: () => of({ id: 24117 }) },
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
    fixture = TestBed.createComponent(ShiftAssignmentDetail);
    comp = fixture.componentInstance;
  });

  describe('OnInit', () => {
    it('should load shiftAssignment on init', async () => {
      const harness = await RouterTestingHarness.create();
      const instance = await harness.navigateByUrl('/', ShiftAssignmentDetail);

      // THEN
      expect(instance.shiftAssignment()).toEqual(expect.objectContaining({ id: 24117 }));
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
