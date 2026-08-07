import { HttpHeaders } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap/modal';
import { NgbPagination } from '@ng-bootstrap/ng-bootstrap/pagination';
import { TranslatePipe } from '@ngx-translate/core';
import { combineLatest, filter, tap } from 'rxjs';

import { ITEMS_PER_PAGE, PAGE_HEADER, TOTAL_COUNT_RESPONSE_HEADER } from 'app/config/pagination.constants';
import { AccountService } from 'app/core/auth/account.service';
import { Alert } from 'app/shared/alert/alert';
import { AlertError } from 'app/shared/alert/alert-error';
import { FormatMediumDatetimePipe } from 'app/shared/date';
import { TranslateDirective } from 'app/shared/language';
import { ItemCount } from 'app/shared/pagination';
import { SortByDirective, SortDirective, SortService, type SortState, sortStateSignal } from 'app/shared/sort';

import { UserManagementDeleteDialog } from '../delete/user-management-delete-dialog';
import { UserManagementService } from '../service/user-management.service';
import { IUser } from '../user-management.model';

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
  selector: 'abf-user-mgmt',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-management.html',
  imports: [
    RouterLink,
    FontAwesomeModule,
    NgbPagination,
    Alert,
    AlertError,
    SortDirective,
    SortByDirective,
    ItemCount,
    TranslateDirective,
    TranslatePipe,
    FormatMediumDatetimePipe,
  ],
})
export default class UserManagement implements OnInit {
  readonly users = signal<IUser[] | null>(null);
  readonly totalItems = signal(0);
  readonly itemsPerPage = ITEMS_PER_PAGE;
  readonly page = signal(1);
  readonly isLoading = signal(false);

  sortState = sortStateSignal({ predicate: 'id', order: 'asc' });

  private readonly userService = inject(UserManagementService);
  private readonly accountService = inject(AccountService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly modalService = inject(NgbModal);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly currentAccount = this.accountService.account;

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

  trackIdentity = (item: IUser): string => item.login ?? String(item.id);

  loadAll(): void {
    this.isLoading.set(true);
    this.userService
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

  /** An administrator may not switch themselves off. */
  canToggle(user: IUser): boolean {
    return this.currentAccount()?.login !== user.login;
  }

  setActive(user: IUser, isActivated: boolean): void {
    if (!this.canToggle(user)) {
      return;
    }
    this.userService.update({ ...user, activated: isActivated }).subscribe(() => this.loadAll());
  }

  deleteUser(user: IUser): void {
    const modalRef = this.modalService.open(UserManagementDeleteDialog, { size: 'lg', backdrop: 'static' });
    modalRef.componentInstance.user = user;
    modalRef.closed.pipe(filter(reason => reason === 'deleted')).subscribe(() => this.loadAll());
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

  private onSuccess(users: IUser[] | null, headers: HttpHeaders): void {
    this.totalItems.set(Number(headers.get(TOTAL_COUNT_RESPONSE_HEADER)));
    this.users.set(users);
  }
}
