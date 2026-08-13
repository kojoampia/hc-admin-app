import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import dayjs from 'dayjs/esm';
import { RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable, map, of, switchMap } from 'rxjs';

import { AccountService } from 'app/core/auth/account.service';
import { IAuditEntry } from 'app/entities/platform/audit-entry/audit-entry.model';
import { AuditEntryService } from 'app/entities/platform/audit-entry/service/audit-entry.service';
import { IOrganisation } from 'app/entities/platform/organisation/organisation.model';
import { IAddress } from 'app/entities/directory/address/address.model';
import { AddressService } from 'app/entities/directory/address/service/address.service';
import { OrganisationService } from 'app/entities/platform/organisation/service/organisation.service';
import { ITeam } from 'app/entities/platform/team/team.model';
import { TeamService } from 'app/entities/platform/team/service/team.service';
import { FormatMediumDatePipe, FormatMediumDatetimePipe } from 'app/shared/date';
import { TranslateDirective } from 'app/shared/language';
import { ConsoleAuthority, roleByAuthorities } from 'app/shared/auth/console-role';

import { ProfessionalNamesService } from '../shared/professional-names.service';
import { StatusPill } from '../shared/status-pill/status-pill';

export type OrganisationTab = 'about' | 'address' | 'team' | 'security' | 'audit';

/**
 * The organisation profile: five tabs over one Organisation record.
 *
 * The Security tab hosts the role switcher. Switching re-authenticates
 * through the normal login path, which re-issues the token and re-renders
 * every `*abfHasAnyAuthority` control on the next tick — the same code path a
 * real sign-in takes, not a local flag that only this screen respects.
 */
/**
 * Ghana Post GPS, as the api spells it: two letters, three digits, four digits.
 *
 * `AB-123-4567`. The api rejects anything else with a bare regex in the message, which tells a user
 * nothing — so the form matches it here and the label carries an example.
 */
/**
 * Turns a JHipster problem response into something worth showing.
 *
 * Field errors first, because they name what to change. The bare `detail` is a fallback and is
 * often "Unexpected runtime exception", which is why it is last rather than first.
 */
function describeSaveError(response: HttpErrorResponse): string | null {
  const problem = response.error as { fieldErrors?: { field: string; message: string }[]; detail?: string } | null;
  const fieldErrors = problem?.fieldErrors;
  if (fieldErrors?.length) {
    return fieldErrors.map(error => `${error.field}: ${error.message}`).join('; ');
  }
  return problem?.detail ?? null;
}

const GHANA_POST_GPS = /^[A-Z]{2}-[0-9]{3}-[0-9]{4}$/;

/**
 * An address is all-or-nothing.
 *
 * Five of the six fields are `@NotNull` on the api's Address — every one except `townDistrict` —
 * so a partly filled address is rejected, and the rejection names fields the user may not have
 * realised were linked. Requiring them together only once the address is being started keeps an
 * organisation with no address at all perfectly valid, which is the common case.
 *
 * The list is `digitalAddress` included. That was missed the first time because the api declares it
 * with three annotations stacked and only the last was read.
 */
function addressValidator(group: AbstractControl): ValidationErrors | null {
  const value = group.value as Record<string, string | null>;
  const parts = ['digitalAddress', 'streetAddress', 'townDistrict', 'cityState', 'region', 'country'];
  const required = ['digitalAddress', 'streetAddress', 'cityState', 'region', 'country'];

  const started = parts.some(field => value[field]);
  if (!started) {
    return null;
  }
  const missing = required.filter(field => !value[field]);
  return missing.length ? { addressIncomplete: missing } : null;
}

@Component({
  selector: 'abf-organisation-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './organisation-profile.html',
  styleUrl: './organisation-profile.scss',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    FontAwesomeModule,
    TranslateDirective,
    TranslatePipe,
    FormatMediumDatePipe,
    FormatMediumDatetimePipe,
    StatusPill,
  ],
})
export default class OrganisationProfile implements OnInit {
  readonly tabs: OrganisationTab[] = ['about', 'address', 'team', 'security', 'audit'];

