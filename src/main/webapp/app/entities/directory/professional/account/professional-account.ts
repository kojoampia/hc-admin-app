import { HttpHeaders } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbPagination } from '@ng-bootstrap/ng-bootstrap/pagination';
import { combineLatest, filter, tap } from 'rxjs';

import { ITEMS_PER_PAGE, PAGE_HEADER, TOTAL_COUNT_RESPONSE_HEADER } from 'app/config/pagination.constants';
import { Alert } from 'app/shared/alert/alert';
import { AlertError } from 'app/shared/alert/alert-error';
import { FormatMediumDatetimePipe } from 'app/shared/date';
import { TranslateDirective } from 'app/shared/language';
import { ItemCount } from 'app/shared/pagination';
import { SortByDirective, SortDirective, SortService, type SortState, sortStateSignal } from 'app/shared/sort';
import { ProfessionalAccountService } from './professional-account.service';
import { IProfessionalUser } from '../professional.model';
/**
 * The gateway's user list.
 *
 * Shaped after JHipster's stock user-management: same columns, same sort and
 * pagination plumbing, same activate/deactivate toggle in the status cell.
 * The one rule it adds is that an administrator cannot deactivate themselves
 * — the stock module has that guard too, and losing your own access from a
 * mis-click is not a recoverable mistake in a console with no other admin.
 */
@Component({
  selector: 'abf-professional-account',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './professional-account.html',
  imports: [
    RouterLink,
    FontAwesomeModule,
    NgbPagination,
    AlertError,
    SortDirective,
    SortByDirective,
    ItemCount,
    TranslateDirective,
    FormatMediumDatetimePipe,
  ],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class ProfessionalAccount implements OnInit {
  readonly users = signal<IProfessionalUser[] | null>(null);
  readonly totalItems = signal(0);
  readonly itemsPerPage = ITEMS_PER_PAGE;
  readonly page = signal(1);
  readonly isLoading = signal(false);

  sortState = sortStateSignal({ predicate: 'id', order: 'asc' });

  private readonly professionalAccountService = inject(ProfessionalAccountService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly sortService = inject(SortService);

  ngOnInit(): void {
    combineLatest([this.activatedRoute.data, this.activatedRoute.queryParamMap])
      .pipe(
        tap(([, params]) => {
          this.page.set(Number(params.get(PAGE_HEADER) ?? 1));
          this.sortState.set(this.sortService.parseSortParam(params.get('sort') ?? 'id,asc'));
        }),
        tap(() => this.loadAll()),
      )
      .subscribe();
  }

  trackIdentity = (item: IProfessionalUser): string => item.login ?? item.id;

  loadAll(): void {
    this.isLoading.set(true);
    this.professionalAccountService
      .query({
        page: this.page() - 1,
        size: this.itemsPerPage,
        sort: this.sortService.buildSortParam(this.sortState()),
      })
      .subscribe({
        next: response => {
          this.isLoading.set(false);
          this.onSuccess(response.body, response.headers);
        },
        error: () => this.isLoading.set(false),
      });
  }

  setActive(user: IProfessionalUser, isActivated: boolean): void {
    this.professionalAccountService.update({ ...user, activated: isActivated }).subscribe(() => this.loadAll());
  }

  navigateToWithComponentValues(event: SortState): void {
    this.handleNavigation(this.page(), event);
  }

  navigateToPage(page: number): void {
    this.handleNavigation(page, this.sortState());
  }

  private handleNavigation(page: number, sortState: SortState): void {
    this.router.navigate(['./'], {
      relativeTo: this.activatedRoute,
      queryParams: { page, sort: this.sortService.buildSortParam(sortState) },
    });
  }

  private onSuccess(users: IProfessionalUser[] | null, headers: HttpHeaders): void {
    this.totalItems.set(Number(headers.get(TOTAL_COUNT_RESPONSE_HEADER)));
    this.users.set(users);
  }
}
