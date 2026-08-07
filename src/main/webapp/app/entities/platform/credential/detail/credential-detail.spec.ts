import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

import { CredentialDetail } from './credential-detail';

describe('Credential Management Detail Component', () => {
  let comp: CredentialDetail;
  let fixture: ComponentFixture<CredentialDetail>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideTranslateService(),
        provideRouter(
          [
            {
              path: '**',
              loadComponent: () => import('./credential-detail').then(m => m.CredentialDetail),
              resolve: { credential: () => of({ id: '35b3b582-8e66-4c2d-9e4a-8ff9d99022d0' }) },
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
    fixture = TestBed.createComponent(CredentialDetail);
    comp = fixture.componentInstance;
  });

  describe('OnInit', () => {
    it('should load credential on init', async () => {
      const harness = await RouterTestingHarness.create();
      const instance = await harness.navigateByUrl('/', CredentialDetail);

      // THEN
      expect(instance.credential()).toEqual(expect.objectContaining({ id: '35b3b582-8e66-4c2d-9e4a-8ff9d99022d0' }));
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
