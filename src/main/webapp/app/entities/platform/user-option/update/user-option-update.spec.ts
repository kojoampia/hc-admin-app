import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { provideTranslateService } from '@ngx-translate/core';
import { Subject, from, of } from 'rxjs';

import { UserOptionService } from '../service/user-option.service';
import { IUserOption } from '../user-option.model';

import { UserOptionFormService } from './user-option-form.service';
import { UserOptionUpdate } from './user-option-update';

describe('UserOption Management Update Component', () => {
  let comp: UserOptionUpdate;
  let fixture: ComponentFixture<UserOptionUpdate>;
  let activatedRoute: ActivatedRoute;
  let userOptionFormService: UserOptionFormService;
  let userOptionService: UserOptionService;

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

    fixture = TestBed.createComponent(UserOptionUpdate);
    activatedRoute = TestBed.inject(ActivatedRoute);
    userOptionFormService = TestBed.inject(UserOptionFormService);
    userOptionService = TestBed.inject(UserOptionService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should update editForm', () => {
      const userOption: IUserOption = { id: 'c7665922-3097-419d-8a5c-b73b3abef8c5' };

      activatedRoute.data = of({ userOption });
      comp.ngOnInit();

      expect(comp.userOption).toEqual(userOption);
    });
  });

  describe('save', () => {
    it('should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<IUserOption>();
      const userOption = { id: '37e3f7e2-fac2-4a3b-bf2f-cb2526358f59' };
      vitest.spyOn(userOptionFormService, 'getUserOption').mockReturnValue(userOption);
      vitest.spyOn(userOptionService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ userOption });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(userOption);
      saveSubject.complete();

      // THEN
      expect(userOptionFormService.getUserOption).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(userOptionService.update).toHaveBeenCalledWith(expect.objectContaining(userOption));
      expect(comp.isSaving()).toEqual(false);
    });

    it('should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<IUserOption>();
      const userOption = { id: '37e3f7e2-fac2-4a3b-bf2f-cb2526358f59' };
      vitest.spyOn(userOptionFormService, 'getUserOption').mockReturnValue({ id: null });
      vitest.spyOn(userOptionService, 'create').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ userOption: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(userOption);
      saveSubject.complete();

      // THEN
      expect(userOptionFormService.getUserOption).toHaveBeenCalled();
      expect(userOptionService.create).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<IUserOption>();
      const userOption = { id: '37e3f7e2-fac2-4a3b-bf2f-cb2526358f59' };
      vitest.spyOn(userOptionService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ userOption });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(userOptionService.update).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });
});
