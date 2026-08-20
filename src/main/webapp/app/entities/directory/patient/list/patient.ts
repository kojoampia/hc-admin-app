import { HttpHeaders } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Data, ParamMap, Router, RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbPagination } from '@ng-bootstrap/ng-bootstrap/pagination';
import { TranslatePipe } from '@ngx-translate/core';
import dayjs from 'dayjs/esm';
import { Subscription, combineLatest, tap } from 'rxjs';

import { StatusPill } from 'app/console/shared/status-pill/status-pill';
import { DEFAULT_SORT_DATA, SORT } from 'app/config/navigation.constants';
import { ITEMS_PER_PAGE, PAGE_HEADER, TOTAL_COUNT_RESPONSE_HEADER } from 'app/config/pagination.constants';
import { AccountStatus } from 'app/entities/enumerations/account-status.model';
import { ProfessionalService } from 'app/entities/directory/professional/service/professional.service';
import { Alert } from 'app/shared/alert/alert';
import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';
import { ItemCount } from 'app/shared/pagination';
import { SortByDirective, SortDirective, SortService, type SortState, sortStateSignal } from 'app/shared/sort';
import { IPatient } from '../patient.model';
import { PatientService } from '../service/patient.service';

/** Query param that puts the archived half of the directory on screen. */
const ARCHIVED_PARAM = 'archived';

/** Query param carrying the selected status tile, so a filtered directory is a shareable URL. */
const STATUS_PARAM = 'status';

