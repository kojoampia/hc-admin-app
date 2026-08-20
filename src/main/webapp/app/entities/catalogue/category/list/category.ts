import { DecimalPipe } from '@angular/common';
import { HttpHeaders } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Data, ParamMap, Router, RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap/modal';
import { NgbPagination } from '@ng-bootstrap/ng-bootstrap/pagination';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription, combineLatest, filter, tap } from 'rxjs';

import { DEFAULT_SORT_DATA, ITEM_DELETED_EVENT, SORT } from 'app/config/navigation.constants';
import { ITEMS_PER_PAGE, PAGE_HEADER, TOTAL_COUNT_RESPONSE_HEADER } from 'app/config/pagination.constants';
import { ServiceActivityService } from 'app/entities/catalogue/service-activity/service/service-activity.service';
import { IServiceActivity } from 'app/entities/catalogue/service-activity/service-activity.model';
import { Alert } from 'app/shared/alert/alert';
import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';
import { ItemCount } from 'app/shared/pagination';
import { SortByDirective, SortDirective, SortService, type SortState, sortStateSignal } from 'app/shared/sort';
import { ICategory, ICategoryActivityCount, ICategorySummary } from '../category.model';
import { CategoryDeleteDialog } from '../delete/category-delete-dialog';
import { CategoryService } from '../service/category.service';

/** Query param carrying the opened category, so a chosen card is a shareable URL. */
const OPEN_PARAM = 'open';

