import { ChangeDetectionStrategy, Component, OnInit, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Data, ParamMap, Router, RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription, combineLatest, tap } from 'rxjs';

import { DEFAULT_SORT_DATA, SORT } from 'app/config/navigation.constants';
import { Alert } from 'app/shared/alert/alert';
import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';
import { SortByDirective, SortDirective, SortService, type SortState, sortStateSignal } from 'app/shared/sort';
import { IPlatformService } from '../platform-service.model';
import { PlatformServiceService } from '../service/platform-service.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-platform-service',
  templateUrl: './platform-service.html',
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
export class PlatformService implements OnInit {
  subscription: Subscription | null = null;
  readonly platformServices = signal<IPlatformService[]>([]);

  sortState = sortStateSignal({});

  readonly router = inject(Router);
  protected readonly platformServiceService = inject(PlatformServiceService);
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly isLoading = this.platformServiceService.platformServicesResource.isLoading;
  protected readonly activatedRoute = inject(ActivatedRoute);
  protected readonly sortService = inject(SortService);

  constructor() {
    effect(() => {
      this.platformServices.set(this.fillComponentAttributesFromResponseBody([...this.platformServiceService.platformServices()]));
    });
  }

  trackId = (item: IPlatformService): number => this.platformServiceService.getPlatformServiceIdentifier(item);

  ngOnInit(): void {
    this.subscription = combineLatest([this.activatedRoute.queryParamMap, this.activatedRoute.data])
      .pipe(
        tap(([params, data]) => this.fillComponentAttributeFromRoute(params, data)),
        tap(() => {
          if (this.platformServices().length === 0) {
            this.load();
          }
        }),
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

  protected refineData(data: IPlatformService[]): IPlatformService[] {
    const { predicate, order } = this.sortState();
    return predicate && order ? data.sort(this.sortService.startSort({ predicate, order })) : data;
  }

  protected fillComponentAttributesFromResponseBody(data: IPlatformService[]): IPlatformService[] {
    return this.refineData(data);
  }

  protected queryBackend(): void {
    const queryObject: any = {
      sort: this.sortService.buildSortParam(this.sortState()),
    };
    this.platformServiceService.platformServicesParams.set(queryObject);
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