/**
 * The patient directory.
 *
 * The generated screen this replaces had **no patient name on it at all** — rows read `a1`,
 * `profile-a1`, `angel-a1` — which is the single worst finding in the gap analysis, because the
 * screen worked perfectly and was useless.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-patient',
  templateUrl: './patient.html',
  styleUrl: './patient.scss',
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
  ],
})
export class Patient implements OnInit {
  /**
   * Every status, not the three the demo tiles.
   *
   * The demo draws Active, Pending and Suspended beside an All — which leaves an on-leave or
   * under-review patient inside All and reachable by no tile of its own. Listing the enum means
   * every record in the directory is one click away.
   */
  readonly STATUSES = Object.keys(AccountStatus) as (keyof typeof AccountStatus)[];

  subscription: Subscription | null = null;
  readonly patients = signal<IPatient[]>([]);

  sortState = sortStateSignal({});

  readonly itemsPerPage = signal(ITEMS_PER_PAGE);
  readonly totalItems = signal(0);
  readonly page = signal(1);
  /** Which half of the directory is on screen. Mirrored in the `archived` query param. */
  readonly showArchived = signal(false);
  readonly status = signal<keyof typeof AccountStatus | null>(null);

  /** Per-status row counts for the tiles, read from `X-Total-Count`. */
  readonly counts = signal<Record<string, number>>({});
  /** Whole-directory total, for the All tile. */
  readonly allCount = signal<number | null>(null);

  /**
   * Clinical lead id → name, filled in after the page lands.
   *
   * `GET /api/patients` cannot supply this. `Patient.clinicalLead` carries
   * `@JsonIgnoreProperties({"profile", …})` on the api, so every row arrives with a licence number
   * and a speciality and no name — the same hole the patient *record* works around by fetching the
   * one professional it needs. Here it is the distinct leads on the page, which is a handful of
   * requests rather than one per row, and the column shows the licence number until they land so
   * it is never empty.
   */
  // `string | undefined` rather than `string`: without `noUncheckedIndexedAccess` TypeScript types
  // a missing key as `string`, which is exactly the case this map is for — the name is absent until
  // its request lands. Saying so keeps the fallback below honest instead of looking redundant.
  readonly leadNames = signal<Record<string, string | undefined>>({});

  readonly router = inject(Router);
  protected readonly patientService = inject(PatientService);
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly isLoading = this.patientService.patientsResource.isLoading;
  protected readonly activatedRoute = inject(ActivatedRoute);
  protected readonly sortService = inject(SortService);
  private readonly professionalService = inject(ProfessionalService);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly hasFilter = computed(() => this.status() !== null);

  constructor() {
    effect(() => {
      const headers = this.patientService.patientsResource.headers();
      if (headers) {
        this.fillComponentAttributesFromResponseHeader(headers);
      }
    });
    effect(() => {
      const rows = this.fillComponentAttributesFromResponseBody([...this.patientService.patients()]);
      this.patients.set(rows);
      // untracked, because loadLeadNames reads the map it eventually writes. Tracked, this effect
      // would depend on its own output and re-run each time a name landed — it converges, since
      // the second pass finds nothing left to fetch, but only by accident of the dedup.
      untracked(() => this.loadLeadNames(rows));
    });
  }

  trackId = (item: IPatient): string => this.patientService.getPatientIdentifier(item);

  /** The patient's name, which lives on the linked profile. Falls back to the id. */
  displayName(patient: IPatient): string {
    const name = [patient.profile?.firstName, patient.profile?.lastName].filter(Boolean).join(' ');
    return name.length > 0 ? name : patient.id;
  }

  initials(patient: IPatient): string {
    const parts = [patient.profile?.firstName, patient.profile?.lastName].filter(Boolean) as string[];
    if (parts.length === 0) {
      return patient.id.slice(0, 2).toUpperCase();
    }
    return parts
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase();
  }

  /**
   * Age in whole years, or null when there is no usable date of birth.
   *
   * The date is parsed rather than used as a dayjs, because it is not one. `PatientService`
   * converts `joinedOn` and `lastActiveOn` and passes the nested profile through as the server
   * sent it — so `profile.dateOfBirth` is a string at runtime while the compiler believes it is a
   * `dayjs.Dayjs`. The patient record hit this and documented it; every screen reading a nested
   * date does.
   */
  age(patient: IPatient): number | null {
    const raw = patient.profile?.dateOfBirth;
    if (!raw) {
      return null;
    }
    const parsed = dayjs(raw);
    if (!parsed.isValid()) {
      return null;
    }
    const years = dayjs().diff(parsed, 'year');
    return Number.isFinite(years) && years >= 0 ? years : null;
  }

  /** Town and city from the profile's address, in the order the record shows them. */
  location(patient: IPatient): string | null {
    const address = patient.profile?.address;
    if (!address) {
      return null;
    }
    // Written out rather than chained with `||`: `join` returns an empty string, which is falsy
    // but not nullish, so `??` would let "" through as a location and print a blank cell.
    const townAndCity = [address.townDistrict, address.cityState].filter(Boolean).join(', ');
    if (townAndCity.length > 0) {
      return townAndCity;
    }
    return address.region ?? null;
  }

  /** The lead's name once it has arrived; the licence number until then, so the cell is never blank. */
  clinicalLead(patient: IPatient): string | null {
    const lead = patient.clinicalLead;
    if (!lead) {
      return null;
    }
    return this.leadNames()[lead.id] ?? lead.licenceNumber ?? lead.id;
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
    // Guarded against the enum rather than cast: a hand-edited URL would otherwise send an unknown
    // value the api answers with 400, and the screen would look broken rather than unfiltered.
    const status = params.get(STATUS_PARAM);
    this.status.set(status && status in AccountStatus ? (status as keyof typeof AccountStatus) : null);
    const page = params.get(PAGE_HEADER);
    this.page.set(+(page ?? 1));
    this.sortState.set(this.sortService.parseSortParam(params.get(SORT) ?? data[DEFAULT_SORT_DATA]));
  }

  protected fillComponentAttributesFromResponseBody(data: IPatient[]): IPatient[] {
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
    this.patientService.patientsParams.set(queryObject);
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
   * The tiles: one count per status plus the directory total.
   *
   * `size=1` queries read for their `X-Total-Count` — the message desk's pattern. They describe the
   * unarchived directory and run once on load rather than on every page turn, which is why this is
   * separate from {@link load}.
   */
  private loadTiles(): void {
    this.patientService.query({ page: 0, size: 1, 'isArchived.notEquals': true }).subscribe({
      next: response => this.allCount.set(Number(response.headers.get(TOTAL_COUNT_RESPONSE_HEADER) ?? 0)),
      // Null renders "—". A failed count is not a directory of nobody.
      error: () => this.allCount.set(null),
    });

    for (const status of this.STATUSES) {
      this.patientService.query({ page: 0, size: 1, 'status.equals': status, 'isArchived.notEquals': true }).subscribe({
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

  /**
   * Resolve the clinical leads named on this page.
   *
   * Distinct ids, and only the ones not already known — a directory where every patient shares a
   * lead costs one request, not twenty, and turning back to a page costs none. The map is never
   * cleared between pages for the same reason.
   */
  private loadLeadNames(patients: IPatient[]): void {
    const known = this.leadNames();
    const wanted = [...new Set(patients.map(patient => patient.clinicalLead?.id).filter((id): id is string => !!id))].filter(
      id => !(id in known),
    );

    for (const id of wanted) {
      this.professionalService.find(id).subscribe({
        next: professional => {
          const name = [professional.profile?.firstName, professional.profile?.lastName].filter(Boolean).join(' ');
          if (name) {
            this.leadNames.update(current => ({ ...current, [id]: name }));
          }
        },
        // The row keeps the licence number, which is what it showed before this screen existed.
        // A failed lookup must not blank a cell that already had something true in it.
        error: () => undefined,
      });
    }
  }
}
