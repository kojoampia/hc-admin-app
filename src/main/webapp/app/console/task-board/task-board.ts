import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap/modal';
import { TranslatePipe } from '@ngx-translate/core';
import { map } from 'rxjs';

import { ITask } from 'app/entities/operations/task/task.model';
import { TaskService } from 'app/entities/operations/task/service/task.service';
import { FormatMediumDatePipe } from 'app/shared/date';
import { TranslateDirective } from 'app/shared/language';
import HasAnyAuthorityDirective from 'app/shared/auth/has-any-authority.directive';
import { ConsoleAuthority } from 'app/shared/auth/console-role';
import { ShellCountersService } from 'app/layouts/shell-counters.service';

import { TaskDialog } from './task-dialog';

export type TaskState = 'TODO' | 'DOING' | 'DONE';

export const TASK_COLUMNS: readonly TaskState[] = ['TODO', 'DOING', 'DONE'];

/**
 * The board: three columns from `TaskState`.
 *
 * Cards open a dialog with a segmented control to move state. The board loads
 * the whole (small) task collection once rather than three filtered queries,
 * because moving a card between columns would otherwise need two round trips
 * to keep both columns right.
 */
@Component({
  selector: 'abf-task-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './task-board.html',
  styleUrl: './task-board.scss',
  imports: [FormsModule, FontAwesomeModule, TranslateDirective, TranslatePipe, FormatMediumDatePipe, HasAnyAuthorityDirective],
})
export default class TaskBoard implements OnInit {
  readonly columns = TASK_COLUMNS;
  readonly adminOnly = [ConsoleAuthority.ADMIN];

  readonly tasks = signal<ITask[]>([]);
  readonly search = signal('');

  private readonly taskService = inject(TaskService);
  private readonly counters = inject(ShellCountersService);
  private readonly modalService = inject(NgbModal);

  private readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) {
      return this.tasks();
    }
    return this.tasks().filter(task =>
      [task.title, task.tag, task.owner?.licenceNumber].some(value => (value ?? '').toLowerCase().includes(term)),
    );
  });

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly board = computed(() =>
    this.columns.map(state => ({
      state,
      items: this.filtered().filter(task => task.state === state),
    })),
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.taskService
      .query({ page: 0, size: 200, sort: ['dueOn,asc'] })
      .pipe(map(response => response.body ?? []))
      .subscribe(tasks => this.tasks.set(tasks));
  }

  onSearch(value: string): void {
    this.search.set(value);
  }

  openTask(task: ITask): void {
    const modalRef = this.modalService.open(TaskDialog, { size: 'lg', backdrop: 'static' });
    modalRef.componentInstance.task = task;
    modalRef.closed.subscribe(() => {
      this.load();
      this.counters.refresh();
    });
  }

  newTask(): void {
    const modalRef = this.modalService.open(TaskDialog, { size: 'lg', backdrop: 'static' });
    modalRef.componentInstance.task = null;
    modalRef.closed.subscribe(() => {
      this.load();
      this.counters.refresh();
    });
  }

  countFor(state: TaskState): number {
    return this.filtered().filter(task => task.state === state).length;
  }

  /**
   * The owner monogram. `Professional` has no name of its own — the name
   * lives on its `Profile`, which the list projection does not carry — so
   * this falls back to the licence number's initials, which is what the
   * relationship actually exposes here.
   */
  ownerInitials(task: ITask): string {
    const licence = task.owner?.licenceNumber ?? '';
    return (
      licence
        .replace(/[^A-Za-z]/g, '')
        .slice(0, 2)
        .toUpperCase() || '··'
    );
  }
}
