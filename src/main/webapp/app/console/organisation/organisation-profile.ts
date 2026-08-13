import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import dayjs from 'dayjs/esm';
import { RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';
import { map } from 'rxjs';

import { AccountService } from 'app/core/auth/account.service';
import { IAuditEntry } from 'app/entities/platform/audit-entry/audit-entry.model';
import { AuditEntryService } from 'app/entities/platform/audit-entry/service/audit-entry.service';
import { IOrganisation } from 'app/entities/platform/organisation/organisation.model';
import { IAddress, NewAddress } from 'app/entities/directory/address/address.model';
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
   * Every field the Organisation document carries, including the embedded address.
   *
   * None are required. The api marks none of them `@NotNull`, and an organisation that has only
   * been named is a legitimate half-filled record — refusing to save it would make the first save
   * the hardest one, on a screen whose whole purpose is filling this in over time.
   */
  readonly form = new FormGroup({
    name: new FormControl<string | null>(null),
    legalName: new FormControl<string | null>(null),
    description: new FormControl<string | null>(null),
    registrationNumber: new FormControl<string | null>(null),
    tin: new FormControl<string | null>(null),
    foundedOn: new FormControl<string | null>(null),
    switchboard: new FormControl<string | null>(null),
    email: new FormControl<string | null>(null, { validators: [Validators.email] }),
    deskHours: new FormControl<string | null>(null),
    digitalAddress: new FormControl<string | null>(null),
    streetAddress: new FormControl<string | null>(null),
    townDistrict: new FormControl<string | null>(null),
    cityState: new FormControl<string | null>(null),
    region: new FormControl<string | null>(null),
    country: new FormControl<string | null>(null),
  });

  private readonly organisationService = inject(OrganisationService);
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
    this.editing.set(true);
  }

  cancelEditing(): void {
    this.editing.set(false);
    this.saveFailed.set(false);
  }

  save(): void {
    if (this.form.invalid) {
      return;
    }
    this.saving.set(true);
    this.saveFailed.set(false);

    const form = this.form.getRawValue();
    const existing = this.organisation();

    // The address is embedded in the Organisation document rather than referenced, so it is saved
    // with it. Its id is carried through when one exists: dropping it would orphan the stored
    // address and create a second.
    const address: IAddress | NewAddress = {
      id: existing?.address?.id ?? null,
      digitalAddress: form.digitalAddress,
      streetAddress: form.streetAddress,
      townDistrict: form.townDistrict,
      cityState: form.cityState,
      region: form.region,
      country: form.country,
    };
    const hasAddress = Object.entries(address).some(([key, value]) => key !== 'id' && value);

    const body = {
      name: form.name,
      legalName: form.legalName,
      description: form.description,
      registrationNumber: form.registrationNumber,
      tin: form.tin,
      foundedOn: form.foundedOn ? dayjs(form.foundedOn) : null,
      switchboard: form.switchboard,
      email: form.email,
      deskHours: form.deskHours,
      address: (hasAddress ? address : null) as IAddress | null,
    };

    const request = existing
      ? this.organisationService.update({ ...existing, ...body })
      : this.organisationService.create({ ...body, id: null });

    request.subscribe({
      next: saved => {
        this.organisation.set(saved);
        this.saving.set(false);
        this.editing.set(false);
      },
      error: () => {
        this.saving.set(false);
        this.saveFailed.set(true);
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
