import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { provideTranslateService } from '@ngx-translate/core';
import { Subject, from, of } from 'rxjs';

import { IMessage } from '../message.model';
import { MessageService } from '../service/message.service';

import { MessageFormService } from './message-form.service';
import { MessageUpdate } from './message-update';

describe('Message Management Update Component', () => {
  let comp: MessageUpdate;
  let fixture: ComponentFixture<MessageUpdate>;
  let activatedRoute: ActivatedRoute;
  let messageFormService: MessageFormService;
  let messageService: MessageService;

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

    fixture = TestBed.createComponent(MessageUpdate);
    activatedRoute = TestBed.inject(ActivatedRoute);
    messageFormService = TestBed.inject(MessageFormService);
    messageService = TestBed.inject(MessageService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should update editForm', () => {
      const message: IMessage = { id: 11110 };

      activatedRoute.data = of({ message });
      comp.ngOnInit();

      expect(comp.message).toEqual(message);
    });
  });

  describe('save', () => {
    it('should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<IMessage>();
      const message = { id: 6456 };
      vitest.spyOn(messageFormService, 'getMessage').mockReturnValue(message);
      vitest.spyOn(messageService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ message });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(message);
      saveSubject.complete();

      // THEN
      expect(messageFormService.getMessage).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(messageService.update).toHaveBeenCalledWith(expect.objectContaining(message));
      expect(comp.isSaving()).toEqual(false);
    });

    it('should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<IMessage>();
      const message = { id: 6456 };
      vitest.spyOn(messageFormService, 'getMessage').mockReturnValue({ id: null });
      vitest.spyOn(messageService, 'create').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ message: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(message);
      saveSubject.complete();

      // THEN
      expect(messageFormService.getMessage).toHaveBeenCalled();
      expect(messageService.create).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<IMessage>();
      const message = { id: 6456 };
      vitest.spyOn(messageService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ message });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(messageService.update).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });
});
