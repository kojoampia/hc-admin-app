import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { HttpResponse } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { provideTranslateService } from '@ngx-translate/core';
import { Subject, from, of } from 'rxjs';

import { ServicePlanService } from 'app/entities/catalogue/service-plan/service/service-plan.service';
import { IServicePlan } from 'app/entities/catalogue/service-plan/service-plan.model';
import { IAngel } from 'app/entities/directory/angel/angel.model';
import { AngelService } from 'app/entities/directory/angel/service/angel.service';
import { IProfessional } from 'app/entities/directory/professional/professional.model';
import { ProfessionalService } from 'app/entities/directory/professional/service/professional.service';
import { IProfile } from 'app/entities/directory/profile/profile.model';
import { ProfileService } from 'app/entities/directory/profile/service/profile.service';
import { IHub } from 'app/entities/platform/hub/hub.model';
import { HubService } from 'app/entities/platform/hub/service/hub.service';
import { IPatient } from '../patient.model';
import { PatientService } from '../service/patient.service';

import { PatientFormService } from './patient-form.service';
import { PatientUpdate } from './patient-update';

describe('Patient Management Update Component', () => {
  let comp: PatientUpdate;
  let fixture: ComponentFixture<PatientUpdate>;
  let activatedRoute: ActivatedRoute;
  let patientFormService: PatientFormService;
  let patientService: PatientService;
  let profileService: ProfileService;
  let angelService: AngelService;
  let servicePlanService: ServicePlanService;
  let professionalService: ProfessionalService;
  let hubService: HubService;

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

    fixture = TestBed.createComponent(PatientUpdate);
    activatedRoute = TestBed.inject(ActivatedRoute);
    patientFormService = TestBed.inject(PatientFormService);
    patientService = TestBed.inject(PatientService);
    profileService = TestBed.inject(ProfileService);
    angelService = TestBed.inject(AngelService);
    servicePlanService = TestBed.inject(ServicePlanService);
    professionalService = TestBed.inject(ProfessionalService);
    hubService = TestBed.inject(HubService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should call profile query and add missing value', () => {
      const patient: IPatient = { id: '7ee13815-76c1-4cab-8865-cf9e177b6367' };
      const profile: IProfile = { id: 'f60e8f71-7b26-4f3d-8111-2c32dce7269d' };
      patient.profile = profile;

      const profileCollection: IProfile[] = [{ id: 'f60e8f71-7b26-4f3d-8111-2c32dce7269d' }];
      vitest.spyOn(profileService, 'query').mockReturnValue(of(new HttpResponse({ body: profileCollection })));
      const expectedCollection: IProfile[] = [profile, ...profileCollection];
      vitest.spyOn(profileService, 'addProfileToCollectionIfMissing').mockReturnValue(expectedCollection);

      activatedRoute.data = of({ patient });
      comp.ngOnInit();

      expect(profileService.query).toHaveBeenCalled();
      expect(profileService.addProfileToCollectionIfMissing).toHaveBeenCalledWith(profileCollection, profile);
      expect(comp.profilesCollection()).toEqual(expectedCollection);
    });

    it('should call angel query and add missing value', () => {
      const patient: IPatient = { id: '7ee13815-76c1-4cab-8865-cf9e177b6367' };
      const angel: IAngel = { id: 'b2b45139-eede-4143-805e-4fb6b8885f54' };
      patient.angel = angel;

      const angelCollection: IAngel[] = [{ id: 'b2b45139-eede-4143-805e-4fb6b8885f54' }];
      vitest.spyOn(angelService, 'query').mockReturnValue(of(new HttpResponse({ body: angelCollection })));
      const expectedCollection: IAngel[] = [angel, ...angelCollection];
      vitest.spyOn(angelService, 'addAngelToCollectionIfMissing').mockReturnValue(expectedCollection);

      activatedRoute.data = of({ patient });
      comp.ngOnInit();

      expect(angelService.query).toHaveBeenCalled();
      expect(angelService.addAngelToCollectionIfMissing).toHaveBeenCalledWith(angelCollection, angel);
      expect(comp.angelsCollection()).toEqual(expectedCollection);
    });

    it('should call ServicePlan query and add missing value', () => {
      const patient: IPatient = { id: '7ee13815-76c1-4cab-8865-cf9e177b6367' };
      const plan: IServicePlan = { id: 'b5e0e540-7a57-41f1-8c7d-7faaae191154' };
      patient.plan = plan;

      const servicePlanCollection: IServicePlan[] = [{ id: 'b5e0e540-7a57-41f1-8c7d-7faaae191154' }];
      vitest.spyOn(servicePlanService, 'query').mockReturnValue(of(new HttpResponse({ body: servicePlanCollection })));
      const additionalServicePlans = [plan];
      const expectedCollection: IServicePlan[] = [...additionalServicePlans, ...servicePlanCollection];
      vitest.spyOn(servicePlanService, 'addServicePlanToCollectionIfMissing').mockReturnValue(expectedCollection);

      activatedRoute.data = of({ patient });
      comp.ngOnInit();

      expect(servicePlanService.query).toHaveBeenCalled();
      expect(servicePlanService.addServicePlanToCollectionIfMissing).toHaveBeenCalledWith(
        servicePlanCollection,
        ...additionalServicePlans.map(i => expect.objectContaining(i) as typeof i),
      );
      expect(comp.servicePlansSharedCollection()).toEqual(expectedCollection);
    });

    it('should call Professional query and add missing value', () => {
      const patient: IPatient = { id: '7ee13815-76c1-4cab-8865-cf9e177b6367' };
      const clinicalLead: IProfessional = { id: '2c613901-f64b-4441-b80a-f5fb03b8e466' };
      patient.clinicalLead = clinicalLead;

      const professionalCollection: IProfessional[] = [{ id: '2c613901-f64b-4441-b80a-f5fb03b8e466' }];
      vitest.spyOn(professionalService, 'query').mockReturnValue(of(new HttpResponse({ body: professionalCollection })));
      const additionalProfessionals = [clinicalLead];
      const expectedCollection: IProfessional[] = [...additionalProfessionals, ...professionalCollection];
      vitest.spyOn(professionalService, 'addProfessionalToCollectionIfMissing').mockReturnValue(expectedCollection);

      activatedRoute.data = of({ patient });
      comp.ngOnInit();

      expect(professionalService.query).toHaveBeenCalled();
      expect(professionalService.addProfessionalToCollectionIfMissing).toHaveBeenCalledWith(
        professionalCollection,
        ...additionalProfessionals.map(i => expect.objectContaining(i) as typeof i),
      );
      expect(comp.professionalsSharedCollection()).toEqual(expectedCollection);
    });

    it('should call Hub query and add missing value', () => {
      const patient: IPatient = { id: '7ee13815-76c1-4cab-8865-cf9e177b6367' };
      const hub: IHub = { id: 'bb609620-c7ae-4900-948f-445397c053ae' };
      patient.hub = hub;

      const hubCollection: IHub[] = [{ id: 'bb609620-c7ae-4900-948f-445397c053ae' }];
      vitest.spyOn(hubService, 'query').mockReturnValue(of(new HttpResponse({ body: hubCollection })));
      const additionalHubs = [hub];
      const expectedCollection: IHub[] = [...additionalHubs, ...hubCollection];
      vitest.spyOn(hubService, 'addHubToCollectionIfMissing').mockReturnValue(expectedCollection);

      activatedRoute.data = of({ patient });
      comp.ngOnInit();

      expect(hubService.query).toHaveBeenCalled();
      expect(hubService.addHubToCollectionIfMissing).toHaveBeenCalledWith(
        hubCollection,
        ...additionalHubs.map(i => expect.objectContaining(i) as typeof i),
      );
      expect(comp.hubsSharedCollection()).toEqual(expectedCollection);
    });

    it('should update editForm', () => {
      const patient: IPatient = { id: '7ee13815-76c1-4cab-8865-cf9e177b6367' };
      const profile: IProfile = { id: 'f60e8f71-7b26-4f3d-8111-2c32dce7269d' };
      patient.profile = profile;
      const angel: IAngel = { id: 'b2b45139-eede-4143-805e-4fb6b8885f54' };
      patient.angel = angel;
      const plan: IServicePlan = { id: 'b5e0e540-7a57-41f1-8c7d-7faaae191154' };
      patient.plan = plan;
      const clinicalLead: IProfessional = { id: '2c613901-f64b-4441-b80a-f5fb03b8e466' };
      patient.clinicalLead = clinicalLead;
      const hub: IHub = { id: 'bb609620-c7ae-4900-948f-445397c053ae' };
      patient.hub = hub;

      activatedRoute.data = of({ patient });
      comp.ngOnInit();

      expect(comp.profilesCollection()).toContainEqual(profile);
      expect(comp.angelsCollection()).toContainEqual(angel);
      expect(comp.servicePlansSharedCollection()).toContainEqual(plan);
      expect(comp.professionalsSharedCollection()).toContainEqual(clinicalLead);
      expect(comp.hubsSharedCollection()).toContainEqual(hub);
      expect(comp.patient).toEqual(patient);
    });
  });

  describe('save', () => {
    it('should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<IPatient>();
      const patient = { id: '88928db1-656e-430d-95c0-5cde75285e55' };
      vitest.spyOn(patientFormService, 'getPatient').mockReturnValue(patient);
      vitest.spyOn(patientService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ patient });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(patient);
      saveSubject.complete();

      // THEN
      expect(patientFormService.getPatient).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(patientService.update).toHaveBeenCalledWith(expect.objectContaining(patient));
      expect(comp.isSaving()).toEqual(false);
    });

    it('should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<IPatient>();
      const patient = { id: '88928db1-656e-430d-95c0-5cde75285e55' };
      vitest.spyOn(patientFormService, 'getPatient').mockReturnValue({ id: null });
      vitest.spyOn(patientService, 'create').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ patient: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(patient);
      saveSubject.complete();

      // THEN
      expect(patientFormService.getPatient).toHaveBeenCalled();
      expect(patientService.create).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<IPatient>();
      const patient = { id: '88928db1-656e-430d-95c0-5cde75285e55' };
      vitest.spyOn(patientService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ patient });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(patientService.update).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });

  describe('Compare relationships', () => {
    describe('compareProfile', () => {
      it('should forward to profileService', () => {
        const entity = { id: 'f60e8f71-7b26-4f3d-8111-2c32dce7269d' };
        const entity2 = { id: '5ac8ab7a-123d-4318-b51e-b9301878a25d' };
        vitest.spyOn(profileService, 'compareProfile');
        comp.compareProfile(entity, entity2);
        expect(profileService.compareProfile).toHaveBeenCalledWith(entity, entity2);
      });
    });

    describe('compareAngel', () => {
      it('should forward to angelService', () => {
        const entity = { id: 'b2b45139-eede-4143-805e-4fb6b8885f54' };
        const entity2 = { id: 'a848bf89-7dc8-4acc-9803-d42a457c8a33' };
        vitest.spyOn(angelService, 'compareAngel');
        comp.compareAngel(entity, entity2);
        expect(angelService.compareAngel).toHaveBeenCalledWith(entity, entity2);
      });
    });

    describe('compareServicePlan', () => {
      it('should forward to servicePlanService', () => {
        const entity = { id: 'b5e0e540-7a57-41f1-8c7d-7faaae191154' };
        const entity2 = { id: '674a82c7-e597-42ce-8bcb-558e5170756f' };
        vitest.spyOn(servicePlanService, 'compareServicePlan');
        comp.compareServicePlan(entity, entity2);
        expect(servicePlanService.compareServicePlan).toHaveBeenCalledWith(entity, entity2);
      });
    });

    describe('compareProfessional', () => {
      it('should forward to professionalService', () => {
        const entity = { id: '2c613901-f64b-4441-b80a-f5fb03b8e466' };
        const entity2 = { id: '0e955bb7-9639-4125-b816-aa9d995e679e' };
        vitest.spyOn(professionalService, 'compareProfessional');
        comp.compareProfessional(entity, entity2);
        expect(professionalService.compareProfessional).toHaveBeenCalledWith(entity, entity2);
      });
    });

    describe('compareHub', () => {
      it('should forward to hubService', () => {
        const entity = { id: 'bb609620-c7ae-4900-948f-445397c053ae' };
        const entity2 = { id: '143c62d2-b763-4122-b4a2-4f688eee63a5' };
        vitest.spyOn(hubService, 'compareHub');
        comp.compareHub(entity, entity2);
        expect(hubService.compareHub).toHaveBeenCalledWith(entity, entity2);
      });
    });
  });
});
