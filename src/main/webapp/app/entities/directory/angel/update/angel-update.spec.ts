import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { provideTranslateService } from '@ngx-translate/core';
import { Subject, from, of } from 'rxjs';

import { IAngel } from '../angel.model';
import { AngelService } from '../service/angel.service';

import { AngelFormService } from './angel-form.service';
import { AngelUpdate } from './angel-update';

describe('Angel Management Update Component', () => {
  let comp: AngelUpdate;
  let fixture: ComponentFixture<AngelUpdate>;
  let activatedRoute: ActivatedRoute;
  let angelFormService: AngelFormService;
  let angelService: AngelService;

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

    fixture = TestBed.createComponent(AngelUpdate);
    activatedRoute = TestBed.inject(ActivatedRoute);
    angelFormService = TestBed.inject(AngelFormService);
    angelService = TestBed.inject(AngelService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should update editForm', () => {
      const angel: IAngel = { id: 'a848bf89-7dc8-4acc-9803-d42a457c8a33' };

      activatedRoute.data = of({ angel });
      comp.ngOnInit();

      expect(comp.angel).toEqual(angel);
    });
  });

  describe('save', () => {
    it('should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<IAngel>();
      const angel = { id: 'b2b45139-eede-4143-805e-4fb6b8885f54' };
      vitest.spyOn(angelFormService, 'getAngel').mockReturnValue(angel);
      vitest.spyOn(angelService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ angel });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(angel);
      saveSubject.complete();

      // THEN
      expect(angelFormService.getAngel).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(angelService.update).toHaveBeenCalledWith(expect.objectContaining(angel));
      expect(comp.isSaving()).toEqual(false);
    });

    it('should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<IAngel>();
      const angel = { id: 'b2b45139-eede-4143-805e-4fb6b8885f54' };
      vitest.spyOn(angelFormService, 'getAngel').mockReturnValue({ id: null });
      vitest.spyOn(angelService, 'create').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ angel: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(angel);
      saveSubject.complete();

      // THEN
      expect(angelFormService.getAngel).toHaveBeenCalled();
      expect(angelService.create).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<IAngel>();
      const angel = { id: 'b2b45139-eede-4143-805e-4fb6b8885f54' };
      vitest.spyOn(angelService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ angel });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(angelService.update).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });
});
