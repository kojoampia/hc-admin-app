import { DecimalPipe } from '@angular/common';
import { HttpHeaders } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Data, ParamMap, Router, RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbPagination } from '@ng-bootstrap/ng-bootstrap/pagination';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription, combineLatest, tap } from 'rxjs';

import { StatusPill } from 'app/console/shared/status-pill/status-pill';
import { DEFAULT_SORT_DATA, SORT } from 'app/config/navigation.constants';
import { ITEMS_PER_PAGE, PAGE_HEADER, TOTAL_COUNT_RESPONSE_HEADER } from 'app/config/pagination.constants';
import { AccountStatus } from 'app/entities/enumerations/account-status.model';
import { Alert } from 'app/shared/alert/alert';
import { AlertError } from 'app/shared/alert/alert-error';
import { FormatMediumDatePipe } from 'app/shared/date';
import { TranslateDirective } from 'app/shared/language';
import { ItemCount } from 'app/shared/pagination';
import { SortByDirective, SortDirective, SortService, type SortState, sortStateSignal } from 'app/shared/sort';
import { IVendor, IVendorSummary } from '../vendor.model';
import { VendorService } from '../service/vendor.service';

/** Query param that puts the archived half of the directory on screen. */
const ARCHIVED_PARAM = 'archived';

/** Query param carrying the selected status tile, so a filtered directory is a shareable URL. */
const STATUS_PARAM = 'status';

