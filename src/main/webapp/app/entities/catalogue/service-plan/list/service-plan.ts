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
import { ServicePlanDeleteDialog } from '../delete/service-plan-delete-dialog';
import { ServicePlanService } from '../service/service-plan.service';
import { IServicePlan } from '../service-plan.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-service-plan',
  templateUrl: './service-plan.html',
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
export class ServicePlan implements OnInit {
  subscription: Subscription | null = null;
  readonly servicePlans = signal<IServicePlan[]>([]);

  sortState = sortStateSignal({});

  readonly router = inject(Router);
  protected readonly servicePlanService = inject(ServicePlanService);
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly isLoading = this.servicePlanService.servicePlansResource.isLoading;
  protected readonly activatedRoute = inject(ActivatedRoute);
  protected readonly sortService = inject(SortService);
  protected modalService = inject(NgbModal);

  constructor() {
    effect(() => {
      this.servicePlans.set(this.fillComponentAttributesFromResponseBody([...this.servicePlanService.servicePlans()]));
    });
  }

  trackId = (item: IServicePlan): string => this.servicePlanService.getServicePlanIdentifier(item);

  ngOnInit(): void {
    this.subscription = combineLatest([this.activatedRoute.queryParamMap, this.activatedRoute.data])
      .pipe(
        tap(([params, data]) => this.fillComponentAttributeFromRoute(params, data)),
        tap(() => {
          if (this.servicePlans().length === 0) {
            this.load();
          }
        }),
      )
      .subscribe();
  }

  delete(servicePlan: IServicePlan): void {
    const modalRef = this.modalService.open(ServicePlanDeleteDialog, { size: 'lg', backdrop: 'static' });
    modalRef.componentInstance.servicePlan = servicePlan;
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

  protected refineData(data: IServicePlan[]): IServicePlan[] {
    const { predicate, order } = this.sortState();
    return predicate && order ? data.sort(this.sortService.startSort({ predicate, order })) : data;
  }

  protected fillComponentAttributesFromResponseBody(data: IServicePlan[]): IServicePlan[] {
    return this.refineData(data);
  }

  protected queryBackend(): void {
    const queryObject: any = {
      sort: this.sortService.buildSortParam(this.sortState()),
    };
    this.servicePlanService.servicePlansParams.set(queryObject);
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
