import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { HttpResponse } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { provideTranslateService } from '@ngx-translate/core';
import { Subject, from, of } from 'rxjs';

import { IProfile } from 'app/entities/directory/profile/profile.model';
import { ProfileService } from 'app/entities/directory/profile/service/profile.service';
import { ICredential } from 'app/entities/platform/credential/credential.model';
import { CredentialService } from 'app/entities/platform/credential/service/credential.service';
import { IHub } from 'app/entities/platform/hub/hub.model';
import { HubService } from 'app/entities/platform/hub/service/hub.service';
import { TeamService } from 'app/entities/platform/team/service/team.service';
import { ITeam } from 'app/entities/platform/team/team.model';
import { IProfessional } from '../professional.model';
import { ProfessionalService } from '../service/professional.service';

import { ProfessionalFormService } from './professional-form.service';
import { ProfessionalUpdate } from './professional-update';

describe('Professional Management Update Component', () => {
  let comp: ProfessionalUpdate;
  let fixture: ComponentFixture<ProfessionalUpdate>;
  let activatedRoute: ActivatedRoute;
  let professionalFormService: ProfessionalFormService;
  let professionalService: ProfessionalService;
  let profileService: ProfileService;
  let credentialService: CredentialService;
  let teamService: TeamService;
  let hubService: HubService;

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

    fixture = TestBed.createComponent(ProfessionalUpdate);
    activatedRoute = TestBed.inject(ActivatedRoute);
    professionalFormService = TestBed.inject(ProfessionalFormService);
    professionalService = TestBed.inject(ProfessionalService);
    profileService = TestBed.inject(ProfileService);
    credentialService = TestBed.inject(CredentialService);
    teamService = TestBed.inject(TeamService);
    hubService = TestBed.inject(HubService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should call profile query and add missing value', () => {
      const professional: IProfessional = { id: 25942 };
      const profile: IProfile = { id: 32255 };
      professional.profile = profile;

      const profileCollection: IProfile[] = [{ id: 32255 }];
      vitest.spyOn(profileService, 'query').mockReturnValue(of(new HttpResponse({ body: profileCollection })));
      const expectedCollection: IProfile[] = [profile, ...profileCollection];
      vitest.spyOn(profileService, 'addProfileToCollectionIfMissing').mockReturnValue(expectedCollection);

      activatedRoute.data = of({ professional });
      comp.ngOnInit();

      expect(profileService.query).toHaveBeenCalled();
      expect(profileService.addProfileToCollectionIfMissing).toHaveBeenCalledWith(profileCollection, profile);
      expect(comp.profilesCollection()).toEqual(expectedCollection);
    });

    it('should call credential query and add missing value', () => {
      const professional: IProfessional = { id: 25942 };
      const credential: ICredential = { id: 6323 };
      professional.credential = credential;

      const credentialCollection: ICredential[] = [{ id: 6323 }];
      vitest.spyOn(credentialService, 'query').mockReturnValue(of(new HttpResponse({ body: credentialCollection })));
      const expectedCollection: ICredential[] = [credential, ...credentialCollection];
      vitest.spyOn(credentialService, 'addCredentialToCollectionIfMissing').mockReturnValue(expectedCollection);

      activatedRoute.data = of({ professional });
      comp.ngOnInit();

      expect(credentialService.query).toHaveBeenCalled();
      expect(credentialService.addCredentialToCollectionIfMissing).toHaveBeenCalledWith(credentialCollection, credential);
      expect(comp.credentialsCollection()).toEqual(expectedCollection);
    });

    it('should call Team query and add missing value', () => {
      const professional: IProfessional = { id: 25942 };
      const team: ITeam = { id: 1226 };
      professional.team = team;

      const teamCollection: ITeam[] = [{ id: 1226 }];
      vitest.spyOn(teamService, 'query').mockReturnValue(of(new HttpResponse({ body: teamCollection })));
      const additionalTeams = [team];
      const expectedCollection: ITeam[] = [...additionalTeams, ...teamCollection];
      vitest.spyOn(teamService, 'addTeamToCollectionIfMissing').mockReturnValue(expectedCollection);

      activatedRoute.data = of({ professional });
      comp.ngOnInit();

      expect(teamService.query).toHaveBeenCalled();
      expect(teamService.addTeamToCollectionIfMissing).toHaveBeenCalledWith(
        teamCollection,
        ...additionalTeams.map(i => expect.objectContaining(i) as typeof i),
      );
      expect(comp.teamsSharedCollection()).toEqual(expectedCollection);
    });

    it('should call Hub query and add missing value', () => {
      const professional: IProfessional = { id: 25942 };
      const hub: IHub = { id: 23336 };
      professional.hub = hub;

      const hubCollection: IHub[] = [{ id: 23336 }];
      vitest.spyOn(hubService, 'query').mockReturnValue(of(new HttpResponse({ body: hubCollection })));
      const additionalHubs = [hub];
      const expectedCollection: IHub[] = [...additionalHubs, ...hubCollection];
      vitest.spyOn(hubService, 'addHubToCollectionIfMissing').mockReturnValue(expectedCollection);

      activatedRoute.data = of({ professional });
      comp.ngOnInit();

      expect(hubService.query).toHaveBeenCalled();
      expect(hubService.addHubToCollectionIfMissing).toHaveBeenCalledWith(
        hubCollection,
        ...additionalHubs.map(i => expect.objectContaining(i) as typeof i),
      );
      expect(comp.hubsSharedCollection()).toEqual(expectedCollection);
    });

    it('should update editForm', () => {
      const professional: IProfessional = { id: 25942 };
      const profile: IProfile = { id: 32255 };
      professional.profile = profile;
      const credential: ICredential = { id: 6323 };
      professional.credential = credential;
      const team: ITeam = { id: 1226 };
      professional.team = team;
      const hub: IHub = { id: 23336 };
      professional.hub = hub;

      activatedRoute.data = of({ professional });
      comp.ngOnInit();

      expect(comp.profilesCollection()).toContainEqual(profile);
      expect(comp.credentialsCollection()).toContainEqual(credential);
      expect(comp.teamsSharedCollection()).toContainEqual(team);
      expect(comp.hubsSharedCollection()).toContainEqual(hub);
      expect(comp.professional).toEqual(professional);
    });
  });

  describe('save', () => {
    it('should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<IProfessional>();
      const professional = { id: 4421 };
      vitest.spyOn(professionalFormService, 'getProfessional').mockReturnValue(professional);
      vitest.spyOn(professionalService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ professional });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(professional);
      saveSubject.complete();

      // THEN
      expect(professionalFormService.getProfessional).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(professionalService.update).toHaveBeenCalledWith(expect.objectContaining(professional));
      expect(comp.isSaving()).toEqual(false);
    });

    it('should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<IProfessional>();
      const professional = { id: 4421 };
      vitest.spyOn(professionalFormService, 'getProfessional').mockReturnValue({ id: null });
      vitest.spyOn(professionalService, 'create').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ professional: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(professional);
      saveSubject.complete();

      // THEN
      expect(professionalFormService.getProfessional).toHaveBeenCalled();
      expect(professionalService.create).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<IProfessional>();
      const professional = { id: 4421 };
      vitest.spyOn(professionalService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ professional });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(professionalService.update).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });

  describe('Compare relationships', () => {
    describe('compareProfile', () => {
      it('should forward to profileService', () => {
        const entity = { id: 32255 };
        const entity2 = { id: 13324 };
        vitest.spyOn(profileService, 'compareProfile');
        comp.compareProfile(entity, entity2);
        expect(profileService.compareProfile).toHaveBeenCalledWith(entity, entity2);
      });
    });

    describe('compareCredential', () => {
      it('should forward to credentialService', () => {
        const entity = { id: 6323 };
        const entity2 = { id: 10754 };
        vitest.spyOn(credentialService, 'compareCredential');
        comp.compareCredential(entity, entity2);
        expect(credentialService.compareCredential).toHaveBeenCalledWith(entity, entity2);
      });
    });

    describe('compareTeam', () => {
      it('should forward to teamService', () => {
        const entity = { id: 1226 };
        const entity2 = { id: 14592 };
        vitest.spyOn(teamService, 'compareTeam');
        comp.compareTeam(entity, entity2);
        expect(teamService.compareTeam).toHaveBeenCalledWith(entity, entity2);
      });
    });

    describe('compareHub', () => {
      it('should forward to hubService', () => {
        const entity = { id: 23336 };
        const entity2 = { id: 23512 };
        vitest.spyOn(hubService, 'compareHub');
        comp.compareHub(entity, entity2);
        expect(hubService.compareHub).toHaveBeenCalledWith(entity, entity2);
      });
    });
  });
});
