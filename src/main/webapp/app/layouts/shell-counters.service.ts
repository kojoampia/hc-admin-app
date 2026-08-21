import { Injectable, computed, effect, inject, signal } from '@angular/core';

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
 *
 * **The first read is driven by the account, not by a screen.** Until 2026-08-21
 * every caller of `refresh()` was an action on the message desk or the task
 * board, so a session that never opened those two screens showed both badges at
 * their initial `0` — the number the shell exists to surface, absent, looking
 * exactly like "nothing to do". Signing in now refreshes them and signing out
 * zeroes them, which is a property of this service rather than a call somebody
 * has to remember to add to the next shell component.
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

  constructor() {
    // Reads the account signal, so it re-runs on every transition: sign-in
    // fetches the two counts, sign-out clears them rather than leaving the
    // previous user's numbers on the chrome.
    effect(() => {
      if (this.accountService.account()) {
        this.refresh();
      } else {
        this.unread.set(0);
        this.open.set(0);
      }
    });
  }

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
