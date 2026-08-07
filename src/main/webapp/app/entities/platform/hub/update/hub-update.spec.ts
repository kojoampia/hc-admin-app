import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { HttpResponse } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { provideTranslateService } from '@ngx-translate/core';
import { Subject, from, of } from 'rxjs';

import { IAddress } from 'app/entities/directory/address/address.model';
import { AddressService } from 'app/entities/directory/address/service/address.service';
import { IHub } from '../hub.model';
import { HubService } from '../service/hub.service';

import { HubFormService } from './hub-form.service';
import { HubUpdate } from './hub-update';

describe('Hub Management Update Component', () => {
  let comp: HubUpdate;
  let fixture: ComponentFixture<HubUpdate>;
  let activatedRoute: ActivatedRoute;
  let hubFormService: HubFormService;
  let hubService: HubService;
  let addressService: AddressService;

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

    fixture = TestBed.createComponent(HubUpdate);
    activatedRoute = TestBed.inject(ActivatedRoute);
    hubFormService = TestBed.inject(HubFormService);
    hubService = TestBed.inject(HubService);
    addressService = TestBed.inject(AddressService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should call address query and add missing value', () => {
      const hub: IHub = { id: '143c62d2-b763-4122-b4a2-4f688eee63a5' };
      const address: IAddress = { id: '1976e7b1-8233-4a09-bdb3-fbe559c0d8c2' };
      hub.address = address;

      const addressCollection: IAddress[] = [{ id: '1976e7b1-8233-4a09-bdb3-fbe559c0d8c2' }];
      vitest.spyOn(addressService, 'query').mockReturnValue(of(new HttpResponse({ body: addressCollection })));
      const expectedCollection: IAddress[] = [address, ...addressCollection];
      vitest.spyOn(addressService, 'addAddressToCollectionIfMissing').mockReturnValue(expectedCollection);

      activatedRoute.data = of({ hub });
      comp.ngOnInit();

      expect(addressService.query).toHaveBeenCalled();
      expect(addressService.addAddressToCollectionIfMissing).toHaveBeenCalledWith(addressCollection, address);
      expect(comp.addressesCollection()).toEqual(expectedCollection);
    });

    it('should update editForm', () => {
      const hub: IHub = { id: '143c62d2-b763-4122-b4a2-4f688eee63a5' };
      const address: IAddress = { id: '1976e7b1-8233-4a09-bdb3-fbe559c0d8c2' };
      hub.address = address;

      activatedRoute.data = of({ hub });
      comp.ngOnInit();

      expect(comp.addressesCollection()).toContainEqual(address);
      expect(comp.hub).toEqual(hub);
    });
  });

  describe('save', () => {
    it('should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<IHub>();
      const hub = { id: 'bb609620-c7ae-4900-948f-445397c053ae' };
      vitest.spyOn(hubFormService, 'getHub').mockReturnValue(hub);
      vitest.spyOn(hubService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ hub });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(hub);
      saveSubject.complete();

      // THEN
      expect(hubFormService.getHub).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(hubService.update).toHaveBeenCalledWith(expect.objectContaining(hub));
      expect(comp.isSaving()).toEqual(false);
    });

    it('should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<IHub>();
      const hub = { id: 'bb609620-c7ae-4900-948f-445397c053ae' };
      vitest.spyOn(hubFormService, 'getHub').mockReturnValue({ id: null });
      vitest.spyOn(hubService, 'create').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ hub: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(hub);
      saveSubject.complete();

      // THEN
      expect(hubFormService.getHub).toHaveBeenCalled();
      expect(hubService.create).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<IHub>();
      const hub = { id: 'bb609620-c7ae-4900-948f-445397c053ae' };
      vitest.spyOn(hubService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ hub });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(hubService.update).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });

  describe('Compare relationships', () => {
    describe('compareAddress', () => {
      it('should forward to addressService', () => {
        const entity = { id: '1976e7b1-8233-4a09-bdb3-fbe559c0d8c2' };
        const entity2 = { id: '1e8b2d0e-a55f-4f49-bda6-466ca50fc308' };
        vitest.spyOn(addressService, 'compareAddress');
        comp.compareAddress(entity, entity2);
        expect(addressService.compareAddress).toHaveBeenCalledWith(entity, entity2);
      });
    });
  });
});
