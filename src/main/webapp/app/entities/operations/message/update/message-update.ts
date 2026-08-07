import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable, finalize } from 'rxjs';

import { DataUtils, FileLoadError } from 'app/core/util/data-util.service';
import { EventManager, EventWithContent } from 'app/core/util/event-manager.service';
import { MessageChannel } from 'app/entities/enumerations/message-channel.model';
import { MessageStatus } from 'app/entities/enumerations/message-status.model';
import { Priority } from 'app/entities/enumerations/priority.model';
import { AlertError } from 'app/shared/alert/alert-error';
import { AlertErrorModel } from 'app/shared/alert/alert-error.model';
import { TranslateDirective } from 'app/shared/language';
import { IMessage } from '../message.model';
import { MessageService } from '../service/message.service';

import { MessageFormGroup, MessageFormService } from './message-form.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-message-update',
  templateUrl: './message-update.html',
  imports: [TranslateDirective, TranslatePipe, FontAwesomeModule, AlertError, ReactiveFormsModule],
})
export class MessageUpdate implements OnInit {
  readonly isSaving = signal(false);
  message: IMessage | null = null;
  messageChannelValues = Object.keys(MessageChannel);
  messageStatusValues = Object.keys(MessageStatus);
  priorityValues = Object.keys(Priority);

  protected dataUtils = inject(DataUtils);
  protected eventManager = inject(EventManager);
  protected messageService = inject(MessageService);
  protected messageFormService = inject(MessageFormService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: MessageFormGroup = this.messageFormService.createMessageFormGroup();

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ message }) => {
      this.message = message;
      if (message) {
        this.updateForm(message);
      }
    });
  }

  byteSize(base64String: string): string {
    return this.dataUtils.byteSize(base64String);
  }

  openFile(base64String: string, contentType: string | null | undefined): void {
    this.dataUtils.openFile(base64String, contentType);
  }

  setFileData(event: Event, field: string, isImage: boolean): void {
    this.dataUtils.loadFileToForm(event, this.editForm, field, isImage).subscribe({
      error: (err: FileLoadError) =>
        this.eventManager.broadcast(new EventWithContent<AlertErrorModel>('hcAdminApp.error', { ...err, key: `error.file.${err.key}` })),
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const message = this.messageFormService.getMessage(this.editForm);
    if (message.id === null) {
      this.subscribeToSaveResponse(this.messageService.create(message));
    } else {
      this.subscribeToSaveResponse(this.messageService.update(message));
    }
  }

  protected subscribeToSaveResponse(result: Observable<IMessage | null>): void {
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

  protected updateForm(message: IMessage): void {
    this.message = message;
    this.messageFormService.resetForm(this.editForm, message);
  }
}
