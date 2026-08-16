import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';

import dayjs from 'dayjs/esm';

import { AccountService } from 'app/core/auth/account.service';
import { NewMessage } from 'app/entities/operations/message/message.model';
import { MessageService } from 'app/entities/operations/message/service/message.service';
import { ShellCountersService } from 'app/layouts/shell-counters.service';
import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';

/** The channels an operator can send on. Inbound-only channels are not offered. */
const SENDABLE_CHANNELS = ['EMAIL', 'PATIENT_APP', 'PROFESSIONAL_APP', 'VENDOR_PORTAL'] as const;
const PRIORITIES = ['HIGH', 'NORMAL', 'LOW'] as const;

/**
 * Compose an outbound message.
 *
 * <p>The desk had no way to start one. Its "Send reply" flipped a status and threw the typed text
 * away, so nothing an operator wrote had ever been stored, let alone delivered.
 *
 * <p>Sending posts to `/api/messages/send`, which persists the message and then publishes a
 * `messageSentEvent` carrying metadata only. The recipient is told what arrived; opening the
 * notification fetches the message itself from the service that owns it.
 */
@Component({
  selector: 'abf-message-compose',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './message-compose.html',
  styleUrl: './message-compose.scss',
  imports: [FormsModule, RouterLink, FontAwesomeModule, TranslateDirective, TranslatePipe, AlertError],
})
export default class MessageCompose {
  readonly channels = SENDABLE_CHANNELS;
  readonly priorities = PRIORITIES;

  readonly to = signal('');
  readonly recipientName = signal('');
  readonly subject = signal('');
  readonly body = signal('');
  readonly channel = signal<(typeof SENDABLE_CHANNELS)[number]>('EMAIL');
  readonly priority = signal<(typeof PRIORITIES)[number]>('NORMAL');
  readonly isSending = signal(false);

  private readonly messageService = inject(MessageService);
  private readonly accountService = inject(AccountService);
  private readonly counters = inject(ShellCountersService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  constructor() {
    // Pre-addressed when arrived at from a record — the vendor record links here with the vendor's
    // email and name, so the operator does not retype what the console already knows.
    const params = this.route.snapshot.queryParamMap;
    this.to.set(params.get('to') ?? '');
    this.recipientName.set(params.get('name') ?? '');
    if (params.get('channel')) {
      this.channel.set(params.get('channel') as (typeof SENDABLE_CHANNELS)[number]);
    }
  }

  /** Everything the api will reject, checked here so the operator is told before they send. */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly canSend = computed(
    () => this.to().trim().length > 0 && this.subject().trim().length > 0 && this.body().trim().length > 0 && !this.isSending(),
  );

  send(): void {
    if (!this.canSend()) {
      return;
    }
    const account = this.accountService.account();
    const message: NewMessage = {
      id: null,
      sentAt: dayjs(),
      // The desk is the sender. Falling back to the login keeps a message attributable when the
      // account carries no email, rather than sending as an empty address.
      fromAddress: account?.email ?? account?.login ?? 'desk@abofonsa.care',
      senderName: [account?.firstName, account?.lastName].filter(Boolean).join(' ') || (account?.login ?? 'Admin desk'),
      toAddress: this.to().trim(),
      recipientName: this.recipientName().trim() || null,
      subject: this.subject().trim(),
      body: this.body().trim(),
      channel: this.channel(),
      priority: this.priority(),
      // An outbound message is not waiting for the desk to read it.
      status: 'REPLIED',
    };

    this.isSending.set(true);
    this.messageService.send(message).subscribe({
      next: sent => {
        this.counters.refresh();
        void this.router.navigate(['/message-desk', sent.id]);
      },
      // The alert interceptor surfaces the reason; staying on the form keeps the typed text, which
      // is the whole complaint about the reply this replaces.
      error: () => this.isSending.set(false),
    });
  }
}
