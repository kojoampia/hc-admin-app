import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap/modal';
import { TranslatePipe } from '@ngx-translate/core';

import { ITask, NewTask } from 'app/entities/operations/task/task.model';
import { TaskService } from 'app/entities/operations/task/service/task.service';
import { FormatMediumDatePipe } from 'app/shared/date';
import { TranslateDirective } from 'app/shared/language';

import HasAnyAuthorityDirective from 'app/shared/auth/has-any-authority.directive';
import { ConsoleAuthority } from 'app/shared/auth/console-role';

import { ProfessionalNamesService } from '../shared/professional-names.service';
import { StatusPill } from '../shared/status-pill/status-pill';
import { TASK_COLUMNS, TaskState } from './task-board';

/**
 * Open a card, or create one.
 *
 * With a task it shows the detail and a segmented control to move state; with
 * `null` it is the new-task form. Title is required — the board will not take
 * a card nobody can identify.
 */
@Component({
  selector: 'abf-task-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './task-dialog.html',
  styleUrl: './task-dialog.scss',
  imports: [FormsModule, FontAwesomeModule, TranslateDirective, TranslatePipe, FormatMediumDatePipe, HasAnyAuthorityDirective, StatusPill],
})
export class TaskDialog {
  /** Set by the opener. `null` means "create". */
  task: ITask | null = null;

  readonly adminOnly = [ConsoleAuthority.ADMIN];
  readonly columns = TASK_COLUMNS;
  readonly priorities = ['HIGH', 'NORMAL', 'LOW'];

  readonly title = signal('');
  readonly tag = signal('');
  readonly priority = signal<'HIGH' | 'NORMAL' | 'LOW'>('NORMAL');
  readonly submitted = signal(false);
  readonly isSaving = signal(false);

  protected readonly activeModal = inject(NgbActiveModal);
  private readonly taskService = inject(TaskService);
  private readonly professionalNames = inject(ProfessionalNamesService);

  /** The owner's real name, resolved through Profile. */
  ownerName(): string {
    return this.professionalNames.nameFor(this.task?.owner?.id, this.task?.owner?.licenceNumber);
  }

  get isNew(): boolean {
    return this.task === null;
  }

  get titleIsInvalid(): boolean {
    return this.submitted() && this.title().trim().length === 0;
  }

  move(state: TaskState): void {
    const current = this.task;
    if (!current || current.state === state) {
      return;
    }
    this.isSaving.set(true);
    this.taskService.partialUpdate({ id: current.id, state }).subscribe({
      next: updated => {
        this.task = updated;
        this.isSaving.set(false);
        this.activeModal.close('moved');
      },
      error: () => this.isSaving.set(false),
    });
  }

  save(): void {
    this.submitted.set(true);
    if (this.title().trim().length === 0) {
      return;
    }

    const task: NewTask = {
      id: null,
      title: this.title().trim(),
      state: 'TODO',
      priority: this.priority(),
      dueOn: null,
      tag: this.tag().trim() || null,
      createdAt: null,
      owner: null,
      sourceMessage: null,
    };

    this.isSaving.set(true);
    this.taskService.create(task).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.activeModal.close('created');
      },
      error: () => this.isSaving.set(false),
    });
  }

  cancel(): void {
    this.activeModal.dismiss('cancelled');
  }
}
