import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import dayjs from 'dayjs/esm';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';

import { FormatMediumDatePipe } from 'app/shared/date';
import { TranslateDirective } from 'app/shared/language';
import HasAnyAuthorityDirective from 'app/shared/auth/has-any-authority.directive';
import { ConsoleAuthority } from 'app/shared/auth/console-role';

import { DeletionRequest, DeletionRequestService, DeletionRequestStatus } from './deletion-request.service';

/** The tabs, in the order an administrator works through them. */
export const QUEUES: readonly DeletionRequestStatus[] = ['PENDING', 'COMPLETED', 'REJECTED', 'CANCELLED'];

/** Inside this many days of the promised date, a row is late enough to say so. */
const DUE_SOON_DAYS = 3;

/**
 * Patients who have asked to be forgotten.
 *
 * <h2>This is the only screen in the console that destroys data</h2>
 *
 * <p>Everything else here edits, archives or files. {@link complete} erases a patient's record
 * across sixteen collections and every report file behind it, and there is no undo anywhere in the
 * platform. Three things follow from that, and all three are deliberate:</p>
 *
 * <ul>
 *   <li>The action is <strong>{@link ConsoleAuthority.ADMIN} only</strong>, via
 *   `*abfHasAnyAuthority`. A supervisor sees the queue and cannot act on it — the console's usual
 *   read-for-everyone, write-for-some shape, applied where it matters most.</li>
 *   <li>It requires typing the patient id to confirm. Not a modal with a red button: the id has to
 *   be read off the row being acted on, which is the one check that cannot be satisfied by
 *   clicking through.</li>
 *   <li>Refusing requires a reason, enforced by the server as well as here.</li>
 * </ul>
 *
 * <h2>The clock is the point of the queue</h2>
 *
 * <p>Every pending row carries the date the erasure is owed by — fourteen days from the request,
 * as the published privacy policy promises. {@link isOverdue} and {@link isDueSoon} are what turn
 * this from a list into a queue, because a promise nobody is counting down is one that gets kept
 * late.</p>
 */
@Component({
  selector: 'abf-deletion-requests',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './deletion-requests.html',
  styleUrl: './deletion-requests.scss',
  imports: [FormsModule, FontAwesomeModule, TranslateDirective, TranslatePipe, FormatMediumDatePipe, HasAnyAuthorityDirective],
})
export default class DeletionRequests implements OnInit {
  readonly queues = QUEUES;
  readonly adminOnly = [ConsoleAuthority.ADMIN];

  readonly rows = signal<DeletionRequest[]>([]);
  readonly queue = signal<DeletionRequestStatus>('PENDING');
  readonly loading = signal(false);
  readonly loadFailed = signal(false);

  /** The row an administrator has opened the confirm panel on, by id. */
  readonly acting = signal<string | null>(null);
  readonly confirmId = signal('');
  readonly rejectReason = signal('');
  readonly busy = signal(false);
  readonly actionError = signal<string | null>(null);

  /**
   * How many are past their promised date — the number worth seeing without reading the table.
   *
   * <p>Declared above the injected field, which `@typescript-eslint/member-ordering` requires here.
   * Safe because `computed()` is lazy: nothing reads {@link deletionRequests} during field
   * initialisation.</p>
   */
  readonly overdueCount = computed(() => this.rows().filter(row => this.isOverdue(row)).length);

  private readonly deletionRequests = inject(DeletionRequestService);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadFailed.set(false);
    this.acting.set(null);

    this.deletionRequests.query(this.queue()).subscribe({
      next: response => {
        this.rows.set(response.body ?? []);
        this.loading.set(false);
      },
      error: () => {
        // Most likely cause by a wide margin: the admin gateway has no /services/hcpatientservice
        // route, so this 404s at our own gateway. The message says so rather than blaming the
        // patient service, because that is the first thing to check.
        this.loadFailed.set(true);
        this.rows.set([]);
        this.loading.set(false);
      },
    });
  }

  selectQueue(status: DeletionRequestStatus): void {
    this.queue.set(status);
    this.load();
  }

  /** Opens the confirm panel on one row, and closes any other. */
  startAction(row: DeletionRequest): void {
    this.actionError.set(null);
    this.confirmId.set('');
    this.rejectReason.set('');
    this.acting.set(this.acting() === row.id ? null : row.id);
  }

  abandon(): void {
    this.acting.set(null);
  }

  /**
   * Whether the typed id matches the row being acted on.
   *
   * <p>Trimmed but case-sensitive: a patient id is machine-generated, so there is no keyboard to
   * blame, and a check that accepts a near-miss is not a check.</p>
   */
  confirmMatches(row: DeletionRequest): boolean {
    return this.confirmId().trim() === row.patientId;
  }

  /** Erases the record. Irreversible. */
  complete(row: DeletionRequest): void {
    if (this.busy() || !this.confirmMatches(row)) {
      return;
    }
    this.busy.set(true);
    this.actionError.set(null);

    this.deletionRequests.complete(row.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.load();
      },
      error: () => {
        this.actionError.set('deletionRequests.error.complete');
        this.busy.set(false);
      },
    });
  }

  reject(row: DeletionRequest): void {
    const reason = this.rejectReason().trim();
    if (this.busy() || !reason) {
      return;
    }
    this.busy.set(true);
    this.actionError.set(null);

    this.deletionRequests.reject(row.id, reason).subscribe({
      next: () => {
        this.busy.set(false);
        this.load();
      },
      error: () => {
        this.actionError.set('deletionRequests.error.reject');
        this.busy.set(false);
      },
    });
  }

  /** Past the date the patient was promised. */
  isOverdue(row: DeletionRequest): boolean {
    return row.status === 'PENDING' && this.daysUntilDue(row) < 0;
  }

  /** Close enough to the promised date to need doing this week. */
  isDueSoon(row: DeletionRequest): boolean {
    const days = this.daysUntilDue(row);
    return row.status === 'PENDING' && days >= 0 && days <= DUE_SOON_DAYS;
  }

  daysUntilDue(row: DeletionRequest): number {
    const due = new Date(row.dueAt).getTime();
    return Math.floor((due - Date.now()) / (24 * 60 * 60 * 1000));
  }

  /**
   * An ISO instant as a `Dayjs`, for `formatMediumDate`.
   *
   * <p>The wire carries strings and this interface says so; the console's date pipes take `Dayjs`.
   * Converting here rather than widening the pipe keeps the one shared date format shared — the
   * console renders every date through those pipes precisely so a new screen cannot invent its own.</p>
   */
  day(iso: string): dayjs.Dayjs {
    return dayjs(iso);
  }

  /** `{"allergy": 3, "report": 12}` as `allergy 3 · report 12`, zero counts dropped. */
  erasedSummary(row: DeletionRequest): string {
    const counts = row.erasedCounts;
    if (!counts) {
      return '';
    }
    return Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([collection, count]) => `${collection} ${count}`)
      .join(' · ');
  }
}
