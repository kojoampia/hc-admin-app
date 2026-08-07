import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { HttpResponse } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { provideTranslateService } from '@ngx-translate/core';
import { Subject, from, of } from 'rxjs';

import { IProfessional } from 'app/entities/directory/professional/professional.model';
import { ProfessionalService } from 'app/entities/directory/professional/service/professional.service';
import { IMessage } from 'app/entities/operations/message/message.model';
import { MessageService } from 'app/entities/operations/message/service/message.service';
import { TaskService } from '../service/task.service';
import { ITask } from '../task.model';

import { TaskFormService } from './task-form.service';
import { TaskUpdate } from './task-update';

describe('Task Management Update Component', () => {
  let comp: TaskUpdate;
  let fixture: ComponentFixture<TaskUpdate>;
  let activatedRoute: ActivatedRoute;
  let taskFormService: TaskFormService;
  let taskService: TaskService;
  let professionalService: ProfessionalService;
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

    fixture = TestBed.createComponent(TaskUpdate);
    activatedRoute = TestBed.inject(ActivatedRoute);
    taskFormService = TestBed.inject(TaskFormService);
    taskService = TestBed.inject(TaskService);
    professionalService = TestBed.inject(ProfessionalService);
    messageService = TestBed.inject(MessageService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should call Professional query and add missing value', () => {
      const task: ITask = { id: '59358286-4c96-4301-945b-e60ba7cd5403' };
      const owner: IProfessional = { id: '2c613901-f64b-4441-b80a-f5fb03b8e466' };
      task.owner = owner;

      const professionalCollection: IProfessional[] = [{ id: '2c613901-f64b-4441-b80a-f5fb03b8e466' }];
      vitest.spyOn(professionalService, 'query').mockReturnValue(of(new HttpResponse({ body: professionalCollection })));
      const additionalProfessionals = [owner];
      const expectedCollection: IProfessional[] = [...additionalProfessionals, ...professionalCollection];
      vitest.spyOn(professionalService, 'addProfessionalToCollectionIfMissing').mockReturnValue(expectedCollection);

      activatedRoute.data = of({ task });
      comp.ngOnInit();

      expect(professionalService.query).toHaveBeenCalled();
      expect(professionalService.addProfessionalToCollectionIfMissing).toHaveBeenCalledWith(
        professionalCollection,
        ...additionalProfessionals.map(i => expect.objectContaining(i) as typeof i),
      );
      expect(comp.professionalsSharedCollection()).toEqual(expectedCollection);
    });

    it('should call Message query and add missing value', () => {
      const task: ITask = { id: '59358286-4c96-4301-945b-e60ba7cd5403' };
      const sourceMessage: IMessage = { id: '35ac2a14-31ca-4318-8e02-123f67ebfc01' };
      task.sourceMessage = sourceMessage;

      const messageCollection: IMessage[] = [{ id: '35ac2a14-31ca-4318-8e02-123f67ebfc01' }];
      vitest.spyOn(messageService, 'query').mockReturnValue(of(new HttpResponse({ body: messageCollection })));
      const additionalMessages = [sourceMessage];
      const expectedCollection: IMessage[] = [...additionalMessages, ...messageCollection];
      vitest.spyOn(messageService, 'addMessageToCollectionIfMissing').mockReturnValue(expectedCollection);

      activatedRoute.data = of({ task });
      comp.ngOnInit();

      expect(messageService.query).toHaveBeenCalled();
      expect(messageService.addMessageToCollectionIfMissing).toHaveBeenCalledWith(
        messageCollection,
        ...additionalMessages.map(i => expect.objectContaining(i) as typeof i),
      );
      expect(comp.messagesSharedCollection()).toEqual(expectedCollection);
    });

    it('should update editForm', () => {
      const task: ITask = { id: '59358286-4c96-4301-945b-e60ba7cd5403' };
      const owner: IProfessional = { id: '2c613901-f64b-4441-b80a-f5fb03b8e466' };
      task.owner = owner;
      const sourceMessage: IMessage = { id: '35ac2a14-31ca-4318-8e02-123f67ebfc01' };
      task.sourceMessage = sourceMessage;

      activatedRoute.data = of({ task });
      comp.ngOnInit();

      expect(comp.professionalsSharedCollection()).toContainEqual(owner);
      expect(comp.messagesSharedCollection()).toContainEqual(sourceMessage);
      expect(comp.task).toEqual(task);
    });
  });

  describe('save', () => {
    it('should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<ITask>();
      const task = { id: 'ca341530-545c-46df-8582-8232c8c59bdb' };
      vitest.spyOn(taskFormService, 'getTask').mockReturnValue(task);
      vitest.spyOn(taskService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ task });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(task);
      saveSubject.complete();

      // THEN
      expect(taskFormService.getTask).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(taskService.update).toHaveBeenCalledWith(expect.objectContaining(task));
      expect(comp.isSaving()).toEqual(false);
    });

    it('should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<ITask>();
      const task = { id: 'ca341530-545c-46df-8582-8232c8c59bdb' };
      vitest.spyOn(taskFormService, 'getTask').mockReturnValue({ id: null });
      vitest.spyOn(taskService, 'create').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ task: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(task);
      saveSubject.complete();

      // THEN
      expect(taskFormService.getTask).toHaveBeenCalled();
      expect(taskService.create).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<ITask>();
      const task = { id: 'ca341530-545c-46df-8582-8232c8c59bdb' };
      vitest.spyOn(taskService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ task });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(taskService.update).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });

  describe('Compare relationships', () => {
    describe('compareProfessional', () => {
      it('should forward to professionalService', () => {
        const entity = { id: '2c613901-f64b-4441-b80a-f5fb03b8e466' };
        const entity2 = { id: '0e955bb7-9639-4125-b816-aa9d995e679e' };
        vitest.spyOn(professionalService, 'compareProfessional');
        comp.compareProfessional(entity, entity2);
        expect(professionalService.compareProfessional).toHaveBeenCalledWith(entity, entity2);
      });
    });

    describe('compareMessage', () => {
      it('should forward to messageService', () => {
        const entity = { id: '35ac2a14-31ca-4318-8e02-123f67ebfc01' };
        const entity2 = { id: '62dae599-15e8-4037-8773-418e989eba79' };
        vitest.spyOn(messageService, 'compareMessage');
        comp.compareMessage(entity, entity2);
        expect(messageService.compareMessage).toHaveBeenCalledWith(entity, entity2);
      });
    });
  });
});
