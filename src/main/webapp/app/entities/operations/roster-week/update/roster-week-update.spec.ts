import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { provideTranslateService } from '@ngx-translate/core';
import { Subject, from, of } from 'rxjs';

import { IRosterWeek } from '../roster-week.model';
import { RosterWeekService } from '../service/roster-week.service';

import { RosterWeekFormService } from './roster-week-form.service';
import { RosterWeekUpdate } from './roster-week-update';

describe('RosterWeek Management Update Component', () => {
  let comp: RosterWeekUpdate;
  let fixture: ComponentFixture<RosterWeekUpdate>;
  let activatedRoute: ActivatedRoute;
  let rosterWeekFormService: RosterWeekFormService;
  let rosterWeekService: RosterWeekService;

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

    fixture = TestBed.createComponent(RosterWeekUpdate);
    activatedRoute = TestBed.inject(ActivatedRoute);
    rosterWeekFormService = TestBed.inject(RosterWeekFormService);
    rosterWeekService = TestBed.inject(RosterWeekService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should update editForm', () => {
      const rosterWeek: IRosterWeek = { id: 27516 };

      activatedRoute.data = of({ rosterWeek });
      comp.ngOnInit();

      expect(comp.rosterWeek).toEqual(rosterWeek);
    });
  });

  describe('save', () => {
    it('should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<IRosterWeek>();
      const rosterWeek = { id: 20651 };
      vitest.spyOn(rosterWeekFormService, 'getRosterWeek').mockReturnValue(rosterWeek);
      vitest.spyOn(rosterWeekService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ rosterWeek });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(rosterWeek);
      saveSubject.complete();

      // THEN
      expect(rosterWeekFormService.getRosterWeek).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(rosterWeekService.update).toHaveBeenCalledWith(expect.objectContaining(rosterWeek));
      expect(comp.isSaving()).toEqual(false);
    });

    it('should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<IRosterWeek>();
      const rosterWeek = { id: 20651 };
      vitest.spyOn(rosterWeekFormService, 'getRosterWeek').mockReturnValue({ id: null });
      vitest.spyOn(rosterWeekService, 'create').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ rosterWeek: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(rosterWeek);
      saveSubject.complete();

      // THEN
      expect(rosterWeekFormService.getRosterWeek).toHaveBeenCalled();
      expect(rosterWeekService.create).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<IRosterWeek>();
      const rosterWeek = { id: 20651 };
      vitest.spyOn(rosterWeekService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ rosterWeek });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(rosterWeekService.update).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });
});
