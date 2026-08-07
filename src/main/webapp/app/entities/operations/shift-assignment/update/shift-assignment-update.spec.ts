import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { HttpResponse } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { provideTranslateService } from '@ngx-translate/core';
import { Subject, from, of } from 'rxjs';

import { IProfessional } from 'app/entities/directory/professional/professional.model';
import { ProfessionalService } from 'app/entities/directory/professional/service/professional.service';
import { IRosterWeek } from 'app/entities/operations/roster-week/roster-week.model';
import { RosterWeekService } from 'app/entities/operations/roster-week/service/roster-week.service';
import { ShiftAssignmentService } from '../service/shift-assignment.service';
import { IShiftAssignment } from '../shift-assignment.model';

import { ShiftAssignmentFormService } from './shift-assignment-form.service';
import { ShiftAssignmentUpdate } from './shift-assignment-update';

describe('ShiftAssignment Management Update Component', () => {
  let comp: ShiftAssignmentUpdate;
  let fixture: ComponentFixture<ShiftAssignmentUpdate>;
  let activatedRoute: ActivatedRoute;
  let shiftAssignmentFormService: ShiftAssignmentFormService;
  let shiftAssignmentService: ShiftAssignmentService;
  let rosterWeekService: RosterWeekService;
  let professionalService: ProfessionalService;

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

    fixture = TestBed.createComponent(ShiftAssignmentUpdate);
    activatedRoute = TestBed.inject(ActivatedRoute);
    shiftAssignmentFormService = TestBed.inject(ShiftAssignmentFormService);
    shiftAssignmentService = TestBed.inject(ShiftAssignmentService);
    rosterWeekService = TestBed.inject(RosterWeekService);
    professionalService = TestBed.inject(ProfessionalService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should call RosterWeek query and add missing value', () => {
      const shiftAssignment: IShiftAssignment = { id: 21237 };
      const week: IRosterWeek = { id: 20651 };
      shiftAssignment.week = week;

      const rosterWeekCollection: IRosterWeek[] = [{ id: 20651 }];
      vitest.spyOn(rosterWeekService, 'query').mockReturnValue(of(new HttpResponse({ body: rosterWeekCollection })));
      const additionalRosterWeeks = [week];
      const expectedCollection: IRosterWeek[] = [...additionalRosterWeeks, ...rosterWeekCollection];
      vitest.spyOn(rosterWeekService, 'addRosterWeekToCollectionIfMissing').mockReturnValue(expectedCollection);

      activatedRoute.data = of({ shiftAssignment });
      comp.ngOnInit();

      expect(rosterWeekService.query).toHaveBeenCalled();
      expect(rosterWeekService.addRosterWeekToCollectionIfMissing).toHaveBeenCalledWith(
        rosterWeekCollection,
        ...additionalRosterWeeks.map(i => expect.objectContaining(i) as typeof i),
      );
      expect(comp.rosterWeeksSharedCollection()).toEqual(expectedCollection);
    });

    it('should call Professional query and add missing value', () => {
      const shiftAssignment: IShiftAssignment = { id: 21237 };
      const professional: IProfessional = { id: 4421 };
      shiftAssignment.professional = professional;

      const professionalCollection: IProfessional[] = [{ id: 4421 }];
      vitest.spyOn(professionalService, 'query').mockReturnValue(of(new HttpResponse({ body: professionalCollection })));
      const additionalProfessionals = [professional];
      const expectedCollection: IProfessional[] = [...additionalProfessionals, ...professionalCollection];
      vitest.spyOn(professionalService, 'addProfessionalToCollectionIfMissing').mockReturnValue(expectedCollection);

      activatedRoute.data = of({ shiftAssignment });
      comp.ngOnInit();

      expect(professionalService.query).toHaveBeenCalled();
      expect(professionalService.addProfessionalToCollectionIfMissing).toHaveBeenCalledWith(
        professionalCollection,
        ...additionalProfessionals.map(i => expect.objectContaining(i) as typeof i),
      );
      expect(comp.professionalsSharedCollection()).toEqual(expectedCollection);
    });

    it('should update editForm', () => {
      const shiftAssignment: IShiftAssignment = { id: 21237 };
      const week: IRosterWeek = { id: 20651 };
      shiftAssignment.week = week;
      const professional: IProfessional = { id: 4421 };
      shiftAssignment.professional = professional;

      activatedRoute.data = of({ shiftAssignment });
      comp.ngOnInit();

      expect(comp.rosterWeeksSharedCollection()).toContainEqual(week);
      expect(comp.professionalsSharedCollection()).toContainEqual(professional);
      expect(comp.shiftAssignment).toEqual(shiftAssignment);
    });
  });

  describe('save', () => {
    it('should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<IShiftAssignment>();
      const shiftAssignment = { id: 24117 };
      vitest.spyOn(shiftAssignmentFormService, 'getShiftAssignment').mockReturnValue(shiftAssignment);
      vitest.spyOn(shiftAssignmentService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ shiftAssignment });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(shiftAssignment);
      saveSubject.complete();

      // THEN
      expect(shiftAssignmentFormService.getShiftAssignment).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(shiftAssignmentService.update).toHaveBeenCalledWith(expect.objectContaining(shiftAssignment));
      expect(comp.isSaving()).toEqual(false);
    });

    it('should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<IShiftAssignment>();
      const shiftAssignment = { id: 24117 };
      vitest.spyOn(shiftAssignmentFormService, 'getShiftAssignment').mockReturnValue({ id: null });
      vitest.spyOn(shiftAssignmentService, 'create').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ shiftAssignment: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(shiftAssignment);
      saveSubject.complete();

      // THEN
      expect(shiftAssignmentFormService.getShiftAssignment).toHaveBeenCalled();
      expect(shiftAssignmentService.create).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<IShiftAssignment>();
      const shiftAssignment = { id: 24117 };
      vitest.spyOn(shiftAssignmentService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ shiftAssignment });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(shiftAssignmentService.update).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });

  describe('Compare relationships', () => {
    describe('compareRosterWeek', () => {
      it('should forward to rosterWeekService', () => {
        const entity = { id: 20651 };
        const entity2 = { id: 27516 };
        vitest.spyOn(rosterWeekService, 'compareRosterWeek');
        comp.compareRosterWeek(entity, entity2);
        expect(rosterWeekService.compareRosterWeek).toHaveBeenCalledWith(entity, entity2);
      });
    });

    describe('compareProfessional', () => {
      it('should forward to professionalService', () => {
        const entity = { id: 4421 };
        const entity2 = { id: 25942 };
        vitest.spyOn(professionalService, 'compareProfessional');
        comp.compareProfessional(entity, entity2);
        expect(professionalService.compareProfessional).toHaveBeenCalledWith(entity, entity2);
      });
    });
  });
});
