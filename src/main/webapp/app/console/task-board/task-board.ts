import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap/modal';
import { TranslatePipe } from '@ngx-translate/core';

import { TOTAL_COUNT_RESPONSE_HEADER } from 'app/config/pagination.constants';
import { ITask } from 'app/entities/operations/task/task.model';
import { TaskService } from 'app/entities/operations/task/service/task.service';
import { FormatMediumDatePipe } from 'app/shared/date';
import { TranslateDirective } from 'app/shared/language';
import HasAnyAuthorityDirective from 'app/shared/auth/has-any-authority.directive';
import { ConsoleAuthority } from 'app/shared/auth/console-role';
import { ShellCountersService } from 'app/layouts/shell-counters.service';

import { ProfessionalNamesService } from '../shared/professional-names.service';
import { TaskDialog } from './task-dialog';

export type TaskState = 'TODO' | 'DOING' | 'DONE';

export const TASK_COLUMNS: readonly TaskState[] = ['TODO', 'DOING', 'DONE'];

/** `Priority`, highest first, for the filter chips. */
export const TASK_PRIORITIES: readonly string[] = ['HIGH', 'NORMAL', 'LOW'];

/** Big enough to hold the whole board; see {@link TaskBoard.load} for what happens when it is not. */
const BOARD_PAGE_SIZE = 200;

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
  readonly priorities = TASK_PRIORITIES;
  readonly adminOnly = [ConsoleAuthority.ADMIN];

  readonly tasks = signal<ITask[]>([]);
  readonly search = signal('');
  readonly priority = signal<string | null>(null);
  readonly owner = signal<string | null>(null);
  /** True when the board holds fewer tasks than exist — see {@link load}. */
  readonly isTruncated = signal(false);

  private readonly taskService = inject(TaskService);
  private readonly counters = inject(ShellCountersService);
  private readonly modalService = inject(NgbModal);
  private readonly professionalNames = inject(ProfessionalNamesService);

  /**
   * Item 24: the board had a search box and no filter.
   *
   * <p>**Filtered in the browser, deliberately, and unlike every list in the console.** The board
   * already holds the whole collection — it loads once and moves cards between columns without a
   * round trip, which is the decision recorded on {@link load} — so a server-side filter would mean
   * refetching three columns to answer a question about rows already in memory, and re-opening the
   * "move a card and watch the other column go stale" problem that shape avoids.
   *
   * <p>Filtering is by **priority and owner**. Not by state: the columns *are* the state, and a
   * board filtered to TODO is a board with two empty columns.
   */
  private readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const priority = this.priority();
    const owner = this.owner();

    return this.tasks().filter(task => {
      if (priority && (task.priority ?? 'NORMAL') !== priority) {
        return false;
      }
      if (owner && (task.owner?.id ?? '') !== owner) {
        return false;
      }
      if (!term) {
        return true;
      }
      return [task.title, task.tag, this.ownerName(task)].some(value => (value ?? '').toLowerCase().includes(term));
    });
  });

  /** The owners actually holding a card, so the control offers no empty choices. */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly owners = computed(() => {
    const seen = new Map<string, string>();
    for (const task of this.tasks()) {
      const id = task.owner?.id;
      if (id && !seen.has(id)) {
        seen.set(id, this.ownerName(task));
      }
    }
    return [...seen].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  });

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly hasFilters = computed(() => this.priority() !== null || this.owner() !== null || this.search().length > 0);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly board = computed(() =>
    this.columns.map(state => ({
      state,
      items: this.filtered().filter(task => task.state === state),
    })),
  );

  ngOnInit(): void {
    this.professionalNames.load();
    this.load();
  }

  /**
   * One page big enough to be the whole board, which is what lets the filters above run in the
   * browser and a card change columns without a refetch.
   *
   * <p>It is still a page, and `X-Total-Count` is read so that stops being a silent claim. A board
   * showing 200 of 260 cards while its column counts read like totals is the truncation failure
   * `CLAUDE.md` describes for pagination; the note in the toolbar is small, but it is the
   * difference between a bounded view and a wrong one.
   */
  load(): void {
    this.taskService.query({ page: 0, size: BOARD_PAGE_SIZE, sort: ['dueOn,asc'] }).subscribe(response => {
      const tasks = response.body ?? [];
      const total = Number(response.headers.get(TOTAL_COUNT_RESPONSE_HEADER) ?? tasks.length);
      this.tasks.set(tasks);
      this.isTruncated.set(total > tasks.length);
    });
  }

  onSearch(value: string): void {
    this.search.set(value);
  }

  togglePriority(priority: string): void {
    this.priority.update(current => (current === priority ? null : priority));
  }

  isPriorityActive(priority: string): boolean {
    return this.priority() === priority;
  }

  onOwner(id: string): void {
    this.owner.set(id || null);
  }

  clearFilters(): void {
    this.priority.set(null);
    this.owner.set(null);
    this.search.set('');
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
   * The owner's real name. `Professional` has no name of its own — it lives
   * on the related `Profile` — so the relationship carries a licence number
   * and this resolves it to something a person can read.
   */
  ownerName(task: ITask): string {
    return this.professionalNames.nameFor(task.owner?.id, task.owner?.licenceNumber);
  }

  ownerInitials(task: ITask): string {
    return this.professionalNames.initialsFor(task.owner?.id, task.owner?.licenceNumber);
  }
}
