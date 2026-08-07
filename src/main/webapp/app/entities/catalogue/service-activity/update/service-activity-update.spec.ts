import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { HttpResponse } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { provideTranslateService } from '@ngx-translate/core';
import { Subject, from, of } from 'rxjs';

import { ICategory } from 'app/entities/catalogue/category/category.model';
import { CategoryService } from 'app/entities/catalogue/category/service/category.service';
import { ServiceActivityService } from '../service/service-activity.service';
import { IServiceActivity } from '../service-activity.model';

import { ServiceActivityFormService } from './service-activity-form.service';
import { ServiceActivityUpdate } from './service-activity-update';

describe('ServiceActivity Management Update Component', () => {
  let comp: ServiceActivityUpdate;
  let fixture: ComponentFixture<ServiceActivityUpdate>;
  let activatedRoute: ActivatedRoute;
  let serviceActivityFormService: ServiceActivityFormService;
  let serviceActivityService: ServiceActivityService;
  let categoryService: CategoryService;

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

    fixture = TestBed.createComponent(ServiceActivityUpdate);
    activatedRoute = TestBed.inject(ActivatedRoute);
    serviceActivityFormService = TestBed.inject(ServiceActivityFormService);
    serviceActivityService = TestBed.inject(ServiceActivityService);
    categoryService = TestBed.inject(CategoryService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should call Category query and add missing value', () => {
      const serviceActivity: IServiceActivity = { id: '0838588b-421d-42a6-97a1-14b21853407e' };
      const category: ICategory = { id: '32948133-0615-4b7d-82d4-7d0e6b590fb7' };
      serviceActivity.category = category;

      const categoryCollection: ICategory[] = [{ id: '32948133-0615-4b7d-82d4-7d0e6b590fb7' }];
      vitest.spyOn(categoryService, 'query').mockReturnValue(of(new HttpResponse({ body: categoryCollection })));
      const additionalCategories = [category];
      const expectedCollection: ICategory[] = [...additionalCategories, ...categoryCollection];
      vitest.spyOn(categoryService, 'addCategoryToCollectionIfMissing').mockReturnValue(expectedCollection);

      activatedRoute.data = of({ serviceActivity });
      comp.ngOnInit();

      expect(categoryService.query).toHaveBeenCalled();
      expect(categoryService.addCategoryToCollectionIfMissing).toHaveBeenCalledWith(
        categoryCollection,
        ...additionalCategories.map(i => expect.objectContaining(i) as typeof i),
      );
      expect(comp.categoriesSharedCollection()).toEqual(expectedCollection);
    });

    it('should update editForm', () => {
      const serviceActivity: IServiceActivity = { id: '0838588b-421d-42a6-97a1-14b21853407e' };
      const category: ICategory = { id: '32948133-0615-4b7d-82d4-7d0e6b590fb7' };
      serviceActivity.category = category;

      activatedRoute.data = of({ serviceActivity });
      comp.ngOnInit();

      expect(comp.categoriesSharedCollection()).toContainEqual(category);
      expect(comp.serviceActivity).toEqual(serviceActivity);
    });
  });

  describe('save', () => {
    it('should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<IServiceActivity>();
      const serviceActivity = { id: 'e58e53d8-3de4-4287-add1-bbf6e52730f0' };
      vitest.spyOn(serviceActivityFormService, 'getServiceActivity').mockReturnValue(serviceActivity);
      vitest.spyOn(serviceActivityService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ serviceActivity });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(serviceActivity);
      saveSubject.complete();

      // THEN
      expect(serviceActivityFormService.getServiceActivity).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(serviceActivityService.update).toHaveBeenCalledWith(expect.objectContaining(serviceActivity));
      expect(comp.isSaving()).toEqual(false);
    });

    it('should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<IServiceActivity>();
      const serviceActivity = { id: 'e58e53d8-3de4-4287-add1-bbf6e52730f0' };
      vitest.spyOn(serviceActivityFormService, 'getServiceActivity').mockReturnValue({ id: null });
      vitest.spyOn(serviceActivityService, 'create').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ serviceActivity: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(serviceActivity);
      saveSubject.complete();

      // THEN
      expect(serviceActivityFormService.getServiceActivity).toHaveBeenCalled();
      expect(serviceActivityService.create).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<IServiceActivity>();
      const serviceActivity = { id: 'e58e53d8-3de4-4287-add1-bbf6e52730f0' };
      vitest.spyOn(serviceActivityService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ serviceActivity });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(serviceActivityService.update).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });

  describe('Compare relationships', () => {
    describe('compareCategory', () => {
      it('should forward to categoryService', () => {
        const entity = { id: '32948133-0615-4b7d-82d4-7d0e6b590fb7' };
        const entity2 = { id: '6e928816-99ce-488b-9609-4b7afe09aa38' };
        vitest.spyOn(categoryService, 'compareCategory');
        comp.compareCategory(entity, entity2);
        expect(categoryService.compareCategory).toHaveBeenCalledWith(entity, entity2);
      });
    });
  });
});
