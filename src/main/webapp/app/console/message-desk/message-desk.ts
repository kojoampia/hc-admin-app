import { HttpResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbPagination } from '@ng-bootstrap/ng-bootstrap/pagination';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable, Subject, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs';

import { ITEMS_PER_PAGE, TOTAL_COUNT_RESPONSE_HEADER } from 'app/config/pagination.constants';
import { IMessage } from 'app/entities/operations/message/message.model';
import { MessageService } from 'app/entities/operations/message/service/message.service';
import { FormatMediumDatePipe } from 'app/shared/date';
import { TranslateDirective } from 'app/shared/language';
import HasAnyAuthorityDirective from 'app/shared/auth/has-any-authority.directive';
import { ConsoleAuthority } from 'app/shared/auth/console-role';

import { ShellCountersService } from 'app/layouts/shell-counters.service';
import { StatusPill } from '../shared/status-pill/status-pill';

type FilterKind = 'status' | 'priority';

interface FilterChip {
  readonly kind: FilterKind;
  readonly value: string;
}

/**
 * The message desk: one queue across the patient app, professional app and
 * vendor portal.
 *
 * Search is debounced 300ms and, like the status and priority filters, is
 * sent to the server as a filter parameter rather than applied to a page of
 * rows in the browser — filtering a slice would silently search only the
 * current page.
 */
@Component({
  selector: 'abf-message-desk',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './message-desk.html',
  styleUrl: './message-desk.scss',
  imports: [
    RouterLink,
    FormsModule,
    FontAwesomeModule,
    NgbPagination,
    TranslateDirective,
    TranslatePipe,
    FormatMediumDatePipe,
    HasAnyAuthorityDirective,
    StatusPill,
  ],
})
export default class MessageDesk implements OnInit {
  readonly STATUSES = ['NEW', 'READ', 'REPLIED'];
  readonly PRIORITIES = ['HIGH', 'NORMAL', 'LOW'];
  readonly adminOnly = [ConsoleAuthority.ADMIN];

  readonly messages = signal<IMessage[]>([]);
  readonly totalItems = signal(0);
  readonly page = signal(1);
  readonly itemsPerPage = ITEMS_PER_PAGE;
  readonly isLoading = signal(false);

  readonly search = signal('');
  readonly chips = signal<FilterChip[]>([]);
  readonly counts = signal<Record<string, number>>({});

  private readonly messageService = inject(MessageService);
  private readonly counters = inject(ShellCountersService);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);

  private readonly searchInput = new Subject<string>();

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly hasFilters = computed(() => this.chips().length > 0 || this.search().length > 0);

  constructor() {
    this.searchInput
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap(value => {
          this.search.set(value);
          this.page.set(1);
        }),
        switchMap(() => this.queryMessages()),
      )
      .subscribe(response => this.applyResponse(response));
  }

  ngOnInit(): void {
    this.load();
    this.loadCounts();
  }

  onSearch(value: string): void {
    this.searchInput.next(value);
  }

  toggleChip(kind: FilterKind, value: string): void {
    const existing = this.chips();
    const present = existing.some(chip => chip.kind === kind && chip.value === value);
    // One value per dimension: picking NEW replaces READ rather than
    // producing a status filter that matches nothing.
    const withoutKind = existing.filter(chip => chip.kind !== kind);
    this.chips.set(present ? withoutKind : [...withoutKind, { kind, value }]);
    this.page.set(1);
    this.load();
  }

  isChipActive(kind: FilterKind, value: string): boolean {
    return this.chips().some(chip => chip.kind === kind && chip.value === value);
  }

  removeChip(chip: FilterChip): void {
    this.chips.set(this.chips().filter(existing => !(existing.kind === chip.kind && existing.value === chip.value)));
    this.page.set(1);
    this.load();
  }

  clearFilters(): void {
    this.chips.set([]);
    this.search.set('');
    this.page.set(1);
    this.load();
  }

  navigateToPage(page: number): void {
    this.page.set(page);
    this.load();
  }

  markAllRead(): void {
    const unread = this.messages().filter(message => message.status === 'NEW');
    if (unread.length === 0) {
      return;
    }
    // Each row is a real PATCH; the desk does not fake a bulk endpoint that
    // the entity contract does not have.
    let remaining = unread.length;
    for (const message of unread) {
      this.messageService.partialUpdate({ id: message.id, status: 'READ' }).subscribe({
        next: () => {
          if (--remaining === 0) {
            this.load();
            this.loadCounts();
            this.counters.refresh();
          }
        },
        error: () => {
          if (--remaining === 0) {
            this.load();
          }
        },
      });
    }
  }

  open(message: IMessage): void {
    void this.router.navigate([message.id], { relativeTo: this.activatedRoute });
  }

  load(): void {
    this.queryMessages().subscribe(response => this.applyResponse(response));
  }

  private queryMessages(): Observable<HttpResponse<IMessage[]>> {
    this.isLoading.set(true);
    const query: Record<string, unknown> = {
      page: this.page() - 1,
      size: this.itemsPerPage,
      sort: ['sentAt,desc'],
    };

    const term = this.search().trim();
    if (term) {
      query['subject.contains'] = term;
    }
    for (const chip of this.chips()) {
      query[chip.kind === 'status' ? 'status.equals' : 'priority.equals'] = chip.value;
    }

    return this.messageService.query(query);
  }

  private applyResponse(response: HttpResponse<IMessage[]>): void {
    this.messages.set(response.body ?? []);
    this.totalItems.set(Number(response.headers.get(TOTAL_COUNT_RESPONSE_HEADER) ?? 0));
    this.isLoading.set(false);
  }

  /** The three tiles above the table are counts, not a page of rows. */
  private loadCounts(): void {
    for (const status of this.STATUSES) {
      this.messageService.query({ page: 0, size: 1, 'status.equals': status }).subscribe(response => {
        this.counts.update(current => ({
          ...current,
          [status]: Number(response.headers.get(TOTAL_COUNT_RESPONSE_HEADER) ?? 0),
        }));
      });
    }
  }
}
