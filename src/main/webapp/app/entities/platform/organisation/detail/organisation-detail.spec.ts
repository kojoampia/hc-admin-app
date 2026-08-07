import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

import { OrganisationDetail } from './organisation-detail';

describe('Organisation Management Detail Component', () => {
  let comp: OrganisationDetail;
  let fixture: ComponentFixture<OrganisationDetail>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideTranslateService(),
        provideRouter(
          [
            {
              path: '**',
              loadComponent: () => import('./organisation-detail').then(m => m.OrganisationDetail),
              resolve: { organisation: () => of({ id: '03a17a60-2a77-4a3e-80ff-b20de2261aa4' }) },
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
    fixture = TestBed.createComponent(OrganisationDetail);
    comp = fixture.componentInstance;
  });

  describe('OnInit', () => {
    it('should load organisation on init', async () => {
      const harness = await RouterTestingHarness.create();
      const instance = await harness.navigateByUrl('/', OrganisationDetail);

      // THEN
      expect(instance.organisation()).toEqual(expect.objectContaining({ id: '03a17a60-2a77-4a3e-80ff-b20de2261aa4' }));
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
