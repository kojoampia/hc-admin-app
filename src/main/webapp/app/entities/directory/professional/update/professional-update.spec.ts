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
      const professional: IProfessional = { id: '0e955bb7-9639-4125-b816-aa9d995e679e' };
      const profile: IProfile = { id: 'f60e8f71-7b26-4f3d-8111-2c32dce7269d' };
      professional.profile = profile;

      const profileCollection: IProfile[] = [{ id: 'f60e8f71-7b26-4f3d-8111-2c32dce7269d' }];
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
      const professional: IProfessional = { id: '0e955bb7-9639-4125-b816-aa9d995e679e' };
      const credential: ICredential = { id: '35b3b582-8e66-4c2d-9e4a-8ff9d99022d0' };
      professional.credential = credential;

      const credentialCollection: ICredential[] = [{ id: '35b3b582-8e66-4c2d-9e4a-8ff9d99022d0' }];
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
      const professional: IProfessional = { id: '0e955bb7-9639-4125-b816-aa9d995e679e' };
      const team: ITeam = { id: '07c2eeb9-6f13-455e-bbad-df15a9442470' };
      professional.team = team;

      const teamCollection: ITeam[] = [{ id: '07c2eeb9-6f13-455e-bbad-df15a9442470' }];
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
      const professional: IProfessional = { id: '0e955bb7-9639-4125-b816-aa9d995e679e' };
      const hub: IHub = { id: 'bb609620-c7ae-4900-948f-445397c053ae' };
      professional.hub = hub;

      const hubCollection: IHub[] = [{ id: 'bb609620-c7ae-4900-948f-445397c053ae' }];
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
      const professional: IProfessional = { id: '0e955bb7-9639-4125-b816-aa9d995e679e' };
      const profile: IProfile = { id: 'f60e8f71-7b26-4f3d-8111-2c32dce7269d' };
      professional.profile = profile;
      const credential: ICredential = { id: '35b3b582-8e66-4c2d-9e4a-8ff9d99022d0' };
      professional.credential = credential;
      const team: ITeam = { id: '07c2eeb9-6f13-455e-bbad-df15a9442470' };
      professional.team = team;
      const hub: IHub = { id: 'bb609620-c7ae-4900-948f-445397c053ae' };
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
      const professional = { id: '2c613901-f64b-4441-b80a-f5fb03b8e466' };
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
      const professional = { id: '2c613901-f64b-4441-b80a-f5fb03b8e466' };
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
      const professional = { id: '2c613901-f64b-4441-b80a-f5fb03b8e466' };
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
        const entity = { id: 'f60e8f71-7b26-4f3d-8111-2c32dce7269d' };
        const entity2 = { id: '5ac8ab7a-123d-4318-b51e-b9301878a25d' };
        vitest.spyOn(profileService, 'compareProfile');
        comp.compareProfile(entity, entity2);
        expect(profileService.compareProfile).toHaveBeenCalledWith(entity, entity2);
      });
    });

    describe('compareCredential', () => {
      it('should forward to credentialService', () => {
        const entity = { id: '35b3b582-8e66-4c2d-9e4a-8ff9d99022d0' };
        const entity2 = { id: '37c978bd-bd74-4bba-a58a-e21267b95005' };
        vitest.spyOn(credentialService, 'compareCredential');
        comp.compareCredential(entity, entity2);
        expect(credentialService.compareCredential).toHaveBeenCalledWith(entity, entity2);
      });
    });

    describe('compareTeam', () => {
      it('should forward to teamService', () => {
        const entity = { id: '07c2eeb9-6f13-455e-bbad-df15a9442470' };
        const entity2 = { id: 'e82fb6d5-fe08-47fe-a516-8889cd5f9288' };
        vitest.spyOn(teamService, 'compareTeam');
        comp.compareTeam(entity, entity2);
        expect(teamService.compareTeam).toHaveBeenCalledWith(entity, entity2);
      });
    });

    describe('compareHub', () => {
      it('should forward to hubService', () => {
        const entity = { id: 'bb609620-c7ae-4900-948f-445397c053ae' };
        const entity2 = { id: '143c62d2-b763-4122-b4a2-4f688eee63a5' };
        vitest.spyOn(hubService, 'compareHub');
        comp.compareHub(entity, entity2);
        expect(hubService.compareHub).toHaveBeenCalledWith(entity, entity2);
      });
    });
  });
});