  readonly activeTab = signal<OrganisationTab>('about');
  readonly organisation = signal<IOrganisation | null>(null);
  readonly teams = signal<ITeam[]>([]);
  readonly auditTrail = signal<IAuditEntry[]>([]);

  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly saveFailed = signal(false);

  /**
   * What the api said, when it said anything useful.
   *
   * The screen used to show only "Could not save", and the api's own message was thrown away — so a
   * 400 naming a field and a 500 naming a broken reference looked identical, and diagnosing one
   * meant reading server logs. JHipster answers with `application/problem+json`, and `fieldErrors`
   * is the part worth reading aloud.
   */
  readonly saveError = signal<string | null>(null);

  /**
   * Every field the Organisation document carries, including the embedded address.
   *
   * The validators mirror the api's constraints exactly, and they are not decoration: a save that
   * omits `legalName` comes back 400 with `error.validation`, and the only thing the user sees is a
   * failure they were given no way to avoid. `name` and `legalName` are `@NotNull`; the size limits
   * are the api's too.
   *
   * The address is required-or-absent rather than partly filled. Four of its fields are `@NotNull`,
   * so an address with only a digital address in it is rejected by the api — see `addressValidator`.
   */
  readonly form = new FormGroup(
    {
      name: new FormControl<string | null>(null, { validators: [Validators.required, Validators.maxLength(80)] }),
      legalName: new FormControl<string | null>(null, { validators: [Validators.required, Validators.maxLength(120)] }),
      description: new FormControl<string | null>(null, { validators: [Validators.maxLength(400)] }),
      registrationNumber: new FormControl<string | null>(null, { validators: [Validators.maxLength(40)] }),
      tin: new FormControl<string | null>(null, { validators: [Validators.maxLength(40)] }),
      foundedOn: new FormControl<string | null>(null),
      switchboard: new FormControl<string | null>(null, { validators: [Validators.maxLength(24)] }),
      email: new FormControl<string | null>(null, { validators: [Validators.email, Validators.maxLength(120)] }),
      deskHours: new FormControl<string | null>(null, { validators: [Validators.maxLength(80)] }),
      digitalAddress: new FormControl<string | null>(null, {
        validators: [Validators.pattern(GHANA_POST_GPS), Validators.maxLength(20)],
      }),
      streetAddress: new FormControl<string | null>(null, { validators: [Validators.maxLength(120)] }),
      townDistrict: new FormControl<string | null>(null, { validators: [Validators.maxLength(60)] }),
      cityState: new FormControl<string | null>(null, { validators: [Validators.maxLength(60)] }),
      region: new FormControl<string | null>(null, { validators: [Validators.maxLength(60)] }),
      country: new FormControl<string | null>(null, { validators: [Validators.maxLength(60)] }),
    },
    { validators: [addressValidator] },
  );

  private readonly organisationService = inject(OrganisationService);
  private readonly addressService = inject(AddressService);
  private readonly teamService = inject(TeamService);
  private readonly auditEntryService = inject(AuditEntryService);
  private readonly accountService = inject(AccountService);
  private readonly professionalNames = inject(ProfessionalNamesService);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly account = this.accountService.account;

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly currentRole = computed(() => roleByAuthorities(this.account()?.authorities));

  /**
   * Only an administrator may edit. Operators reach this screen and read it — the api gives them
   * GET across the whole entity surface and nothing more — so showing them a form whose save would
   * be rejected with a 403 would be worse than showing them none.
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly canEdit = computed(() => {
    this.account();
    return this.accountService.hasAnyAuthority(ConsoleAuthority.ADMIN);
  });

  /** No record yet. Production has none, so this is the state the screen opens in. */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly creating = computed(() => this.organisation() === null);

