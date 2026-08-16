import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';

import { IMessage } from 'app/entities/operations/message/message.model';
import dayjs from 'dayjs/esm';

import { AccountService } from 'app/core/auth/account.service';
import { MessageService } from 'app/entities/operations/message/service/message.service';
import { NewTask } from 'app/entities/operations/task/task.model';
import { TaskService } from 'app/entities/operations/task/service/task.service';
import { FormatMediumDatetimePipe } from 'app/shared/date';
import { TranslateDirective } from 'app/shared/language';
import HasAnyAuthorityDirective from 'app/shared/auth/has-any-authority.directive';
import { ConsoleAuthority } from 'app/shared/auth/console-role';
import { ShellCountersService } from 'app/layouts/shell-counters.service';

import { StatusPill } from '../shared/status-pill/status-pill';

/**
 * A single thread.
 *
 * Opening an unread message marks it read — the prototype does this on render
 * and so does this, but as a real PATCH so the desk's counts and the sidebar
 * badge move with it.
 */
@Component({
  selector: 'abf-message-thread',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './message-thread.html',
  styleUrl: './message-thread.scss',
  imports: [
    RouterLink,
    FormsModule,
    FontAwesomeModule,
    TranslateDirective,
    TranslatePipe,
    FormatMediumDatetimePipe,
    HasAnyAuthorityDirective,
    StatusPill,
  ],
})
export default class MessageThread implements OnInit {
  /** Bound from the route by withComponentInputBinding(). */
  readonly id = input.required<string>();

  readonly adminOnly = [ConsoleAuthority.ADMIN];

  readonly message = signal<IMessage | null>(null);
  readonly reply = signal('');
  readonly isSending = signal(false);
  readonly notFound = signal(false);

  private readonly messageService = inject(MessageService);
  private readonly accountService = inject(AccountService);
  private readonly taskService = inject(TaskService);
  private readonly counters = inject(ShellCountersService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.messageService.find(this.id()).subscribe({
      next: message => {
        this.message.set(message);
        if (message.status === 'NEW') {
          this.setStatus('READ', false);
        }
      },
      error: () => this.notFound.set(true),
    });
  }

  /** The body, split into paragraphs the way the prototype renders it. */
  paragraphs(): string[] {
    return (this.message()?.body ?? '').split('\n').filter(line => line.trim().length > 0);
  }

  initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .map(part => part.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  /**
   * Escalate raises the thread's priority to HIGH.
   *
   * The prototype shows a toast reading "Escalated to the supervisor queue"
   * and changes nothing. A toast with no state change behind it is a lie the
   * next page load exposes, so this writes the priority the escalation
   * actually means.
   */
  escalate(): void {
    const current = this.message();
    if (!current || current.priority === 'HIGH') {
      return;
    }
    this.messageService.partialUpdate({ id: current.id, priority: 'HIGH' }).subscribe(updated => this.message.set(updated));
  }

  /**
   * Send the reply, then mark the thread replied.
   *
   * <p>This used to do only the second half. It flipped the status, navigated away, and discarded
   * the typed text — nothing an operator wrote was ever stored, let alone delivered, and the desk
   * showed a conversation that had only ever been one-sided. The button said "Send reply" the whole
   * time, which is what kept it hidden.
   *
   * <p>A reply is its own message with a parent, not an edit of the one it answers: it has its own
   * body, its own time and its own author. It goes to whoever wrote in, and it goes back on the
   * channel they used, because a patient who wrote from the patient app does not read email.
   */
  send(): void {
    const current = this.message();
    const body = this.reply().trim();
    if (!current || !body || this.isSending()) {
      return;
    }
    const account = this.accountService.account();
    this.isSending.set(true);
    this.messageService
      .send({
        id: null,
        sentAt: dayjs(),
        fromAddress: account?.email ?? account?.login ?? 'desk@abofonsa.care',
        senderName: [account?.firstName, account?.lastName].filter(Boolean).join(' ') || (account?.login ?? 'Admin desk'),
        toAddress: current.fromAddress ?? null,
        recipientName: current.senderName ?? null,
        subject: current.subject?.startsWith('Re: ') ? current.subject : `Re: ${current.subject ?? ''}`.trim(),
        body,
        channel: current.channel ?? 'EMAIL',
        priority: current.priority ?? 'NORMAL',
        status: 'REPLIED',
        parentId: current.id,
      })
      .subscribe({
        next: () => {
          this.isSending.set(false);
          // Only now is the thread genuinely replied to. Flipping it first would leave a thread
          // marked answered by a reply that failed to save.
          this.setStatus('REPLIED', true);
        },
        error: () => this.isSending.set(false),
      });
  }

  setStatus(status: 'NEW' | 'READ' | 'REPLIED', leave: boolean): void {
    const current = this.message();
    if (!current) {
      return;
    }
    this.messageService.partialUpdate({ id: current.id, status }).subscribe(updated => {
      this.message.set(updated);
      this.counters.refresh();
      if (leave) {
        void this.router.navigate(['/message-desk']);
      }
    });
  }

  /**
   * Raise a task from this message: creates a Task with `sourceMessage` set
   * and routes to the board. The link is a real relationship on the entity,
   * not a note in the title.
   */
  raiseTask(): void {
    const current = this.message();
    if (!current) {
      return;
    }

    const task: NewTask = {
      id: null,
      title: `Follow up: ${current.subject ?? ''}`,
      state: 'TODO',
      // A low-priority message still deserves a normal-priority follow-up;
      // this mirrors the prototype's raiseTaskFrom().
      priority: current.priority === 'LOW' ? 'NORMAL' : (current.priority ?? 'NORMAL'),
      dueOn: null,
      tag: 'Desk',
      createdAt: null,
      owner: null,
      sourceMessage: { id: current.id, subject: current.subject },
    };

    this.taskService.create(task).subscribe(() => {
      this.counters.refresh();
      void this.router.navigate(['/task-board']);
    });
  }
}
