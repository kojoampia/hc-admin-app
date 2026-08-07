import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

import { ServiceActivityDetail } from './service-activity-detail';

describe('ServiceActivity Management Detail Component', () => {
  let comp: ServiceActivityDetail;
  let fixture: ComponentFixture<ServiceActivityDetail>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideTranslateService(),
        provideRouter(
          [
            {
              path: '**',
              loadComponent: () => import('./service-activity-detail').then(m => m.ServiceActivityDetail),
              resolve: { serviceActivity: () => of({ id: 'e58e53d8-3de4-4287-add1-bbf6e52730f0' }) },
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
    fixture = TestBed.createComponent(ServiceActivityDetail);
    comp = fixture.componentInstance;
  });

  describe('OnInit', () => {
    it('should load serviceActivity on init', async () => {
      const harness = await RouterTestingHarness.create();
      const instance = await harness.navigateByUrl('/', ServiceActivityDetail);

      // THEN
      expect(instance.serviceActivity()).toEqual(expect.objectContaining({ id: 'e58e53d8-3de4-4287-add1-bbf6e52730f0' }));
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