  ngOnInit(): void {
    this.professionalNames.load();

    this.organisationService
      .query({ page: 0, size: 1 })
      .pipe(map(response => response.body ?? []))
      .subscribe(rows => this.organisation.set(rows[0] ?? null));

    this.teamService
      .query({ page: 0, size: 50, sort: ['name,asc'] })
      .pipe(map(response => response.body ?? []))
      .subscribe(teams => this.teams.set(teams));

    this.auditEntryService
      .query({ page: 0, size: 50, sort: ['occurredAt,desc'] })
      .pipe(map(response => response.body ?? []))
      .subscribe(entries => this.auditTrail.set(entries));
  }

  /** Opens the form on whatever is on file, or an empty one when there is nothing yet. */
  startEditing(): void {
    const org = this.organisation();
    this.form.reset({
      name: org?.name ?? null,
      legalName: org?.legalName ?? null,
      description: org?.description ?? null,
      registrationNumber: org?.registrationNumber ?? null,
      tin: org?.tin ?? null,
      foundedOn: org?.foundedOn ? org.foundedOn.format('YYYY-MM-DD') : null,
      switchboard: org?.switchboard ?? null,
      email: org?.email ?? null,
      deskHours: org?.deskHours ?? null,
      digitalAddress: org?.address?.digitalAddress ?? null,
      streetAddress: org?.address?.streetAddress ?? null,
      townDistrict: org?.address?.townDistrict ?? null,
      cityState: org?.address?.cityState ?? null,
      region: org?.address?.region ?? null,
      country: org?.address?.country ?? null,
    });
    this.saveFailed.set(false);
    this.saveError.set(null);
    this.editing.set(true);
  }

  cancelEditing(): void {
    this.editing.set(false);
    this.saveFailed.set(false);
    this.saveError.set(null);
  }

  save(): void {
    if (this.form.invalid) {
      return;
    }
    this.saving.set(true);
    this.saveFailed.set(false);
    this.saveError.set(null);

    const form = this.form.getRawValue();
    const existing = this.organisation();

    const addressFields = {
      digitalAddress: form.digitalAddress,
      streetAddress: form.streetAddress,
      townDistrict: form.townDistrict,
      cityState: form.cityState,
      region: form.region,
      country: form.country,
    };
    const hasAddress = Object.values(addressFields).some(Boolean);

    const organisationFields = {
      name: form.name,
      legalName: form.legalName,
      description: form.description,
      registrationNumber: form.registrationNumber,
      tin: form.tin,
      foundedOn: form.foundedOn ? dayjs(form.foundedOn) : null,
      switchboard: form.switchboard,
      email: form.email,
      deskHours: form.deskHours,
    };

    /**
     * The address is a `@DBRef`, not an embedded document.
     *
     * That is the whole shape of this method. A referenced address has to exist as its own record
     * before the organisation can point at it — sending one inline fails with "Cannot create a
     * reference to an object with a NULL id", a 500 rather than a validation error. So the address
     * is saved first and the organisation is saved second, holding the stored reference.
     */
    const address$: Observable<IAddress | null> = !hasAddress
      ? of(null)
      : existing?.address?.id
        ? this.addressService.update({ ...existing.address, ...addressFields })
        : this.addressService.create({ ...addressFields, id: null });

    const request = address$.pipe(
      switchMap(address => {
        const body = { ...organisationFields, address };
        return existing
          ? this.organisationService.update({ ...existing, ...body })
          : this.organisationService.create({ ...body, id: null });
      }),
    );

    request.subscribe({
      next: saved => {
        this.organisation.set(saved);
        this.saving.set(false);
        this.editing.set(false);
      },
      error: (response: HttpErrorResponse) => {
        this.saving.set(false);
        this.saveFailed.set(true);
        this.saveError.set(describeSaveError(response));
      },
    });
  }

  /** Supervisors are Professional references, so they arrive as licence numbers. */
  supervisorName(team: ITeam): string {
    return this.professionalNames.nameFor(team.supervisor?.id, team.supervisor?.licenceNumber) || '—';
  }

  selectTab(tab: OrganisationTab): void {
    this.activeTab.set(tab);
  }
}
