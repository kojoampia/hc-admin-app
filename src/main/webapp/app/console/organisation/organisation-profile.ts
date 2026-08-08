import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';
import { map } from 'rxjs';

import { AccountService } from 'app/core/auth/account.service';
import { LoginService } from 'app/login/login.service';
import { IAuditEntry } from 'app/entities/platform/audit-entry/audit-entry.model';
import { AuditEntryService } from 'app/entities/platform/audit-entry/service/audit-entry.service';
import { IOrganisation } from 'app/entities/platform/organisation/organisation.model';
import { OrganisationService } from 'app/entities/platform/organisation/service/organisation.service';
import { ITeam } from 'app/entities/platform/team/team.model';
import { TeamService } from 'app/entities/platform/team/service/team.service';
import { FormatMediumDatePipe, FormatMediumDatetimePipe } from 'app/shared/date';
import { TranslateDirective } from 'app/shared/language';
import { CONSOLE_ROLES, ConsoleRole, roleByAuthorities } from 'app/shared/auth/console-role';

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
  imports: [RouterLink, FontAwesomeModule, TranslateDirective, TranslatePipe, FormatMediumDatePipe, FormatMediumDatetimePipe, StatusPill],
})
export default class OrganisationProfile implements OnInit {
  readonly tabs: OrganisationTab[] = ['about', 'address', 'team', 'security', 'audit'];
  readonly roles = CONSOLE_ROLES;

  readonly activeTab = signal<OrganisationTab>('about');
  readonly organisation = signal<IOrganisation | null>(null);
  readonly teams = signal<ITeam[]>([]);
  readonly auditTrail = signal<IAuditEntry[]>([]);
  readonly isSwitching = signal(false);

  private readonly organisationService = inject(OrganisationService);
  private readonly teamService = inject(TeamService);
  private readonly auditEntryService = inject(AuditEntryService);
  private readonly accountService = inject(AccountService);
  private readonly loginService = inject(LoginService);
  private readonly professionalNames = inject(ProfessionalNamesService);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly account = this.accountService.account;

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly currentRole = computed(() => roleByAuthorities(this.account()?.authorities));

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

  /** Supervisors are Professional references, so they arrive as licence numbers. */
  supervisorName(team: ITeam): string {
    return this.professionalNames.nameFor(team.supervisor?.id, team.supervisor?.licenceNumber) || '—';
  }

  selectTab(tab: OrganisationTab): void {
    this.activeTab.set(tab);
  }

  /**
   * Switch role by signing in as that role's account.
   *
   * The password below is a placeholder the login form's shape requires. It was never checked
   * while an in-browser mock resolved the role from the login; against a real gateway it is, so
   * these role buttons only work for accounts the gateway actually holds with that password.
   */
  switchRole(role: ConsoleRole): void {
    if (role.key === this.currentRole().key || this.isSwitching()) {
      return;
    }
    this.isSwitching.set(true);
    this.loginService.login({ username: role.login, password: 'demopassword', rememberMe: false }).subscribe({
      next: () => this.isSwitching.set(false),
      error: () => this.isSwitching.set(false),
    });
  }
}
