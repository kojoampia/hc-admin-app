import { HttpHeaders, HttpResponse } from '@angular/common/http';
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
import { IDirectoryLink, resolveLinkIdentity } from 'app/entities/directory/directory-link/directory-link.model';
import { DirectoryLinkService } from 'app/entities/directory/directory-link/service/directory-link.service';
import { ProfessionalService } from 'app/entities/directory/professional/service/professional.service';
import { Alert } from 'app/shared/alert/alert';
import { AlertError } from 'app/shared/alert/alert-error';
import HasAnyAuthorityDirective from 'app/shared/auth/has-any-authority.directive';
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
    HasAnyAuthorityDirective,
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

  /**
   * Patient id → the sibling-stack link that names them, for the rows that have no profile.
   *
   * A patient learned from a domain event has no `Profile` and can never be given one — the streams
   * carry no name, date of birth, phone number or document number, and hc-patient's publisher
   * refuses at runtime to put them on the wire, while hc-admin's `Profile` requires all four. So for
   * those rows this map is the only identity there is, and it is read from `/api/directory-links`
   * one request per page.
   *
   * Not cleared between pages, like {@link leadNames}: a link is immutable identity, so turning back
   * to a page already resolved costs nothing.
   */
  readonly links = signal<Record<string, IDirectoryLink | undefined>>({});

  /** True while an export is in flight, so the button cannot be pressed twice into two downloads. */
  readonly isExporting = signal(false);

  readonly router = inject(Router);
  protected readonly patientService = inject(PatientService);
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly isLoading = this.patientService.patientsResource.isLoading;
  protected readonly activatedRoute = inject(ActivatedRoute);
  protected readonly sortService = inject(SortService);
  private readonly professionalService = inject(ProfessionalService);
  private readonly directoryLinkService = inject(DirectoryLinkService);

  /**
   * The ids {@link loadLinks} has asked about and not yet heard back on.
   *
   * Deliberately not a signal and deliberately not part of {@link links}: nothing renders it, and an
   * id put into `links` before its answer arrives would read as "asked, and there is none", which is
   * the one state this screen must not claim without evidence.
   */
  private readonly linksInFlight = new Set<string>();

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
      untracked(() => {
        this.loadLeadNames(rows);
        this.loadLinks(rows);
      });
    });
  }

  trackId = (item: IPatient): string => this.patientService.getPatientIdentifier(item);

  /**
   * The patient's name, which lives on the linked profile.
   *
   * When there is no profile the row falls back to the address on the patient's
   * {@link DirectoryLinkService} link, and when there is no link either it says so — see
   * {@link isUnidentified}. **It never falls back to `patient.id`**, which is what it did until
   * backlog item 45: a row read `68b4f2a19c3d5e7f81a02c44` under a chip saying `68`, which is not
   * "identity not known" but a corrupted record, and an operator raised a ticket about it from
   * production.
   */
  displayName(patient: IPatient): string | null {
    const name = [patient.profile?.firstName, patient.profile?.lastName].filter(Boolean).join(' ');
    if (name.length > 0) {
      return name;
    }
    return resolveLinkIdentity(this.links()[patient.id]);
  }

  /**
   * True when nothing this console can reach names this person.
   *
   * The row then says so in words rather than printing an identifier — the template renders the
   * `unidentified` label and a note giving the reason, so an incomplete record reads as incomplete
   * instead of as broken.
   *
   * It is deliberately also true while the link request is in flight. The alternative is to show
   * the ObjectId for the moment before the links land, which is the exact rendering this change
   * removes, briefly.
   */
  isUnidentified(patient: IPatient): boolean {
    return this.displayName(patient) === null;
  }

  /**
   * Which explanation goes under "Identity not on file" — and it says only what is known.
   *
   * Until 2026-09-07 there was one hint and it read *"Registered on the patient app; no name has
   * been recorded here yet"* for **every** unidentified row. That is a guess, and `loadLinks`'s own
   * javadoc names the case it is wrong for: a patient with neither profile nor link. For those rows
   * the hint sent an operator looking for an account on hc-patient that never existed — a worse
   * outcome than the blank it replaced, because it is confidently wrong.
   *
   * So there are two, and the difference is what this console can actually see:
   *
   * - `Linked` — a link resolved and it names nobody. Then "registered on the patient app" is a fact
   *   off the link, not an inference, and worth saying.
   * - `Unknown` — everything else, which is one honest sentence covering three states that are
   *   indistinguishable from a screen: the lookup found no link (permanent), the lookup has not come
   *   back yet, or it failed. None of them licenses a claim about where the record came from.
   */
  unidentifiedHintKey(patient: IPatient): string {
    const known = patient.id in this.links();
    return known && this.links()[patient.id]
      ? 'hcAdminApp.directoryPatient.unidentifiedHintLinked'
      : 'hcAdminApp.directoryPatient.unidentifiedHintUnknown';
  }

  /**
   * The sub-label under a name that came off a link rather than a profile, by the link's own source.
   *
   * The single label said "From the patient app account" for every such row, while
   * `resolveLinkIdentity`'s login fallback was documented as being for a **professional**-sourced
   * link — so the spec asserted a branch the screen's wording denied. Unreachable today, because no
   * hc-professional link carries a `localId`, but a label that contradicts a covered branch is a
   * label that will be wrong the moment the branch is reached. It reads the source instead of
   * assuming one.
   *
   * **That justification changed on 2026-09-07 and the rule did not.** The professional directory
   * stopped calling `resolveLinkIdentity` when backlog item 47 named `login` as what a clinician's
   * row shows and `email` as correlation-only, so the login fallback here is no longer *for* the
   * other directory — it is this one's own last resort before "identity not on file". The branch is
   * still reachable by an hc-professional link that acquires a `localId`, which nothing does today
   * and item 35 would.
   */
  identityFromLinkKey(patient: IPatient): string {
    return this.links()[patient.id]?.source === 'HC_PATIENT'
      ? 'hcAdminApp.directoryPatient.identityFromLinkPatientApp'
      : 'hcAdminApp.directoryPatient.identityFromLinkOther';
  }

  initials(patient: IPatient): string {
    const parts = [patient.profile?.firstName, patient.profile?.lastName].filter(Boolean) as string[];
    if (parts.length > 0) {
      return parts
        .map(part => part.charAt(0))
        .join('')
        .toUpperCase();
    }

    // From the address, so a learned patient's chip is the first letters of their mailbox rather
    // than two hex characters of a Mongo id. `ama.mensah@example.com` gives `AM`, and a mailbox
    // with no separator in it gives its first letter alone.
    const identity = this.displayName(patient);
    if (identity) {
      const mailbox = identity.split('@')[0];
      const letters = mailbox
        .split(/[^\p{L}\p{N}]+/u)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part.charAt(0));
      if (letters.length > 0) {
        return letters.join('').toUpperCase();
      }
    }

    // Nobody is named, so the chip says nothing rather than inventing something from the id.
    return '—';
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
    // The links go too, and they are the reason this is not just `load()` twice over.
    // `loadLinks` records "asked, and there is none" as a present `undefined` so it does not ask
    // again on every page turn — which is right for paging and wrong for Refresh, because the thing
    // an administrator presses Refresh *after* is `POST /api/directory-links/reconcile`, and that is
    // precisely the operation that turns "there is none" into "there is one". Without this the row
    // went on saying "Identity not on file" until the component was destroyed and recreated.
    this.links.set({});
    this.load();
    this.loadTiles();
  }

  /**
   * Downloads the directory as CSV, over the filters currently on screen.
   *
   * The filters are the ones `queryBackend` just sent, read back rather than rebuilt — an export
   * that disagrees with the list above it is the failure this action has, and it is invisible in
   * the file. `page`, `size` and `sort` are stripped: sort is meaningful and passed through, but a
   * page of twenty would make this a download of the visible page wearing the name of an export.
   *
   * Admin-only, and the button is behind `*abfHasAnyAuthority` — the server refuses an operator
   * with 403 regardless, which is where the rule lives.
   */
  exportCsv(): void {
    if (this.isExporting()) {
      return;
    }
    this.isExporting.set(true);

    const { page, size, ...filters } = (this.patientService.patientsParams() ?? {}) as Record<string, any>;
    this.patientService.exportCsv(filters).subscribe({
      next: response => {
        this.isExporting.set(false);
        this.saveDownload(response);
      },
      error: () => this.isExporting.set(false),
    });
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

  /**
   * Resolve the sibling-stack links for the rows on this page that have no name.
   *
   * **Only the nameless rows, and only the ones not already resolved.** A directory of ordinary
   * patients — every one of them with a profile — sends no request at all, which is the common case
   * and has to stay free. A page of learned patients sends exactly one.
   *
   * The map records an unresolved id as `undefined` rather than leaving the key absent, so a
   * patient with no link is asked about once and not on every page turn. That distinction is real:
   * a `Patient` can have neither a profile nor a link — a row created by hand before the console
   * dropped its New button, or one whose link was lost — and it is a permanent state, not a pending
   * one. {@link refresh} clears the map, because a reconciliation can change that answer.
   *
   * Ids already in flight are excluded as well as ids already answered. The map cannot record them
   * — an unanswered id has no value to put in it, and writing `undefined` early would fix the row as
   * "there is none" before anybody had asked — so the set is kept beside it. Without that, two
   * responses landing close together (a sort and a page turn, or Refresh pressed twice) send the
   * same ids twice; harmless, and one more request per burst on a screen whose whole design point is
   * one request per page.
   */
  private loadLinks(patients: IPatient[]): void {
    const known = this.links();
    const wanted = patients
      .filter(patient => ![patient.profile?.firstName, patient.profile?.lastName].some(Boolean))
      .map(patient => patient.id)
      .filter(id => !(id in known) && !this.linksInFlight.has(id));

    if (wanted.length === 0) {
      return;
    }

    for (const id of wanted) {
      this.linksInFlight.add(id);
    }
    const settle = (): void => {
      for (const id of wanted) {
        this.linksInFlight.delete(id);
      }
    };

    this.directoryLinkService.findByLocalIds(wanted).subscribe({
      next: found => {
        settle();
        this.links.update(current => {
          const next = { ...current };
          for (const id of wanted) {
            next[id] = found.get(id);
          }
          return next;
        });
      },
      // The rows keep saying "identity not on file", which is true of what this console can see.
      // A failed lookup must not be recorded as "asked and there is none", or a retry never happens
      // — which is also why the in-flight set is cleared here rather than only on success.
      error: () => settle(),
    });
  }

  /**
   * Saves a downloaded blob under the name the server gave it.
   *
   * The object URL is revoked immediately after the click: it pins the blob in memory for the life
   * of the document otherwise, and a directory export is not a small one.
   */
  private saveDownload(response: HttpResponse<Blob>): void {
    const body = response.body;
    if (!body) {
      return;
    }
    const disposition = response.headers.get('Content-Disposition') ?? '';
    const match = /filename="?([^";]+)"?/.exec(disposition);
    const url = URL.createObjectURL(body);
    const link = document.createElement('a');
    link.href = url;
    link.download = match ? match[1] : 'patients.csv';
    link.click();
    URL.revokeObjectURL(url);
  }
}
