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
      const shiftAssignment: IShiftAssignment = { id: 'bc933842-bb42-4958-8965-51ce81c7d1eb' };
      const week: IRosterWeek = { id: 'ade462b2-f291-49db-a5f8-d4638f0545b4' };
      shiftAssignment.week = week;

      const rosterWeekCollection: IRosterWeek[] = [{ id: 'ade462b2-f291-49db-a5f8-d4638f0545b4' }];
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
      const shiftAssignment: IShiftAssignment = { id: 'bc933842-bb42-4958-8965-51ce81c7d1eb' };
      const professional: IProfessional = { id: '2c613901-f64b-4441-b80a-f5fb03b8e466' };
      shiftAssignment.professional = professional;

      const professionalCollection: IProfessional[] = [{ id: '2c613901-f64b-4441-b80a-f5fb03b8e466' }];
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
      const shiftAssignment: IShiftAssignment = { id: 'bc933842-bb42-4958-8965-51ce81c7d1eb' };
      const week: IRosterWeek = { id: 'ade462b2-f291-49db-a5f8-d4638f0545b4' };
      shiftAssignment.week = week;
      const professional: IProfessional = { id: '2c613901-f64b-4441-b80a-f5fb03b8e466' };
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
      const shiftAssignment = { id: 'ba896828-02d4-4a87-8c48-9e1aad0801a7' };
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
      const shiftAssignment = { id: 'ba896828-02d4-4a87-8c48-9e1aad0801a7' };
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
      const shiftAssignment = { id: 'ba896828-02d4-4a87-8c48-9e1aad0801a7' };
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
        const entity = { id: 'ade462b2-f291-49db-a5f8-d4638f0545b4' };
        const entity2 = { id: 'f8466048-f088-4ce3-9408-2613ebaefbdd' };
        vitest.spyOn(rosterWeekService, 'compareRosterWeek');
        comp.compareRosterWeek(entity, entity2);
        expect(rosterWeekService.compareRosterWeek).toHaveBeenCalledWith(entity, entity2);
      });
    });

    describe('compareProfessional', () => {
      it('should forward to professionalService', () => {
        const entity = { id: '2c613901-f64b-4441-b80a-f5fb03b8e466' };
        const entity2 = { id: '0e955bb7-9639-4125-b816-aa9d995e679e' };
        vitest.spyOn(professionalService, 'compareProfessional');
        comp.compareProfessional(entity, entity2);
        expect(professionalService.compareProfessional).toHaveBeenCalledWith(entity, entity2);
      });
    });
  });
});
