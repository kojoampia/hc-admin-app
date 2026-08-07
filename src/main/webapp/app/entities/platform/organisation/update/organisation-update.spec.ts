import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { HttpResponse } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { provideTranslateService } from '@ngx-translate/core';
import { Subject, from, of } from 'rxjs';

import { IAddress } from 'app/entities/directory/address/address.model';
import { AddressService } from 'app/entities/directory/address/service/address.service';
import { IOrganisation } from '../organisation.model';
import { OrganisationService } from '../service/organisation.service';

import { OrganisationFormService } from './organisation-form.service';
import { OrganisationUpdate } from './organisation-update';

describe('Organisation Management Update Component', () => {
  let comp: OrganisationUpdate;
  let fixture: ComponentFixture<OrganisationUpdate>;
  let activatedRoute: ActivatedRoute;
  let organisationFormService: OrganisationFormService;
  let organisationService: OrganisationService;
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

    fixture = TestBed.createComponent(OrganisationUpdate);
    activatedRoute = TestBed.inject(ActivatedRoute);
    organisationFormService = TestBed.inject(OrganisationFormService);
    organisationService = TestBed.inject(OrganisationService);
    addressService = TestBed.inject(AddressService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should call address query and add missing value', () => {
      const organisation: IOrganisation = { id: 7272 };
      const address: IAddress = { id: 2318 };
      organisation.address = address;

      const addressCollection: IAddress[] = [{ id: 2318 }];
      vitest.spyOn(addressService, 'query').mockReturnValue(of(new HttpResponse({ body: addressCollection })));
      const expectedCollection: IAddress[] = [address, ...addressCollection];
      vitest.spyOn(addressService, 'addAddressToCollectionIfMissing').mockReturnValue(expectedCollection);

      activatedRoute.data = of({ organisation });
      comp.ngOnInit();

      expect(addressService.query).toHaveBeenCalled();
      expect(addressService.addAddressToCollectionIfMissing).toHaveBeenCalledWith(addressCollection, address);
      expect(comp.addressesCollection()).toEqual(expectedCollection);
    });

    it('should update editForm', () => {
      const organisation: IOrganisation = { id: 7272 };
      const address: IAddress = { id: 2318 };
      organisation.address = address;

      activatedRoute.data = of({ organisation });
      comp.ngOnInit();

      expect(comp.addressesCollection()).toContainEqual(address);
      expect(comp.organisation).toEqual(organisation);
    });
  });

  describe('save', () => {
    it('should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<IOrganisation>();
      const organisation = { id: 541 };
      vitest.spyOn(organisationFormService, 'getOrganisation').mockReturnValue(organisation);
      vitest.spyOn(organisationService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ organisation });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(organisation);
      saveSubject.complete();

      // THEN
      expect(organisationFormService.getOrganisation).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(organisationService.update).toHaveBeenCalledWith(expect.objectContaining(organisation));
      expect(comp.isSaving()).toEqual(false);
    });

    it('should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<IOrganisation>();
      const organisation = { id: 541 };
      vitest.spyOn(organisationFormService, 'getOrganisation').mockReturnValue({ id: null });
      vitest.spyOn(organisationService, 'create').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ organisation: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(organisation);
      saveSubject.complete();

      // THEN
      expect(organisationFormService.getOrganisation).toHaveBeenCalled();
      expect(organisationService.create).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<IOrganisation>();
      const organisation = { id: 541 };
      vitest.spyOn(organisationService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ organisation });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(organisationService.update).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });

  describe('Compare relationships', () => {
    describe('compareAddress', () => {
      it('should forward to addressService', () => {
        const entity = { id: 2318 };
        const entity2 = { id: 19327 };
        vitest.spyOn(addressService, 'compareAddress');
        comp.compareAddress(entity, entity2);
        expect(addressService.compareAddress).toHaveBeenCalledWith(entity, entity2);
      });
    });
  });
});
