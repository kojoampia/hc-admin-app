import { Injectable, computed, inject, signal } from '@angular/core';

import { forkJoin, map } from 'rxjs';

import { AccountService } from 'app/core/auth/account.service';
import { TOTAL_COUNT_RESPONSE_HEADER } from 'app/config/pagination.constants';
import { MessageService } from 'app/entities/operations/message/service/message.service';
import { TaskService } from 'app/entities/operations/task/service/task.service';

/**
 * The two live numbers the shell shows as badges: unread messages and open
 * tasks.
 *
 * Both are read through the generated entity services with a filtered,
 * one-row query — the answer is the `X-Total-Count` header, not the body, so
 * this never pulls a collection down to count it. Screens that change either
 * number call `refresh()`; there is no polling.
 */
@Injectable({ providedIn: 'root' })
export class ShellCountersService {
  private readonly messageService = inject(MessageService);
  private readonly taskService = inject(TaskService);
  private readonly accountService = inject(AccountService);

  private readonly unread = signal(0);
  private readonly open = signal(0);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly unreadMessages = this.unread.asReadonly();
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly openTasks = this.open.asReadonly();

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly counters = computed<Record<string, number>>(() => ({
    unreadMessages: this.unread(),
    openTasks: this.open(),
  }));

  refresh(): void {
    if (!this.accountService.isAuthenticated()) {
      this.unread.set(0);
      this.open.set(0);
      return;
    }

    // size 1 keeps each body to a single row; the number comes off the header.
    forkJoin({
      unread: this.messageService
        .query({ page: 0, size: 1, 'status.equals': 'NEW' })
        .pipe(map(response => Number(response.headers.get(TOTAL_COUNT_RESPONSE_HEADER) ?? 0))),
      open: this.taskService
        .query({ page: 0, size: 1, 'state.in': ['TODO', 'DOING'] })
        .pipe(map(response => Number(response.headers.get(TOTAL_COUNT_RESPONSE_HEADER) ?? 0))),
    }).subscribe({
      next: ({ unread, open }) => {
        this.unread.set(unread);
        this.open.set(open);
      },
      // A failed count must not take the shell down with it; the badge just
      // stays at its last value.
      error: () => undefined,
    });
  }
}
