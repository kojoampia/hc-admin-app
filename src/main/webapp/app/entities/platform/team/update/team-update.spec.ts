import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { HttpResponse } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { provideTranslateService } from '@ngx-translate/core';
import { Subject, from, of } from 'rxjs';

import { IProfessional } from 'app/entities/directory/professional/professional.model';
import { ProfessionalService } from 'app/entities/directory/professional/service/professional.service';
import { TeamService } from '../service/team.service';
import { ITeam } from '../team.model';

import { TeamFormService } from './team-form.service';
import { TeamUpdate } from './team-update';

describe('Team Management Update Component', () => {
  let comp: TeamUpdate;
  let fixture: ComponentFixture<TeamUpdate>;
  let activatedRoute: ActivatedRoute;
  let teamFormService: TeamFormService;
  let teamService: TeamService;
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

    fixture = TestBed.createComponent(TeamUpdate);
    activatedRoute = TestBed.inject(ActivatedRoute);
    teamFormService = TestBed.inject(TeamFormService);
    teamService = TestBed.inject(TeamService);
    professionalService = TestBed.inject(ProfessionalService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should call Professional query and add missing value', () => {
      const team: ITeam = { id: 14592 };
      const supervisor: IProfessional = { id: 4421 };
      team.supervisor = supervisor;

      const professionalCollection: IProfessional[] = [{ id: 4421 }];
      vitest.spyOn(professionalService, 'query').mockReturnValue(of(new HttpResponse({ body: professionalCollection })));
      const additionalProfessionals = [supervisor];
      const expectedCollection: IProfessional[] = [...additionalProfessionals, ...professionalCollection];
      vitest.spyOn(professionalService, 'addProfessionalToCollectionIfMissing').mockReturnValue(expectedCollection);

      activatedRoute.data = of({ team });
      comp.ngOnInit();

      expect(professionalService.query).toHaveBeenCalled();
      expect(professionalService.addProfessionalToCollectionIfMissing).toHaveBeenCalledWith(
        professionalCollection,
        ...additionalProfessionals.map(i => expect.objectContaining(i) as typeof i),
      );
      expect(comp.professionalsSharedCollection()).toEqual(expectedCollection);
    });

    it('should update editForm', () => {
      const team: ITeam = { id: 14592 };
      const supervisor: IProfessional = { id: 4421 };
      team.supervisor = supervisor;

      activatedRoute.data = of({ team });
      comp.ngOnInit();

      expect(comp.professionalsSharedCollection()).toContainEqual(supervisor);
      expect(comp.team).toEqual(team);
    });
  });

  describe('save', () => {
    it('should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<ITeam>();
      const team = { id: 1226 };
      vitest.spyOn(teamFormService, 'getTeam').mockReturnValue(team);
      vitest.spyOn(teamService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ team });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(team);
      saveSubject.complete();

      // THEN
      expect(teamFormService.getTeam).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(teamService.update).toHaveBeenCalledWith(expect.objectContaining(team));
      expect(comp.isSaving()).toEqual(false);
    });

    it('should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<ITeam>();
      const team = { id: 1226 };
      vitest.spyOn(teamFormService, 'getTeam').mockReturnValue({ id: null });
      vitest.spyOn(teamService, 'create').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ team: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(team);
      saveSubject.complete();

      // THEN
      expect(teamFormService.getTeam).toHaveBeenCalled();
      expect(teamService.create).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<ITeam>();
      const team = { id: 1226 };
      vitest.spyOn(teamService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ team });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(teamService.update).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });

  describe('Compare relationships', () => {
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
