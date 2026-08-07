import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { provideTranslateService } from '@ngx-translate/core';
import { Subject, from, of } from 'rxjs';

import { VendorService } from '../service/vendor.service';
import { IVendor } from '../vendor.model';

import { VendorFormService } from './vendor-form.service';
import { VendorUpdate } from './vendor-update';

describe('Vendor Management Update Component', () => {
  let comp: VendorUpdate;
  let fixture: ComponentFixture<VendorUpdate>;
  let activatedRoute: ActivatedRoute;
  let vendorFormService: VendorFormService;
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

    fixture = TestBed.createComponent(VendorUpdate);
    activatedRoute = TestBed.inject(ActivatedRoute);
    vendorFormService = TestBed.inject(VendorFormService);
    vendorService = TestBed.inject(VendorService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should update editForm', () => {
      const vendor: IVendor = { id: '38a75b67-70c0-4716-bccf-c7d55a3a8179' };

      activatedRoute.data = of({ vendor });
      comp.ngOnInit();

      expect(comp.vendor).toEqual(vendor);
    });
  });

  describe('save', () => {
    it('should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<IVendor>();
      const vendor = { id: '478690b5-4f10-43b0-b67e-1148991a8421' };
      vitest.spyOn(vendorFormService, 'getVendor').mockReturnValue(vendor);
      vitest.spyOn(vendorService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ vendor });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(vendor);
      saveSubject.complete();

      // THEN
      expect(vendorFormService.getVendor).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(vendorService.update).toHaveBeenCalledWith(expect.objectContaining(vendor));
      expect(comp.isSaving()).toEqual(false);
    });

    it('should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<IVendor>();
      const vendor = { id: '478690b5-4f10-43b0-b67e-1148991a8421' };
      vitest.spyOn(vendorFormService, 'getVendor').mockReturnValue({ id: null });
      vitest.spyOn(vendorService, 'create').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ vendor: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(vendor);
      saveSubject.complete();

      // THEN
      expect(vendorFormService.getVendor).toHaveBeenCalled();
      expect(vendorService.create).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<IVendor>();
      const vendor = { id: '478690b5-4f10-43b0-b67e-1148991a8421' };
      vitest.spyOn(vendorService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ vendor });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(vendorService.update).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });
});
