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
import { ProfessionalRole } from 'app/entities/enumerations/professional-role.model';
import { Alert } from 'app/shared/alert/alert';
import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';
import { ItemCount } from 'app/shared/pagination';
import { SortByDirective, SortDirective, SortService, type SortState, sortStateSignal } from 'app/shared/sort';
import { IProfessional } from '../professional.model';
import { ProfessionalService } from '../service/professional.service';

/** Query param that puts the archived half of the directory on screen. */
const ARCHIVED_PARAM = 'archived';

/** Query param carrying the selected role tile, so a filtered directory is a shareable URL. */
const ROLE_PARAM = 'role';

/** Query param carrying the selected status chip. */
const STATUS_PARAM = 'status';

/** A role tile: how many hold the role, and how many of those are active. */
interface RoleCount {
  readonly total: number;
  readonly active: number;
}

/**
 * The clinician directory.
 *
 * A role tile per `ProfessionalRole`, each carrying its headcount and how many of those are
 * currently active, over a table of clinicians. Both figures come from `X-Total-Count` on a
 * `size=1` query — the message desk's pattern — because counting the rows on screen would count a
 * page and report it as the directory.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-professional',
  templateUrl: './professional.html',
  styleUrl: './professional.scss',
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
    StatusPill,
    DecimalPipe,
  ],
})
export class Professional implements OnInit {
  /**
   * Every role, not the four the demo draws.
   *
   * The demo's tile row omits `THERAPIST` entirely, so a therapist would appear in the table,
   * be counted in no tile, and be reachable by no filter. Listing the enum means the tiles account
   * for every clinician in the directory.
   */
  readonly ROLES = Object.keys(ProfessionalRole) as (keyof typeof ProfessionalRole)[];
  readonly STATUSES = Object.keys(AccountStatus) as (keyof typeof AccountStatus)[];

  subscription: Subscription | null = null;
  readonly professionals = signal<IProfessional[]>([]);

  sortState = sortStateSignal({});

  readonly itemsPerPage = signal(ITEMS_PER_PAGE);
  readonly totalItems = signal(0);
  readonly page = signal(1);
  /** Which half of the directory is on screen. Mirrored in the `archived` query param. */
  readonly showArchived = signal(false);
  readonly role = signal<keyof typeof ProfessionalRole | null>(null);
  readonly status = signal<keyof typeof AccountStatus | null>(null);

  /** Headcount and active count per role, for the tiles. */
  readonly roleCounts = signal<Record<string, RoleCount>>({});

  readonly router = inject(Router);
  protected readonly professionalService = inject(ProfessionalService);
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly isLoading = this.professionalService.professionalsResource.isLoading;
  protected readonly activatedRoute = inject(ActivatedRoute);
  protected readonly sortService = inject(SortService);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly hasFilter = computed(() => this.role() !== null || this.status() !== null);

  constructor() {
    effect(() => {
      const headers = this.professionalService.professionalsResource.headers();
      if (headers) {
        this.fillComponentAttributesFromResponseHeader(headers);
      }
    });
    effect(() => {
      this.professionals.set(this.fillComponentAttributesFromResponseBody([...this.professionalService.professionals()]));
    });
  }

  trackId = (item: IProfessional): string => this.professionalService.getProfessionalIdentifier(item);

  /** The clinician's name, which lives on the linked profile. Falls back to licence, then id. */
  displayName(professional: IProfessional): string {
    const name = [professional.profile?.firstName, professional.profile?.lastName].filter(Boolean).join(' ');
    // Written out rather than chained with `||`: `join` returns an empty string, which is falsy
    // but not nullish, so `??` would let "" through as a name and print a blank cell.
    if (name.length > 0) {
      return name;
    }
    return professional.licenceNumber ?? professional.id;
  }

  initials(professional: IProfessional): string {
    const parts = [professional.profile?.firstName, professional.profile?.lastName].filter(Boolean) as string[];
    if (parts.length === 0) {
      return professional.id.slice(0, 2).toUpperCase();
    }
    return parts
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase();
  }

  ngOnInit(): void {
    this.subscription = combineLatest([this.activatedRoute.queryParamMap, this.activatedRoute.data])
      .pipe(
        tap(([params, data]) => this.fillComponentAttributeFromRoute(params, data)),
        tap(() => this.load()),
      )
      .subscribe();
    this.loadTiles();
  }

  /** The table only — see {@link loadTiles} for why the tiles are not reloaded on every page turn. */
  load(): void {
    this.queryBackend();
  }

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

  toggleRole(role: keyof typeof ProfessionalRole): void {
    void this.router.navigate(['./'], {
      relativeTo: this.activatedRoute,
      queryParams: { page: 1, role: this.role() === role ? null : role },
      queryParamsHandling: 'merge',
    });
  }

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
      queryParams: { page: 1, role: null, status: null },
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
    // Guarded against the enums rather than cast: a hand-edited URL would otherwise send an unknown
    // value the api answers with 400, and the screen would look broken rather than unfiltered.
    const role = params.get(ROLE_PARAM);
    this.role.set(role && role in ProfessionalRole ? (role as keyof typeof ProfessionalRole) : null);
    const status = params.get(STATUS_PARAM);
    this.status.set(status && status in AccountStatus ? (status as keyof typeof AccountStatus) : null);
    const page = params.get(PAGE_HEADER);
    this.page.set(+(page ?? 1));
    this.sortState.set(this.sortService.parseSortParam(params.get(SORT) ?? data[DEFAULT_SORT_DATA]));
  }

  protected fillComponentAttributesFromResponseBody(data: IProfessional[]): IProfessional[] {
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
    const role = this.role();
    if (role) {
      queryObject['role.equals'] = role;
    }
    const status = this.status();
    if (status) {
      queryObject['status.equals'] = status;
    }
    this.professionalService.professionalsParams.set(queryObject);
  }

  protected handleNavigation(page: number, sortState: SortState): void {
    const queryParamsObj = {
      page,
      size: this.itemsPerPage(),
      sort: this.sortService.buildSortParam(sortState),
      archived: this.showArchived() ? true : null,
      role: this.role(),
      status: this.status(),
    };

    void this.router.navigate(['./'], {
      relativeTo: this.activatedRoute,
      queryParams: queryParamsObj,
    });
  }

  /**
   * The role tiles: a headcount and an active count for each role.
   *
   * Two `size=1` queries per role, so ten requests for five roles. That is more than one would
   * like and it is still the right shape: each is a count the server computes, and the alternative
   * — pulling the whole directory to tally it in the browser — is the unbounded read the pagination
   * sweep exists to prevent. They run once on load rather than on every page turn, which is why
   * this is separate from {@link load}.
   *
   * Both figures describe the unarchived directory, so the tiles do not move when the archived half
   * is on screen.
   */
  private loadTiles(): void {
    for (const role of this.ROLES) {
      const base = { size: 1, page: 0, 'role.equals': role, 'isArchived.notEquals': true };

      this.professionalService.query(base).subscribe({
        next: response => this.mergeRoleCount(role, { total: this.totalOf(response.headers) }),
        error: () => this.mergeRoleCount(role, { total: undefined }),
      });

      this.professionalService.query({ ...base, 'status.equals': 'ACTIVE' }).subscribe({
        next: response => this.mergeRoleCount(role, { active: this.totalOf(response.headers) }),
        error: () => this.mergeRoleCount(role, { active: undefined }),
      });
    }
  }

  /**
   * The two counts for a role land in either order and independently.
   *
   * Merging rather than replacing means whichever answers second does not wipe the first, and a
   * role whose two requests disagree in timing never shows a headcount of zero on its way to the
   * real one.
   */
  private mergeRoleCount(role: string, part: { total?: number; active?: number }): void {
    this.roleCounts.update(current => {
      const existing = current[role] ?? { total: 0, active: 0 };
      return {
        ...current,
        [role]: {
          total: part.total ?? existing.total,
          active: part.active ?? existing.active,
        },
      };
    });
  }

  private totalOf(headers: HttpHeaders): number {
    return Number(headers.get(TOTAL_COUNT_RESPONSE_HEADER) ?? 0);
  }
}
