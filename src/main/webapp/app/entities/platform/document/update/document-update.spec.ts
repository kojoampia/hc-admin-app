import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { HttpResponse } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { provideTranslateService } from '@ngx-translate/core';
import { Subject, from, of } from 'rxjs';

import { IPatient } from 'app/entities/directory/patient/patient.model';
import { PatientService } from 'app/entities/directory/patient/service/patient.service';
import { VendorService } from 'app/entities/directory/vendor/service/vendor.service';
import { IVendor } from 'app/entities/directory/vendor/vendor.model';
import { IDocument } from '../document.model';
import { DocumentService } from '../service/document.service';

import { DocumentFormService } from './document-form.service';
import { DocumentUpdate } from './document-update';

describe('Document Management Update Component', () => {
  let comp: DocumentUpdate;
  let fixture: ComponentFixture<DocumentUpdate>;
  let activatedRoute: ActivatedRoute;
  let documentFormService: DocumentFormService;
  let documentService: DocumentService;
  let patientService: PatientService;
  let vendorService: VendorService;

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

    fixture = TestBed.createComponent(DocumentUpdate);
    activatedRoute = TestBed.inject(ActivatedRoute);
    documentFormService = TestBed.inject(DocumentFormService);
    documentService = TestBed.inject(DocumentService);
    patientService = TestBed.inject(PatientService);
    vendorService = TestBed.inject(VendorService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should call Patient query and add missing value', () => {
      const document: IDocument = { id: 'd72ebdf6-81bc-4a5d-8e29-45483c0d98b2' };
      const patient: IPatient = { id: '88928db1-656e-430d-95c0-5cde75285e55' };
      document.patient = patient;

      const patientCollection: IPatient[] = [{ id: '88928db1-656e-430d-95c0-5cde75285e55' }];
      vitest.spyOn(patientService, 'query').mockReturnValue(of(new HttpResponse({ body: patientCollection })));
      const additionalPatients = [patient];
      const expectedCollection: IPatient[] = [...additionalPatients, ...patientCollection];
      vitest.spyOn(patientService, 'addPatientToCollectionIfMissing').mockReturnValue(expectedCollection);

      activatedRoute.data = of({ document });
      comp.ngOnInit();

      expect(patientService.query).toHaveBeenCalled();
      expect(patientService.addPatientToCollectionIfMissing).toHaveBeenCalledWith(
        patientCollection,
        ...additionalPatients.map(i => expect.objectContaining(i) as typeof i),
      );
      expect(comp.patientsSharedCollection()).toEqual(expectedCollection);
    });

    it('should call Vendor query and add missing value', () => {
      const document: IDocument = { id: 'd72ebdf6-81bc-4a5d-8e29-45483c0d98b2' };
      const vendor: IVendor = { id: '478690b5-4f10-43b0-b67e-1148991a8421' };
      document.vendor = vendor;

      const vendorCollection: IVendor[] = [{ id: '478690b5-4f10-43b0-b67e-1148991a8421' }];
      vitest.spyOn(vendorService, 'query').mockReturnValue(of(new HttpResponse({ body: vendorCollection })));
      const additionalVendors = [vendor];
      const expectedCollection: IVendor[] = [...additionalVendors, ...vendorCollection];
      vitest.spyOn(vendorService, 'addVendorToCollectionIfMissing').mockReturnValue(expectedCollection);

      activatedRoute.data = of({ document });
      comp.ngOnInit();

      expect(vendorService.query).toHaveBeenCalled();
      expect(vendorService.addVendorToCollectionIfMissing).toHaveBeenCalledWith(
        vendorCollection,
        ...additionalVendors.map(i => expect.objectContaining(i) as typeof i),
      );
      expect(comp.vendorsSharedCollection()).toEqual(expectedCollection);
    });

    it('should update editForm', () => {
      const document: IDocument = { id: 'd72ebdf6-81bc-4a5d-8e29-45483c0d98b2' };
      const patient: IPatient = { id: '88928db1-656e-430d-95c0-5cde75285e55' };
      document.patient = patient;
      const vendor: IVendor = { id: '478690b5-4f10-43b0-b67e-1148991a8421' };
      document.vendor = vendor;

      activatedRoute.data = of({ document });
      comp.ngOnInit();

      expect(comp.patientsSharedCollection()).toContainEqual(patient);
      expect(comp.vendorsSharedCollection()).toContainEqual(vendor);
      expect(comp.document).toEqual(document);
    });
  });

  describe('save', () => {
    it('should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<IDocument>();
      const document = { id: 'c1d4f1eb-eff0-4815-be04-c0d821e59542' };
      vitest.spyOn(documentFormService, 'getDocument').mockReturnValue(document);
      vitest.spyOn(documentService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ document });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(document);
      saveSubject.complete();

      // THEN
      expect(documentFormService.getDocument).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(documentService.update).toHaveBeenCalledWith(expect.objectContaining(document));
      expect(comp.isSaving()).toEqual(false);
    });

    it('should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<IDocument>();
      const document = { id: 'c1d4f1eb-eff0-4815-be04-c0d821e59542' };
      vitest.spyOn(documentFormService, 'getDocument').mockReturnValue({ id: null });
      vitest.spyOn(documentService, 'create').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ document: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(document);
      saveSubject.complete();

      // THEN
      expect(documentFormService.getDocument).toHaveBeenCalled();
      expect(documentService.create).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<IDocument>();
      const document = { id: 'c1d4f1eb-eff0-4815-be04-c0d821e59542' };
      vitest.spyOn(documentService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ document });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(documentService.update).toHaveBeenCalled();
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

    describe('compareVendor', () => {
      it('should forward to vendorService', () => {
        const entity = { id: '478690b5-4f10-43b0-b67e-1148991a8421' };
        const entity2 = { id: '38a75b67-70c0-4716-bccf-c7d55a3a8179' };
        vitest.spyOn(vendorService, 'compareVendor');
        comp.compareVendor(entity, entity2);
        expect(vendorService.compareVendor).toHaveBeenCalledWith(entity, entity2);
      });
    });
  });
});
