import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';

import { AccountService } from 'app/core/auth/account.service';
import { LoginService } from 'app/login/login.service';
import HasAnyAuthorityDirective from 'app/shared/auth/has-any-authority.directive';
import { roleByAuthorities } from 'app/shared/auth/console-role';
import { TranslateDirective } from 'app/shared/language';

import { SHELL_NAVIGATION, ShellNavItem } from '../shell-navigation';
import { ShellCountersService } from '../shell-counters.service';
import { ShellStateService } from '../shell-state.service';

/**
 * The console's primary navigation.
 *
 * This is JHipster's generated navbar reworked in place rather than replaced,
 * so it keeps what the generator gives it — `routerLinkActive`,
 * `*abfHasAnyAuthority`, the translate directive and the login service — and
 * changes only its shape: a fixed navy sidebar instead of a top bar. The
 * entity menu that used to live here now hangs off the topbar's quick-add.
 */
@Component({
  selector: 'abf-navbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
  imports: [RouterLink, RouterLinkActive, FontAwesomeModule, HasAnyAuthorityDirective, TranslateDirective, TranslatePipe],
})
export default class Navbar {
  readonly account = inject(AccountService).account;

  private readonly loginService = inject(LoginService);
  private readonly router = inject(Router);
  private readonly shellState = inject(ShellStateService);
  private readonly counters = inject(ShellCountersService);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly isOpen = this.shellState.isSidebarOpen;
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly isCollapsed = this.shellState.isSidebarCollapsed;

  private readonly role = computed(() => roleByAuthorities(this.account()?.authorities));

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly roleTag = computed(() => this.role().tag);
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly roleLabel = computed(() => this.role().label);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly displayName = computed(() => {
    const user = this.account();
    if (!user) {
      return '';
    }
    const full = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    return full || user.login;
  });

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly initials = computed(() => {
    const user = this.account();
    if (!user) {
      return '';
    }
    const parts = [user.firstName, user.lastName].filter((part): part is string => Boolean(part));
    if (parts.length > 0) {
      return parts
        .map(part => part.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return user.login.slice(0, 2).toUpperCase();
  });

  /**
   * The navigation grouped by heading, preserving SHELL_NAVIGATION's order
   * and dropping any item the signed-in account may not reach.
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly groups = computed(() => {
    const authorities = this.account()?.authorities ?? [];
    const visible = SHELL_NAVIGATION.filter(item => !item.authorities || item.authorities.some(a => authorities.includes(a)));

    const grouped: { label: string; items: ShellNavItem[] }[] = [];
    for (const item of visible) {
      const last = grouped.length > 0 ? grouped[grouped.length - 1] : undefined;
      if (last?.label === item.group) {
        last.items.push(item);
      } else {
        grouped.push({ label: item.group, items: [item] });
      }
    }
    return grouped;
  });

  /** Returns the badge count, or null so the template's `@if` drops a zero. */
  badgeFor(item: ShellNavItem): number | null {
    if (!item.badge) {
      return null;
    }
    const count = this.counters.counters()[item.badge] ?? 0;
    return count > 0 ? count : null;
  }

  close(): void {
    this.shellState.closeSidebar();
  }

  logout(): void {
    this.close();
    this.loginService.logout();
    this.router.navigate(['/login']);
  }
}
