import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { provideTranslateService } from '@ngx-translate/core';
import { Subject, from, of } from 'rxjs';

import { ICredential } from '../credential.model';
import { CredentialService } from '../service/credential.service';

import { CredentialFormService } from './credential-form.service';
import { CredentialUpdate } from './credential-update';

describe('Credential Management Update Component', () => {
  let comp: CredentialUpdate;
  let fixture: ComponentFixture<CredentialUpdate>;
  let activatedRoute: ActivatedRoute;
  let credentialFormService: CredentialFormService;
  let credentialService: CredentialService;

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

    fixture = TestBed.createComponent(CredentialUpdate);
    activatedRoute = TestBed.inject(ActivatedRoute);
    credentialFormService = TestBed.inject(CredentialFormService);
    credentialService = TestBed.inject(CredentialService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should update editForm', () => {
      const credential: ICredential = { id: 10754 };

      activatedRoute.data = of({ credential });
      comp.ngOnInit();

      expect(comp.credential).toEqual(credential);
    });
  });

  describe('save', () => {
    it('should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<ICredential>();
      const credential = { id: 6323 };
      vitest.spyOn(credentialFormService, 'getCredential').mockReturnValue(credential);
      vitest.spyOn(credentialService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ credential });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(credential);
      saveSubject.complete();

      // THEN
      expect(credentialFormService.getCredential).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(credentialService.update).toHaveBeenCalledWith(expect.objectContaining(credential));
      expect(comp.isSaving()).toEqual(false);
    });

    it('should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<ICredential>();
      const credential = { id: 6323 };
      vitest.spyOn(credentialFormService, 'getCredential').mockReturnValue({ id: null });
      vitest.spyOn(credentialService, 'create').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ credential: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(credential);
      saveSubject.complete();

      // THEN
      expect(credentialFormService.getCredential).toHaveBeenCalled();
      expect(credentialService.create).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<ICredential>();
      const credential = { id: 6323 };
      vitest.spyOn(credentialService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ credential });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(credentialService.update).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });
});
