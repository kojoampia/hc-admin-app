import { ChangeDetectionStrategy, Component, OnInit, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Data, ParamMap, Router, RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap/modal';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription, combineLatest, filter, tap } from 'rxjs';

import { DEFAULT_SORT_DATA, ITEM_DELETED_EVENT, SORT } from 'app/config/navigation.constants';
import { Alert } from 'app/shared/alert/alert';
import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';
import { SortByDirective, SortDirective, SortService, type SortState, sortStateSignal } from 'app/shared/sort';
import { PlanFeatureDeleteDialog } from '../delete/plan-feature-delete-dialog';
import { IPlanFeature } from '../plan-feature.model';
import { PlanFeatureService } from '../service/plan-feature.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-plan-feature',
  templateUrl: './plan-feature.html',
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
  ],
})
export class PlanFeature implements OnInit {
  subscription: Subscription | null = null;
  readonly planFeatures = signal<IPlanFeature[]>([]);

  sortState = sortStateSignal({});

  readonly router = inject(Router);
  protected readonly planFeatureService = inject(PlanFeatureService);
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly isLoading = this.planFeatureService.planFeaturesResource.isLoading;
  protected readonly activatedRoute = inject(ActivatedRoute);
  protected readonly sortService = inject(SortService);
  protected modalService = inject(NgbModal);

  constructor() {
    effect(() => {
      this.planFeatures.set(this.fillComponentAttributesFromResponseBody([...this.planFeatureService.planFeatures()]));
    });
  }

  trackId = (item: IPlanFeature): number => this.planFeatureService.getPlanFeatureIdentifier(item);

  ngOnInit(): void {
    this.subscription = combineLatest([this.activatedRoute.queryParamMap, this.activatedRoute.data])
      .pipe(
        tap(([params, data]) => this.fillComponentAttributeFromRoute(params, data)),
        tap(() => {
          if (this.planFeatures().length === 0) {
            this.load();
          }
        }),
      )
      .subscribe();
  }

  delete(planFeature: IPlanFeature): void {
    const modalRef = this.modalService.open(PlanFeatureDeleteDialog, { size: 'lg', backdrop: 'static' });
    modalRef.componentInstance.planFeature = planFeature;
    // unsubscribe not needed because closed completes on modal close
    modalRef.closed
      .pipe(
        filter(reason => reason === ITEM_DELETED_EVENT),
        tap(() => this.load()),
      )
      .subscribe();
  }

  load(): void {
    this.queryBackend();
  }

  navigateToWithComponentValues(event: SortState): void {
    this.handleNavigation(event);
  }

  protected fillComponentAttributeFromRoute(params: ParamMap, data: Data): void {
    this.sortState.set(this.sortService.parseSortParam(params.get(SORT) ?? data[DEFAULT_SORT_DATA]));
  }

  protected refineData(data: IPlanFeature[]): IPlanFeature[] {
    const { predicate, order } = this.sortState();
    return predicate && order ? data.sort(this.sortService.startSort({ predicate, order })) : data;
  }

  protected fillComponentAttributesFromResponseBody(data: IPlanFeature[]): IPlanFeature[] {
    return this.refineData(data);
  }

  protected queryBackend(): void {
    const queryObject: any = {
      sort: this.sortService.buildSortParam(this.sortState()),
    };
    this.planFeatureService.planFeaturesParams.set(queryObject);
  }

  protected handleNavigation(sortState: SortState): void {
    const queryParamsObj = {
      sort: this.sortService.buildSortParam(sortState),
    };

    this.router.navigate(['./'], {
      relativeTo: this.activatedRoute,
      queryParams: queryParamsObj,
    });
  }
}