/**
 * The vendor directory.
 *
 * Four tiles over a table of suppliers. Two of the tiles are counts this screen could compute for
 * itself and two are not: `spendToDate` is a sum and `categoryCount` a distinct count over the
 * whole collection, and no page of rows can produce either. All four come from
 * `GET /api/vendors/summary` so the row arrives together rather than in four instalments.
 *
 * The status tiles filter as well as count, and the filter goes to the server as `status.equals`.
 * Filtering the current page in the browser would silently search 20 rows and report the result as
 * though it had searched the directory.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-vendor',
  templateUrl: './vendor.html',
  styleUrl: './vendor.scss',
  imports: [
    RouterLink,
    FormsModule,
    FontAwesomeModule,
    AlertError,
    Alert,
    SortDirective,
    SortByDirective,
    TranslateDirective,
    TranslatePipe,
    FormatMediumDatePipe,
    NgbPagination,
    ItemCount,
    StatusPill,
    DecimalPipe,
  ],
})
export class Vendor implements OnInit {
  /**
   * Every status, not the four the demo draws.
   *
   * The demo's tile row covers Active and Review-or-pending only, which leaves a suspended or
   * on-leave vendor reachable through no tile at all and counted in nothing. Listing the enum means
   * the tiles account for every record in the directory.
   */
  readonly STATUSES = Object.keys(AccountStatus) as (keyof typeof AccountStatus)[];

  subscription: Subscription | null = null;
  readonly vendors = signal<IVendor[]>([]);

  sortState = sortStateSignal({});

  readonly itemsPerPage = signal(ITEMS_PER_PAGE);
  readonly totalItems = signal(0);
  readonly page = signal(1);
  /** Which half of the directory is on screen. Mirrored in the `archived` query param. */
  readonly showArchived = signal(false);
  /** The selected status tile, or null for the whole directory. Mirrored in `status`. */
  readonly status = signal<keyof typeof AccountStatus | null>(null);

  /** Per-status row counts for the tiles, read from `X-Total-Count`. */
  readonly counts = signal<Record<string, number>>({});
  /** The two figures no page can produce, plus the totals row. Null until it lands. */
  readonly summary = signal<IVendorSummary | null>(null);

  readonly router = inject(Router);
  protected readonly vendorService = inject(VendorService);
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly isLoading = this.vendorService.vendorsResource.isLoading;
  protected readonly activatedRoute = inject(ActivatedRoute);
  protected readonly sortService = inject(SortService);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly hasFilter = computed(() => this.status() !== null);

  constructor() {
    effect(() => {
      const headers = this.vendorService.vendorsResource.headers();
      if (headers) {
        this.fillComponentAttributesFromResponseHeader(headers);
      }
    });
    effect(() => {
      this.vendors.set(this.fillComponentAttributesFromResponseBody([...this.vendorService.vendors()]));
    });
  }

  trackId = (item: IVendor): string => this.vendorService.getVendorIdentifier(item);

  ngOnInit(): void {
    this.subscription = combineLatest([this.activatedRoute.queryParamMap, this.activatedRoute.data])
      .pipe(
        tap(([params, data]) => this.fillComponentAttributeFromRoute(params, data)),
        tap(() => this.load()),
      )
      .subscribe();
    this.loadTiles();
  }

  /**
   * The table only.
   *
   * Separate from {@link loadTiles} because this runs on every page turn and every sort, and the
   * tiles do not change when you turn a page — they describe the whole directory. Folding them in
   * would fire seven requests to move to page two and repaint the same six numbers.
   */
  load(): void {
    this.queryBackend();
  }

  /** The refresh button, which means both halves of the screen. */
  refresh(): void {
    this.load();
    this.loadTiles();
  }

  navigateToWithComponentValues(event: SortState): void {
    this.handleNavigation(this.page(), event);
  }

  navigateToPage(page: number): void {
    this.handleNavigation(page, this.sortState());
  }

  /** Selecting the tile already selected clears it, which is how the chip rows elsewhere behave. */
  toggleStatus(status: keyof typeof AccountStatus): void {
    void this.router.navigate(['./'], {
      relativeTo: this.activatedRoute,
      queryParams: { page: 1, status: this.status() === status ? null : status },
      queryParamsHandling: 'merge',
    });
  }

  clearFilter(): void {
    void this.router.navigate(['./'], {
      relativeTo: this.activatedRoute,
      queryParams: { page: 1, status: null },
      queryParamsHandling: 'merge',
    });
  }

  toggleArchived(): void {
    void this.router.navigate(['./'], {
      relativeTo: this.activatedRoute,
      queryParams: { page: 1, archived: this.showArchived() ? null : true },
      queryParamsHandling: 'merge',
    });
  }

  protected fillComponentAttributeFromRoute(params: ParamMap, data: Data): void {
    this.showArchived.set(params.get(ARCHIVED_PARAM) === 'true');
    const status = params.get(STATUS_PARAM);
    // Guarded against the enum rather than cast: a hand-edited URL would otherwise send an unknown
    // value the api answers with 400, and the screen would look broken rather than unfiltered.
    this.status.set(status && status in AccountStatus ? (status as keyof typeof AccountStatus) : null);
    const page = params.get(PAGE_HEADER);
    this.page.set(+(page ?? 1));
    this.sortState.set(this.sortService.parseSortParam(params.get(SORT) ?? data[DEFAULT_SORT_DATA]));
  }

  protected fillComponentAttributesFromResponseBody(data: IVendor[]): IVendor[] {
    return data;
  }

  protected fillComponentAttributesFromResponseHeader(headers: HttpHeaders): void {
    this.totalItems.set(Number(headers.get(TOTAL_COUNT_RESPONSE_HEADER)));
  }

  protected queryBackend(): void {
    const pageToLoad: number = this.page();
    const queryObject: any = {
      page: pageToLoad - 1,
      size: this.itemsPerPage(),
      sort: this.sortService.buildSortParam(this.sortState()),
      // notEquals rather than equals=false: a record saved before isArchived
      // existed has no value at all, and equals=false would not match it, so
      // the whole directory would read as empty.
      [this.showArchived() ? 'isArchived.equals' : 'isArchived.notEquals']: true,
    };
    const status = this.status();
    if (status) {
      queryObject['status.equals'] = status;
    }
    this.vendorService.vendorsParams.set(queryObject);
  }

  protected handleNavigation(page: number, sortState: SortState): void {
    const queryParamsObj = {
      page,
      size: this.itemsPerPage(),
      sort: this.sortService.buildSortParam(sortState),
      archived: this.showArchived() ? true : null,
      status: this.status(),
    };

    void this.router.navigate(['./'], {
      relativeTo: this.activatedRoute,
      queryParams: queryParamsObj,
    });
  }

  /**
   * The tiles, which are counts and totals rather than a page of rows.
   *
   * The per-status counts come from `X-Total-Count` on a `size=1` query — the message desk's
   * pattern — and always describe the unarchived directory, so they do not move when the archived
   * half is on screen. The summary carries the two figures a page cannot produce.
   */
  private loadTiles(): void {
    this.vendorService.summary().subscribe({
      next: summary => this.summary.set(summary),
      // The table is intact and the error interceptor raises the alert. Leaving the tiles null
      // renders them as "—", which is not the same claim as a zero.
      error: () => this.summary.set(null),
    });

    for (const status of this.STATUSES) {
      this.vendorService.query({ page: 0, size: 1, 'status.equals': status, 'isArchived.notEquals': true }).subscribe({
        next: response =>
          this.counts.update(current => ({
            ...current,
            [status]: Number(response.headers.get(TOTAL_COUNT_RESPONSE_HEADER) ?? 0),
          })),
        error: () =>
          this.counts.update(current => {
            const { [status]: _removed, ...rest } = current;
            return rest;
          }),
      });
    }
  }
}
