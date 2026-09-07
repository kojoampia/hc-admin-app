import { DecimalPipe } from '@angular/common';
import { HttpHeaders } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Data, ParamMap, Router, RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import dayjs from 'dayjs/esm';
import { NgbPagination } from '@ng-bootstrap/ng-bootstrap/pagination';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription, combineLatest, tap } from 'rxjs';

import { StatusPill } from 'app/console/shared/status-pill/status-pill';
import { DEFAULT_SORT_DATA, SORT } from 'app/config/navigation.constants';
import { ITEMS_PER_PAGE, PAGE_HEADER, TOTAL_COUNT_RESPONSE_HEADER } from 'app/config/pagination.constants';
import { IDirectoryLink, hasProfileStatus, resolveClinicianLogin } from 'app/entities/directory/directory-link/directory-link.model';
import { DirectoryLinkService } from 'app/entities/directory/directory-link/service/directory-link.service';
import { AccountStatus } from 'app/entities/enumerations/account-status.model';
import { ProfessionalRole } from 'app/entities/enumerations/professional-role.model';
import { VerificationStatus } from 'app/entities/enumerations/verification-status.model';
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

/** Query param carrying the selected verification chip. */
const VERIFICATION_PARAM = 'verification';

/** Query param carrying the selected status chip. */
const STATUS_PARAM = 'status';

/** A role tile: how many hold the role, and how many of those are active. */
interface RoleCount {
  readonly total: number;
  readonly active: number;
}

/**
 * How many awaiting-a-record rows the panel lists before it stops and says how many are left.
 *
 * Five, matching the dashboard's approval card: this is a "something is waiting" panel above a
 * directory, not a second directory. The count beside it is the server's total, so "and 12 more" is
 * a real number rather than a count of what happened to arrive.
 */
const AWAITING_ROWS = 5;