/**
 * Categories and activities.
 *
 * A card per category above the activities table for whichever card is open, replacing the
 * generated entity table — which listed `Id · Name · Description · Icon Key` and, more to the point,
 * **could not reach service activities at all**. Pricing and the live/withdrawn state had no home in
 * the console: `entities/catalogue/service-activity/` existed but nothing linked to it.
 *
 * Counts come from `GET /api/categories/summary` over the whole catalogue, and the activities table
 * filters server-side with `categoryId.equals`. Reading one page of activities and grouping in the
 * browser works only while the catalogue is smaller than a page — the failure `CLAUDE.md` documents
 * for pagination, which reports nothing when it starts happening.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-category',
  templateUrl: './category.html',
  styleUrl: './category.scss',
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
    NgbPagination,
    ItemCount,
    DecimalPipe,
  ],
})
export class Category implements OnInit {
  subscription: Subscription | null = null;
  readonly categories = signal<ICategory[]>([]);

  sortState = sortStateSignal({});

  readonly itemsPerPage = signal(ITEMS_PER_PAGE);
  readonly totalItems = signal(0);
  readonly page = signal(1);

  /** Activity counts per category. Null until the request answers, and null again on failure. */
  readonly summary = signal<ICategorySummary | null>(null);

  /** The opened category's id, mirrored in the `open` query param. Null closes the table. */
  readonly openCategoryId = signal<string | null>(null);

  /** The opened category's activities. Null while in flight, so the table can say so. */
  readonly activities = signal<IServiceActivity[] | null>(null);

  /** Ids currently being toggled, so a row's control can be disabled while its PATCH is in flight. */
  readonly saving = signal<Set<string>>(new Set());

  readonly router = inject(Router);
  protected readonly categoryService = inject(CategoryService);
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly isLoading = this.categoryService.categoriesResource.isLoading;
  protected readonly serviceActivityService = inject(ServiceActivityService);
  protected readonly activatedRoute = inject(ActivatedRoute);
  protected readonly sortService = inject(SortService);
  protected modalService = inject(NgbModal);

  /** Counts keyed by category, so a card reads its own numbers without scanning the array. */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly countsByCategory = computed<Record<string, ICategoryActivityCount>>(() => {
    const summary = this.summary();
    if (!summary) {
      return {};
    }
    return Object.fromEntries(summary.categories.map(entry => [entry.categoryId, entry]));
  });

  /** The opened category itself, for the activities table's heading. */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly openCategory = computed<ICategory | null>(() => {
    const id = this.openCategoryId();
    return id ? (this.categories().find(category => category.id === id) ?? null) : null;
  });

  constructor() {
    effect(() => {
      const headers = this.categoryService.categoriesResource.headers();
      if (headers) {
        this.fillComponentAttributesFromResponseHeader(headers);
      }
    });
    effect(() => {
      this.categories.set(this.fillComponentAttributesFromResponseBody([...this.categoryService.categories()]));
    });
  }

  trackId = (item: ICategory): string => this.categoryService.getCategoryIdentifier(item);

  ngOnInit(): void {
    this.subscription = combineLatest([this.activatedRoute.queryParamMap, this.activatedRoute.data])
      .pipe(
        tap(([params, data]) => this.fillComponentAttributeFromRoute(params, data)),
        tap(() => this.load()),
        tap(() => this.loadActivities()),
      )
      .subscribe();
    this.loadCounts();
  }

  delete(category: ICategory): void {
    const modalRef = this.modalService.open(CategoryDeleteDialog, { size: 'lg', backdrop: 'static' });
    modalRef.componentInstance.category = category;
    // unsubscribe not needed because closed completes on modal close
    modalRef.closed
      .pipe(
        filter(reason => reason === ITEM_DELETED_EVENT),
        tap(() => this.refresh()),
      )
      .subscribe();
  }

  load(): void {
    this.queryBackend();
  }

  /** The refresh control, which means the cards, their counts and the open activities table. */
  refresh(): void {
    this.load();
    this.loadCounts();
    this.loadActivities();
  }

  navigateToWithComponentValues(event: SortState): void {
    this.handleNavigation(this.page(), event);
  }

  navigateToPage(page: number): void {
    this.handleNavigation(page, this.sortState());
  }

  /** Opening the card already open closes it, matching the chip rows on the directory screens. */
  toggleCategory(categoryId: string): void {
    void this.router.navigate(['./'], {
      relativeTo: this.activatedRoute,
      queryParams: { open: this.openCategoryId() === categoryId ? null : categoryId },
      queryParamsHandling: 'merge',
    });
  }

  countFor(categoryId: string): ICategoryActivityCount | null {
    return this.countsByCategory()[categoryId] ?? null;
  }

  isSaving(activityId: string): boolean {
    return this.saving().has(activityId);
  }

  /**
   * Flips one activity's published flag.
   *
   * Through the existing `PATCH`, which copies only the fields it is sent — no dedicated endpoint
   * was needed. The row is updated from the server's response rather than optimistically: a toggle
   * that flips in the browser and fails on the wire leaves the screen asserting something untrue
   * about what patients can be booked onto, and the next reload silently disagrees with it.
   */
  togglePublished(activity: IServiceActivity): void {
    const next = !activity.published;
    this.saving.update(current => new Set(current).add(activity.id));

    this.serviceActivityService.partialUpdate({ id: activity.id, published: next }).subscribe({
      next: updated => {
        this.activities.update(current =>
          (current ?? []).map(row => (row.id === activity.id ? { ...row, published: updated.published } : row)),
        );
        this.clearSaving(activity.id);
        // The card's live count has moved, and it is computed over the whole catalogue.
        this.loadCounts();
      },
      // The row keeps its old value and the error interceptor raises the alert, so the screen
      // continues to show what the server last confirmed.
      error: () => this.clearSaving(activity.id),
    });
  }

  protected fillComponentAttributeFromRoute(params: ParamMap, data: Data): void {
    this.openCategoryId.set(params.get(OPEN_PARAM));
    const page = params.get(PAGE_HEADER);
    this.page.set(+(page ?? 1));
    this.sortState.set(this.sortService.parseSortParam(params.get(SORT) ?? data[DEFAULT_SORT_DATA]));
  }

  protected fillComponentAttributesFromResponseBody(data: ICategory[]): ICategory[] {
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
    };
    this.categoryService.categoriesParams.set(queryObject);
  }

  protected handleNavigation(page: number, sortState: SortState): void {
    const queryParamsObj = {
      page,
      size: this.itemsPerPage(),
      sort: this.sortService.buildSortParam(sortState),
      open: this.openCategoryId(),
    };

    void this.router.navigate(['./'], {
      relativeTo: this.activatedRoute,
      queryParams: queryParamsObj,
    });
  }

  private clearSaving(activityId: string): void {
    this.saving.update(current => {
      const next = new Set(current);
      next.delete(activityId);
      return next;
    });
  }

  /**
   * The counts, which describe the whole catalogue and so do not move when a page of cards is
   * turned. Kept out of {@link load} for that reason.
   */
  private loadCounts(): void {
    this.categoryService.summary().subscribe({
      next: summary => this.summary.set(summary),
      // Leaving this null renders every card's count as "—", which is not the same claim as a zero.
      error: () => this.summary.set(null),
    });
  }

  /**
   * The open category's activities, filtered server-side.
   *
   * `size` is generous rather than paged: a category holds a handful of activities, and a second
   * pager inside an expanded card would compete with the one paging the cards themselves. If a
   * catalogue ever outgrows it, the fix is a pager here — not a larger number.
   */
  private loadActivities(): void {
    const categoryId = this.openCategoryId();
    if (!categoryId) {
      this.activities.set(null);
      return;
    }
    this.activities.set(null);
    this.serviceActivityService.query({ 'categoryId.equals': categoryId, size: 100, sort: ['name,asc'] }).subscribe({
      next: response => this.activities.set(response.body ?? []),
      error: () => this.activities.set(null),
    });
  }
}
