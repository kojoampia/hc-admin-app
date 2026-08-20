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
import { IPlanFeature } from 'app/entities/catalogue/plan-feature/plan-feature.model';
import { PlanFeatureService } from 'app/entities/catalogue/plan-feature/service/plan-feature.service';
import { Alert } from 'app/shared/alert/alert';
import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';
import { ItemCount } from 'app/shared/pagination';
import { SortByDirective, SortDirective, SortService, type SortState, sortStateSignal } from 'app/shared/sort';
import { ServicePlanDeleteDialog } from '../delete/service-plan-delete-dialog';
import { ServicePlanService } from '../service/service-plan.service';
import { IPlanMixRow, IServicePlan, IServicePlanSummary } from '../service-plan.model';

/**
 * The plan board.
 *
 * A card per plan over a plan mix table, replacing the generated entity table — which listed
 * `Id · Name · Tier · Tier Label · Monthly Price · Currency · Summary · Featured · Subscriber Count`
 * and could show neither a feature list nor a share.
 *
 * Two of the mix columns cannot be computed here. `share` is a proportion of the whole book of
 * subscribers, and dividing by the plans on screen would print percentages that sum to 100 across a
 * subset; `subscribers` is a count over the patient directory. Both come from
 * `GET /api/service-plans/summary`.
 *
 * **`subscriberCount` on the plan itself is not read anywhere on this screen and must not be.** It
 * is a denormalised counter nothing maintains — 41/52/23 against a directory of twelve patients —
 * and the generated table displayed it for months. The mix reconciles to the patient directory
 * instead, so a reader can click through and arrive at the same number.
 *
 * Feature lists are fetched per card with `planId.equals` rather than by reading one page of
 * `/api/plan-features` and grouping: eighteen features fit inside the default page of twenty today,
 * and the nineteenth would silently vanish off a card.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-service-plan',
  templateUrl: './service-plan.html',
  styleUrl: './service-plan.scss',
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
export class ServicePlan implements OnInit {
  subscription: Subscription | null = null;
  readonly servicePlans = signal<IServicePlan[]>([]);

  sortState = sortStateSignal({});

  readonly itemsPerPage = signal(ITEMS_PER_PAGE);
  readonly totalItems = signal(0);
  readonly page = signal(1);

  /**
   * The plan mix. Null until the request answers, and null again on failure — the board renders
   * that as "—" per cell rather than as zeros, so a reader can tell "not loaded" from "none".
   */
  readonly summary = signal<IServicePlanSummary | null>(null);

  /** Feature labels per plan id, each ordered by `position`. Absent while a card is still loading. */
  readonly features = signal<Record<string, IPlanFeature[]>>({});

  readonly router = inject(Router);
  protected readonly servicePlanService = inject(ServicePlanService);
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly isLoading = this.servicePlanService.servicePlansResource.isLoading;
  protected readonly planFeatureService = inject(PlanFeatureService);
  protected readonly activatedRoute = inject(ActivatedRoute);
  protected readonly sortService = inject(SortService);
  protected modalService = inject(NgbModal);

  /** The mix rows keyed by plan, so a card can show its own share without scanning the array. */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly mixByPlan = computed<Record<string, IPlanMixRow>>(() => {
    const summary = this.summary();
    if (!summary) {
      return {};
    }
    return Object.fromEntries(summary.mix.map(row => [row.planId, row]));
  });

  /**
   * What the mix table totals.
   *
   * Summed from the rows the server sent rather than recomputed from the page, so the total agrees
   * with the shares above it by construction.
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly totalRevenue = computed<number | null>(() => {
    const summary = this.summary();
    if (!summary) {
      return null;
    }
    // No null guard on monthlyRevenue: the server sends zero rather than null for it, deliberately
    // — no subscribers at any price earns nothing, which is a fact and not a gap. `share` is the
    // field that can be null, and it is not summed.
    return summary.mix.reduce((running, row) => running + row.monthlyRevenue, 0);
  });

  constructor() {
    effect(() => {
      const headers = this.servicePlanService.servicePlansResource.headers();
      if (headers) {
        this.fillComponentAttributesFromResponseHeader(headers);
      }
    });
    effect(() => {
      const plans = this.fillComponentAttributesFromResponseBody([...this.servicePlanService.servicePlans()]);
      this.servicePlans.set(plans);
      this.loadFeatures(plans);
    });
  }

  trackId = (item: IServicePlan): string => this.servicePlanService.getServicePlanIdentifier(item);

  ngOnInit(): void {
    this.subscription = combineLatest([this.activatedRoute.queryParamMap, this.activatedRoute.data])
      .pipe(
        tap(([params, data]) => this.fillComponentAttributeFromRoute(params, data)),
        // Unconditional. The "skip if already loaded" guard this replaces predates paging: page
        // and sort now live in the query string, so an already-loaded slice is not the answer to
        // a changed query — paging forward would have re-rendered page 1.
        tap(() => this.load()),
      )
      .subscribe();
    this.loadMix();
  }

  delete(servicePlan: IServicePlan): void {
    const modalRef = this.modalService.open(ServicePlanDeleteDialog, { size: 'lg', backdrop: 'static' });
    modalRef.componentInstance.servicePlan = servicePlan;
    // unsubscribe not needed because closed completes on modal close
    modalRef.closed
      .pipe(
        filter(reason => reason === ITEM_DELETED_EVENT),
        // Both halves: deleting a plan changes the mix as well as the list, and a stale share
        // adding up to more than 100 is exactly the kind of wrong number this screen exists to
        // avoid printing.
        tap(() => this.refresh()),
      )
      .subscribe();
  }

  load(): void {
    this.queryBackend();
  }

  /** The refresh control, which means the cards, the mix and the feature lists. */
  refresh(): void {
    this.load();
    this.loadMix();
  }

  navigateToWithComponentValues(event: SortState): void {
    this.handleNavigation(this.page(), event);
  }

  navigateToPage(page: number): void {
    this.handleNavigation(page, this.sortState());
  }

  /** The mix row for one plan, or null while the summary is still in flight. */
  mixFor(planId: string): IPlanMixRow | null {
    return this.mixByPlan()[planId] ?? null;
  }

  protected fillComponentAttributeFromRoute(params: ParamMap, data: Data): void {
    const page = params.get(PAGE_HEADER);
    this.page.set(+(page ?? 1));
    this.sortState.set(this.sortService.parseSortParam(params.get(SORT) ?? data[DEFAULT_SORT_DATA]));
  }

  protected fillComponentAttributesFromResponseBody(data: IServicePlan[]): IServicePlan[] {
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
    this.servicePlanService.servicePlansParams.set(queryObject);
  }

  protected handleNavigation(page: number, sortState: SortState): void {
    const queryParamsObj = {
      page,
      size: this.itemsPerPage(),
      sort: this.sortService.buildSortParam(sortState),
    };

    this.router.navigate(['./'], {
      relativeTo: this.activatedRoute,
      queryParams: queryParamsObj,
    });
  }

  /**
   * The mix, which describes the whole directory and so does not move when a page is turned.
   *
   * Kept out of {@link load} deliberately: folding it in would re-request the same figures on every
   * sort and every page turn to repaint identical numbers.
   */
  private loadMix(): void {
    this.servicePlanService.summary().subscribe({
      next: summary => this.summary.set(summary),
      // The cards are intact and the error interceptor raises the alert. Leaving this null renders
      // every computed cell as "—", which is not the same claim as a zero.
      error: () => this.summary.set(null),
    });
  }

  /**
   * One request per card, filtered server-side.
   *
   * `position` is sorted here rather than trusted from the server, because the sort applies within
   * a plan and the endpoint's own sort is over the whole collection.
   */
  private loadFeatures(plans: IServicePlan[]): void {
    for (const plan of plans) {
      this.planFeatureService.query({ 'planId.equals': plan.id, size: 100, sort: ['position,asc'] }).subscribe({
        next: response =>
          this.features.update(current => ({
            ...current,
            [plan.id]: [...(response.body ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
          })),
        // Dropping the key leaves the card's list absent rather than empty — an empty list would
        // say the plan includes nothing, which is a different claim from "could not be read".
        error: () =>
          this.features.update(current => {
            const { [plan.id]: _removed, ...rest } = current;
            return rest;
          }),
      });
    }
  }
}
