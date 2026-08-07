import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';

import { SHELL_TABS, ShellNavItem } from '../shell-navigation';
import { ShellCountersService } from '../shell-counters.service';

/**
 * The bottom tab bar shown under 940px, where the sidebar has become a
 * drawer. It carries the same five destinations as the sidebar's first five
 * and reads them from the same array, so the two cannot drift.
 */
@Component({
  selector: 'abf-tabbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tabbar.html',
  styleUrl: './tabbar.scss',
  imports: [RouterLink, RouterLinkActive, FontAwesomeModule, TranslatePipe],
})
export default class Tabbar {
  readonly tabs = SHELL_TABS;

  private readonly counters = inject(ShellCountersService);

  badgeFor(item: ShellNavItem): number | null {
    if (!item.badge) {
      return null;
    }
    const count = this.counters.counters()[item.badge] ?? 0;
    return count > 0 ? count : null;
  }
}
