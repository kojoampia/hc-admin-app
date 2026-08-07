import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { HttpResponse } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { provideTranslateService } from '@ngx-translate/core';
import { Subject, from, of } from 'rxjs';

import { IAddress } from 'app/entities/directory/address/address.model';
import { AddressService } from 'app/entities/directory/address/service/address.service';
import { IProfile } from '../profile.model';
import { ProfileService } from '../service/profile.service';

import { ProfileFormService } from './profile-form.service';
import { ProfileUpdate } from './profile-update';

describe('Profile Management Update Component', () => {
  let comp: ProfileUpdate;
  let fixture: ComponentFixture<ProfileUpdate>;
  let activatedRoute: ActivatedRoute;
  let profileFormService: ProfileFormService;
  let profileService: ProfileService;
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

    fixture = TestBed.createComponent(ProfileUpdate);
    activatedRoute = TestBed.inject(ActivatedRoute);
    profileFormService = TestBed.inject(ProfileFormService);
    profileService = TestBed.inject(ProfileService);
    addressService = TestBed.inject(AddressService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should call address query and add missing value', () => {
      const profile: IProfile = { id: '5ac8ab7a-123d-4318-b51e-b9301878a25d' };
      const address: IAddress = { id: '1976e7b1-8233-4a09-bdb3-fbe559c0d8c2' };
      profile.address = address;

      const addressCollection: IAddress[] = [{ id: '1976e7b1-8233-4a09-bdb3-fbe559c0d8c2' }];
      vitest.spyOn(addressService, 'query').mockReturnValue(of(new HttpResponse({ body: addressCollection })));
      const expectedCollection: IAddress[] = [address, ...addressCollection];
      vitest.spyOn(addressService, 'addAddressToCollectionIfMissing').mockReturnValue(expectedCollection);

      activatedRoute.data = of({ profile });
      comp.ngOnInit();

      expect(addressService.query).toHaveBeenCalled();
      expect(addressService.addAddressToCollectionIfMissing).toHaveBeenCalledWith(addressCollection, address);
      expect(comp.addressesCollection()).toEqual(expectedCollection);
    });

    it('should update editForm', () => {
      const profile: IProfile = { id: '5ac8ab7a-123d-4318-b51e-b9301878a25d' };
      const address: IAddress = { id: '1976e7b1-8233-4a09-bdb3-fbe559c0d8c2' };
      profile.address = address;

      activatedRoute.data = of({ profile });
      comp.ngOnInit();

      expect(comp.addressesCollection()).toContainEqual(address);
      expect(comp.profile).toEqual(profile);
    });
  });

  describe('save', () => {
    it('should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<IProfile>();
      const profile = { id: 'f60e8f71-7b26-4f3d-8111-2c32dce7269d' };
      vitest.spyOn(profileFormService, 'getProfile').mockReturnValue(profile);
      vitest.spyOn(profileService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ profile });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(profile);
      saveSubject.complete();

      // THEN
      expect(profileFormService.getProfile).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(profileService.update).toHaveBeenCalledWith(expect.objectContaining(profile));
      expect(comp.isSaving()).toEqual(false);
    });

    it('should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<IProfile>();
      const profile = { id: 'f60e8f71-7b26-4f3d-8111-2c32dce7269d' };
      vitest.spyOn(profileFormService, 'getProfile').mockReturnValue({ id: null });
      vitest.spyOn(profileService, 'create').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ profile: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(profile);
      saveSubject.complete();

      // THEN
      expect(profileFormService.getProfile).toHaveBeenCalled();
      expect(profileService.create).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<IProfile>();
      const profile = { id: 'f60e8f71-7b26-4f3d-8111-2c32dce7269d' };
      vitest.spyOn(profileService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ profile });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(profileService.update).toHaveBeenCalled();
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
