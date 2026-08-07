import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { HttpResponse } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { provideTranslateService } from '@ngx-translate/core';
import { Subject, from, of } from 'rxjs';

import { IPatient } from 'app/entities/directory/patient/patient.model';
import { PatientService } from 'app/entities/directory/patient/service/patient.service';
import { ICareActivity } from '../care-activity.model';
import { CareActivityService } from '../service/care-activity.service';

import { CareActivityFormService } from './care-activity-form.service';
import { CareActivityUpdate } from './care-activity-update';

describe('CareActivity Management Update Component', () => {
  let comp: CareActivityUpdate;
  let fixture: ComponentFixture<CareActivityUpdate>;
  let activatedRoute: ActivatedRoute;
  let careActivityFormService: CareActivityFormService;
  let careActivityService: CareActivityService;
  let patientService: PatientService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideTranslateService(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            params: from([{}]),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(CareActivityUpdate);
    activatedRoute = TestBed.inject(ActivatedRoute);
    careActivityFormService = TestBed.inject(CareActivityFormService);
    careActivityService = TestBed.inject(CareActivityService);
    patientService = TestBed.inject(PatientService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should call Patient query and add missing value', () => {
      const careActivity: ICareActivity = { id: '9dc3ecf1-90f7-43f7-add7-26b39284ae38' };
      const patient: IPatient = { id: '88928db1-656e-430d-95c0-5cde75285e55' };
      careActivity.patient = patient;

      const patientCollection: IPatient[] = [{ id: '88928db1-656e-430d-95c0-5cde75285e55' }];
      vitest.spyOn(patientService, 'query').mockReturnValue(of(new HttpResponse({ body: patientCollection })));
      const additionalPatients = [patient];
      const expectedCollection: IPatient[] = [...additionalPatients, ...patientCollection];
      vitest.spyOn(patientService, 'addPatientToCollectionIfMissing').mockReturnValue(expectedCollection);

      activatedRoute.data = of({ careActivity });
      comp.ngOnInit();

      expect(patientService.query).toHaveBeenCalled();
      expect(patientService.addPatientToCollectionIfMissing).toHaveBeenCalledWith(
        patientCollection,
        ...additionalPatients.map(i => expect.objectContaining(i) as typeof i),
      );
      expect(comp.patientsSharedCollection()).toEqual(expectedCollection);
    });

    it('should update editForm', () => {
      const careActivity: ICareActivity = { id: '9dc3ecf1-90f7-43f7-add7-26b39284ae38' };
      const patient: IPatient = { id: '88928db1-656e-430d-95c0-5cde75285e55' };
      careActivity.patient = patient;

      activatedRoute.data = of({ careActivity });
      comp.ngOnInit();

      expect(comp.patientsSharedCollection()).toContainEqual(patient);
      expect(comp.careActivity).toEqual(careActivity);
    });
  });

  describe('save', () => {
    it('should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<ICareActivity>();
      const careActivity = { id: 'a750ee1d-4eb4-4652-9233-b9cedc9cdcef' };
      vitest.spyOn(careActivityFormService, 'getCareActivity').mockReturnValue(careActivity);
      vitest.spyOn(careActivityService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ careActivity });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(careActivity);
      saveSubject.complete();

      // THEN
      expect(careActivityFormService.getCareActivity).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(careActivityService.update).toHaveBeenCalledWith(expect.objectContaining(careActivity));
      expect(comp.isSaving()).toEqual(false);
    });

    it('should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<ICareActivity>();
      const careActivity = { id: 'a750ee1d-4eb4-4652-9233-b9cedc9cdcef' };
      vitest.spyOn(careActivityFormService, 'getCareActivity').mockReturnValue({ id: null });
      vitest.spyOn(careActivityService, 'create').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ careActivity: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(careActivity);
      saveSubject.complete();

      // THEN
      expect(careActivityFormService.getCareActivity).toHaveBeenCalled();
      expect(careActivityService.create).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<ICareActivity>();
      const careActivity = { id: 'a750ee1d-4eb4-4652-9233-b9cedc9cdcef' };
      vitest.spyOn(careActivityService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ careActivity });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(careActivityService.update).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });

  describe('Compare relationships', () => {
    describe('comparePatient', () => {
      it('should forward to patientService', () => {
        const entity = { id: '88928db1-656e-430d-95c0-5cde75285e55' };
        const entity2 = { id: '7ee13815-76c1-4cab-8865-cf9e177b6367' };
        vitest.spyOn(patientService, 'comparePatient');
        comp.comparePatient(entity, entity2);
        expect(patientService.comparePatient).toHaveBeenCalledWith(entity, entity2);
      });
    });
  });
});