/**
 * The clinician directory.
 *
 * A role tile per `ProfessionalRole`, each carrying its headcount and how many of those are
 * currently active, over a table of clinicians. Both figures come from `X-Total-Count` on a
 * `size=1` query — the message desk's pattern — because counting the rows on screen would count a
 * page and report it as the directory.
 *
 * **And, above it, the clinicians this console knows about and holds no record for.**
 * They are not in the directory table and cannot be: a registration on hc-professional produces a
 * `DirectoryLink` and no `Professional`, so no query against `/api/professionals` can return them.
 *
 * **Since backlog item 47 they are a table of their own with seven columns, and that supersedes item
 * 46's list.** The distinction is worth stating because item 46 argued specifically *against* a table
 * and was right: a clinician with no `Professional` record cannot be a row under Role, Licence and
 * Hub, because a line of dashes there reads as a record entered badly — item 45's finding. **These
 * are different columns.** `login`, `activated`, verified, complete, createdDate, modifiedDate and
 * lastModifiedBy come from the two-phase contract and need no `Professional` document at all, so the
 * reason for keeping these subjects out of the directory table does not apply to this one. Item 46
 * stays closed and its reasoning stays correct about the table it was written for.
 *
 * Two properties of that table are load-bearing and are the ways it goes wrong quietly:
 *
 * - **A row exists as soon as either phase arrives.** The phases are published by two applications
 *   onto two topics with no ordering between them, so whichever lands first creates the row and the
 *   other fills it in. Phase 1 alone is a registered account with no profile yet; phase 2 alone is a
 *   profile for an account this console has not been told about, which is rarer and is *not an
 *   error*. Neither is held back waiting for the other.
 * - **Empty is not false.** `verified` and `complete` are unknown until a `ProfileStatus` arrives,
 *   and a row reading "not verified" for a clinician whose status has merely not been published
 *   asserts something about a person from the absence of a message. See {@link hasProfile}.
 *
 * Nothing here is fabricated into a role or a licence number, which is what {@link awaitingName} and
 * the table's copy exist to make unnecessary.
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

  /** Every verification state, so a revoked or expired professional is reachable by a chip. */
  readonly VERIFICATIONS = Object.keys(VerificationStatus) as (keyof typeof VerificationStatus)[];

  subscription: Subscription | null = null;
  readonly professionals = signal<IProfessional[]>([]);

  sortState = sortStateSignal({});

  readonly itemsPerPage = signal(ITEMS_PER_PAGE);
  readonly totalItems = signal(0);
  readonly page = signal(1);
  /** Which half of the directory is on screen. Mirrored in the `archived` query param. */
  readonly showArchived = signal(false);
  readonly role = signal<keyof typeof ProfessionalRole | null>(null);
  /**
   * The verification chip, if one is selected.
   *
   * Server-side like the others: counting client-side breaks the moment the directory exceeds one
   * page, which is the failure `CLAUDE.md` records for pagination.
   */
  readonly verification = signal<keyof typeof VerificationStatus | null>(null);
  readonly status = signal<keyof typeof AccountStatus | null>(null);

  /** Headcount and active count per role, for the tiles. */
  readonly roleCounts = signal<Record<string, RoleCount>>({});

  /**
   * Clinicians this console knows about and holds no record for — the rows the table cannot have.
   *
   * A registration on hc-professional reaches this service as a `DirectoryLink` with no `localId`
   * and produces no `Professional` at all: both event types on that topic are `LINK_ONLY`, because
   * `role` and `licenceNumber` are required here and are on the wire in no event, in any version.
   * So they are listed beside the directory rather than in it, from what the link carries and with
   * nothing invented — backlog item 46, reported when a clinician registered on production and this
   * screen showed nothing at all.
   */
  readonly awaiting = signal<IDirectoryLink[]>([]);
  /** How many there are in total, which is not the number of rows above — see {@link AWAITING_ROWS}. */
  readonly awaitingTotal = signal(0);

  readonly router = inject(Router);
  protected readonly professionalService = inject(ProfessionalService);
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly isLoading = this.professionalService.professionalsResource.isLoading;
  protected readonly activatedRoute = inject(ActivatedRoute);
  protected readonly sortService = inject(SortService);
  private readonly directoryLinkService = inject(DirectoryLinkService);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly hasFilter = computed(() => this.role() !== null || this.status() !== null || this.verification() !== null);

  /**
   * Whether the awaiting-a-record panel belongs on screen at all.
   *
   * **Hidden under a filter and under Show archived, deliberately.** Those rows have no role, no
   * verification state, no account status and no archived flag — nothing an event carries — so a
   * filtered directory cannot honestly claim they match. Leaving them up beside a `role=DOCTOR`
   * table would say they are doctors, which is exactly the fabrication this whole item refuses to
   * make. Anything waiting is still one click away: clearing the filter brings the panel back, and
   * the empty count is not what hides it.
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly showAwaiting = computed(() => !this.hasFilter() && !this.showArchived() && this.awaiting().length > 0);

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

  /**
   * Initials from the profile, and an em dash when there is none — **never from the id**.
   *
   * This returned `professional.id.slice(0, 2).toUpperCase()` until 2026-09-07: two hex characters
   * of a Mongo ObjectId in the avatar chip, which is the exact rendering backlog item 45 removed
   * from the patient directory and which survived one directory along. `displayName` is shielded by
   * `licenceNumber ?? id` and the licence number is required, so the name cell was safe; `profile`
   * is an optional `@DBRef` and nothing requires it, so the chip was not.
   *
   * An em dash rather than initials off the licence number: `MDC/RN/23-4471` yields no letters a
   * person would recognise, and a chip is a monogram or it is nothing.
   */
  initials(professional: IProfessional): string {
    const parts = [professional.profile?.firstName, professional.profile?.lastName].filter(Boolean) as string[];
    if (parts.length === 0) {
      return '—';
    }
    return parts
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase();
  }

  /**
   * How an awaiting-a-record row is named, and `null` when nothing here can name it.
   *
   * **The login from phase 1, and never the address.** This called `resolveLinkIdentity` until
   * 2026-09-07, which prefers the email — correct for the patient directory it was written for, and
   * wrong here: backlog item 47's contract names `login` as the field the console shows and says of
   * `email` that it is "for correlation, not for display". Item 43 took the same key out of every log
   * line for the same reason. `externalKey` is not a fallback either — for a clinician it is an
   * `accountId`, a UUID, which is item 45's defect one directory along. A row that cannot be named
   * says so in words instead.
   */
  awaitingName(link: IDirectoryLink): string | null {
    return resolveClinicianLogin(link);
  }

  /**
   * Initials for an awaiting row — from the login, never from an id and no longer from the address.
   *
   * A link carrying no login gives an em dash. Deliberately identical in shape to the patient list's,
   * because these two chips sit two clicks apart and the rule they share is that a monogram is a
   * monogram or it is nothing.
   *
   * **A login yields one letter per word it can be split on, which for most logins is one letter.**
   * This javadoc promised "its first letters" until 2026-09-07 and the code has never done that:
   * `kquartey` is one word, so the chip reads `K`. That is the right answer rather than a shortfall
   * — the second character of `kquartey` is `q`, and `Kq` would be a monogram of one name pretending
   * to be a monogram of two. Splitting a login into a forename and a surname is not something this
   * console can do, and guessing is the failure mode this whole chip was rewritten to stop making.
   * The rule is stated as what it is so the next reader does not "fix" it.
   *
   * The `@` split is kept although a login has no domain: it costs one call and it is what stops a
   * login that happens to be an address — which some accounts on the far side are — from monogramming
   * out of the domain.
   */
  awaitingInitials(link: IDirectoryLink): string {
    const identity = this.awaitingName(link);
    if (!identity) {
      return '—';
    }
    const letters = identity
      .split('@')[0]
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0));
    return letters.length > 0 ? letters.join('').toUpperCase() : '—';
  }

  /**
   * Whether phase 2 has arrived for this clinician.
   *
   * The one branch the row's five phase-2 cells share, so "unknown" is decided once rather than five
   * times. See `hasProfileStatus` for why it reads `profileEventAt` and not one of the fields a
   * reader would reach for first.
   */
  hasProfile(link: IDirectoryLink): boolean {
    return hasProfileStatus(link);
  }

  /**
   * One boolean cell's answer: `yes`, `no`, or `unknown`.
   *
   * **The tri-state rule lives here and in one place, because getting it wrong is invisible.** The
   * tempting shape in a template is a truthiness check, and a truthiness check renders `undefined` as
   * "No" — which for `verified` or `complete` means telling an administrator that a clinician's
   * profile is unverified when the truth is that hc-professional has not published its status yet.
   * That is a claim about a person made from the absence of a message: items 27(a) and 46 refuse it
   * for a name, and backlog item 47 refuses it for these two columns in the same terms.
   *
   * @param value the field, where `null`/`undefined` mean the producer did not say.
   * @param reported whether the phase carrying it has arrived at all. Passing
   *                 {@link hasProfile} for a phase-2 field is what keeps "no `ProfileStatus`" and
   *                 "a `ProfileStatus` that omitted this field" reading the same on screen — they are
   *                 the same fact to a reader, and both are unknown.
   */
  tristate(value: boolean | null | undefined, reported = true): 'yes' | 'no' | 'unknown' {
    if (!reported || value === null || value === undefined) {
      return 'unknown';
    }
    return value ? 'yes' : 'no';
  }

  /**
   * The dates the row shows, and **which pair they are**.
   *
   * Both phases carry a `createdDate` and a `modifiedDate` — the account has its own and so does the
   * profile — so the column is ambiguous by construction and the row has to resolve it rather than
   * pick one silently. Backlog item 47: show the profile's when a `ProfileStatus` has been received
   * and the account's when it has not. A clinician with no profile still has a "registered on" date
   * worth showing, and falling back beats a blank cell.
   *
   * **`source` is returned with them and the template renders it.** Showing account dates under a
   * heading a reader takes for profile dates is the failure this exists to avoid, and it is the kind
   * that is never noticed — two plausible dates in the right format, describing the wrong thing.
   *
   * **`firstSeenAt` and `lastEventAt` are deliberately not a third fallback.** Those are when *this
   * service* saw something: they move when the collection is rebuilt from a backfill, and for a
   * subject learned during a replay they are simply not the account's dates. Rendering one under
   * "created" would be item 45's defect with a timestamp instead of an id, so an absent pair stays
   * absent and the cell says nothing.
   */
  awaitingDates(link: IDirectoryLink): { created?: string | null; modified?: string | null; source: 'profile' | 'account' } {
    if (this.hasProfile(link)) {
      return { created: link.profileCreatedDate, modified: link.profileModifiedDate, source: 'profile' };
    }
    return { created: link.accountCreatedDate, modified: link.accountModifiedDate, source: 'account' };
  }

  /**
   * A link's date, in the console's usual medium format, and empty for one that is not there.
   *
   * **Deliberately not `FormatMediumDatePipe`**, which every generated screen uses: that pipe takes a
   * `dayjs.Dayjs`, and it gets one because the generated entity services convert their date fields on
   * the way in. `DirectoryLinkService` does not — it reads the document as it comes off the wire,
   * because a link is a fact about another system rather than an entity this console edits — so these
   * five fields are ISO strings and handing one to that pipe renders nothing at all, silently.
   *
   * The format string matches the pipe's on purpose, so the two read identically on one screen.
   */
  shortDate(value: string | null | undefined): string {
    return value ? dayjs(value).format('D MMM YYYY') : '';
  }

  /** How many are waiting beyond the rows on screen; zero when the panel lists them all. */
  awaitingOverflow(): number {
    return Math.max(0, this.awaitingTotal() - this.awaiting().length);
  }

  ngOnInit(): void {
    this.subscription = combineLatest([this.activatedRoute.queryParamMap, this.activatedRoute.data])
      .pipe(
        tap(([params, data]) => this.fillComponentAttributeFromRoute(params, data)),
        tap(() => this.load()),
      )
      .subscribe();
    this.loadTiles();
    this.loadAwaiting();
  }

  /** The table only — see {@link loadTiles} for why the tiles are not reloaded on every page turn. */
  load(): void {
    this.queryBackend();
  }

  refresh(): void {
    this.load();
    this.loadTiles();
    // The awaiting panel too. It is the part of this screen that changes without anybody here doing
    // anything — a registration on another stack — so Refresh not re-reading it would leave the one
    // list on the page that goes stale by itself.
    this.loadAwaiting();
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

  toggleVerification(verification: keyof typeof VerificationStatus): void {
    void this.router.navigate(['./'], {
      relativeTo: this.activatedRoute,
      queryParams: { page: 1, verification: this.verification() === verification ? null : verification },
      queryParamsHandling: 'merge',
    });
  }

  clearFilter(): void {
    void this.router.navigate(['./'], {
      relativeTo: this.activatedRoute,
      queryParams: { page: 1, role: null, status: null, verification: null },
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
    const verification = params.get(VERIFICATION_PARAM);
    this.verification.set(verification && verification in VerificationStatus ? (verification as keyof typeof VerificationStatus) : null);
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
    const verification = this.verification();
    if (verification) {
      queryObject['verification.equals'] = verification;
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
      verification: this.verification(),
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

  /**
   * The clinicians this service knows about and has no record for.
   *
   * One request, on load and on Refresh — not on a page turn, like the role tiles and for the same
   * reason: it describes the whole directory rather than the page.
   *
   * A failure empties the panel rather than leaving yesterday's rows under a heading that says they
   * are current. That is the honest reading of a failed lookup here, and it differs from the patient
   * list's — there a failed lookup must not overwrite a name the row already had, while here there
   * is nothing to preserve.
   */
  private loadAwaiting(): void {
    this.directoryLinkService.findUnlinked('HC_PROFESSIONAL', AWAITING_ROWS).subscribe({
      next: page => {
        this.awaiting.set(page.links);
        this.awaitingTotal.set(page.total);
      },
      error: () => {
        this.awaiting.set([]);
        this.awaitingTotal.set(0);
      },
    });
  }

  private totalOf(headers: HttpHeaders): number {
    return Number(headers.get(TOTAL_COUNT_RESPONSE_HEADER) ?? 0);
  }
}
