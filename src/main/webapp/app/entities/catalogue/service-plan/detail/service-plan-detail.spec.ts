import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

import { ServicePlanDetail } from './service-plan-detail';

describe('ServicePlan Management Detail Component', () => {
  let comp: ServicePlanDetail;
  let fixture: ComponentFixture<ServicePlanDetail>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideTranslateService(),
        provideRouter(
          [
            {
              path: '**',
              loadComponent: () => import('./service-plan-detail').then(m => m.ServicePlanDetail),
              resolve: { servicePlan: () => of({ id: 'b5e0e540-7a57-41f1-8c7d-7faaae191154' }) },
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
    fixture = TestBed.createComponent(ServicePlanDetail);
    comp = fixture.componentInstance;
  });

  describe('OnInit', () => {
    it('should load servicePlan on init', async () => {
      const harness = await RouterTestingHarness.create();
      const instance = await harness.navigateByUrl('/', ServicePlanDetail);

      // THEN
      expect(instance.servicePlan()).toEqual(expect.objectContaining({ id: 'b5e0e540-7a57-41f1-8c7d-7faaae191154' }));
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
