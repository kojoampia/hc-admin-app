import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';

import { IMessage } from 'app/entities/operations/message/message.model';
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
  readonly notFound = signal(false);

  private readonly messageService = inject(MessageService);
  private readonly taskService = inject(TaskService);
  private readonly counters = inject(ShellCountersService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.messageService.find(Number(this.id())).subscribe({
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

  /** Reply flips the thread to REPLIED. An empty reply is not a reply. */
  send(): void {
    if (!this.reply().trim()) {
      return;
    }
    this.setStatus('REPLIED', true);
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
