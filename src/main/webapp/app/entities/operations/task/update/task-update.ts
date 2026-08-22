import { HttpResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbInputDatepicker } from '@ng-bootstrap/ng-bootstrap/datepicker';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable, finalize, map } from 'rxjs';

import { RELATIONSHIP_OPTIONS_PAGE_SIZE } from 'app/config/pagination.constants';
import { IProfessional } from 'app/entities/directory/professional/professional.model';
import { ProfessionalService } from 'app/entities/directory/professional/service/professional.service';
import { Priority } from 'app/entities/enumerations/priority.model';
import { TaskState } from 'app/entities/enumerations/task-state.model';
import { IMessage } from 'app/entities/operations/message/message.model';
import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';

import { TaskService } from '../service/task.service';
import { ITask } from '../task.model';

import { TaskFormGroup, TaskFormService } from './task-form.service';
import { MessageService } from 'app/entities/operations/message/service/message.service';
import RecordLabelPipe from 'app/shared/format/record-label.pipe';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-task-update',
  templateUrl: './task-update.html',
  imports: [RecordLabelPipe, TranslateDirective, TranslatePipe, FontAwesomeModule, AlertError, ReactiveFormsModule, NgbInputDatepicker],
})
export class TaskUpdate implements OnInit {
  readonly isSaving = signal(false);
  task: ITask | null = null;
  taskStateValues = Object.keys(TaskState);
  priorityValues = Object.keys(Priority);

  professionalsSharedCollection = signal<IProfessional[]>([]);
  messagesSharedCollection = signal<IMessage[]>([]);

  protected taskService = inject(TaskService);
  protected taskFormService = inject(TaskFormService);
  protected professionalService = inject(ProfessionalService);
  protected messageService = inject(MessageService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: TaskFormGroup = this.taskFormService.createTaskFormGroup();

  compareProfessional = (o1: IProfessional | null, o2: IProfessional | null): boolean =>
    this.professionalService.compareProfessional(o1, o2);

  compareMessage = (o1: IMessage | null, o2: IMessage | null): boolean => this.messageService.compareMessage(o1, o2);

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ task }) => {
      this.task = task;
      if (task) {
        this.updateForm(task);
      }

      this.loadRelationshipsOptions();
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const task = this.taskFormService.getTask(this.editForm);
    if (task.id === null) {
      this.subscribeToSaveResponse(this.taskService.create(task));
    } else {
      this.subscribeToSaveResponse(this.taskService.update(task));
    }
  }

  protected subscribeToSaveResponse(result: Observable<ITask | null>): void {
    result.pipe(finalize(() => this.onSaveFinalize())).subscribe({
      next: () => this.onSaveSuccess(),
      error: () => this.onSaveError(),
    });
  }

  protected onSaveSuccess(): void {
    this.previousState();
  }

  protected onSaveError(): void {
    // Api for inheritance.
  }

  protected onSaveFinalize(): void {
    this.isSaving.set(false);
  }

  protected updateForm(task: ITask): void {
    this.task = task;
    this.taskFormService.resetForm(this.editForm, task);

    this.professionalsSharedCollection.update(professionals =>
      this.professionalService.addProfessionalToCollectionIfMissing<IProfessional>(professionals, task.owner),
    );
    this.messagesSharedCollection.update(messages =>
      this.messageService.addMessageToCollectionIfMissing<IMessage>(messages, task.sourceMessage),
    );
  }

  protected loadRelationshipsOptions(): void {
    this.professionalService
      .query({ size: RELATIONSHIP_OPTIONS_PAGE_SIZE })
      .pipe(map((res: HttpResponse<IProfessional[]>) => res.body ?? []))
      .pipe(
        map((professionals: IProfessional[]) =>
          this.professionalService.addProfessionalToCollectionIfMissing<IProfessional>(professionals, this.task?.owner),
        ),
      )
      .subscribe((professionals: IProfessional[]) => this.professionalsSharedCollection.set(professionals));

    this.messageService
      .query({ size: RELATIONSHIP_OPTIONS_PAGE_SIZE })
      .pipe(map((res: HttpResponse<IMessage[]>) => res.body ?? []))
      .pipe(
        map((messages: IMessage[]) => this.messageService.addMessageToCollectionIfMissing<IMessage>(messages, this.task?.sourceMessage)),
      )
      .subscribe((messages: IMessage[]) => this.messagesSharedCollection.set(messages));
  }
}
