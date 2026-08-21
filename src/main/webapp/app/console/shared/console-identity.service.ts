import { Injectable, computed, effect, inject, signal } from '@angular/core';

import { AccountService } from 'app/core/auth/account.service';
import { AccountSettingsService } from 'app/account/account-settings.service';
import { IProfile } from 'app/entities/directory/profile/profile.model';

/**
 * Who the console is talking to, by name.
 *
 * <p>Item 15: the dashboard greeted "Good morning Admin" and the sidebar card read `Admin User`,
 * because both took the name off the gateway account — which holds a login and, in the seeded case,
 * a placeholder for a name. The person's real name is in the admin service, on their `Profile`, and
 * `/account` has been reading it by login since item 26 fixed the join key.
 *
 * <p><b>The fallback chain is the substance of this, not the lookup.</b> Production holds no
 * profiles at all, so "read the profile" on its own would replace a wrong name with an empty one.
 * The order is profile → account → login: the best available answer, never a blank, and never a
 * request the screen has to wait on before it can render a greeting.
 *
 * <p>A 404 from the profile read means "this account has no profile", which is the common case and
 * not an error — {@link AccountSettingsService.findProfile} already translates it to `null`.
 */
@Injectable({ providedIn: 'root' })
export class ConsoleIdentityService {
  private readonly accountService = inject(AccountService);
  private readonly accountSettingsService = inject(AccountSettingsService);

  private readonly profile = signal<IProfile | null>(null);

  /**
   * The name to greet, which is a first name or nothing better than the login.
   *
   * "Good morning admin" is poor; "Good morning " is broken, and that is what reading the profile
   * without a fallback produces on a platform whose profiles do not exist yet.
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly firstName = computed(() => {
    const account = this.accountService.account();
    if (!account) {
      return '';
    }
    return this.profile()?.firstName ?? account.firstName ?? account.login;
  });

  /** The sidebar card: the full name where there is one, the login where there is not. */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly displayName = computed(() => {
    const account = this.accountService.account();
    if (!account) {
      return '';
    }
    const person = this.profile();
    const fromProfile = [person?.firstName, person?.lastName].filter(Boolean).join(' ').trim();
    const fromAccount = [account.firstName, account.lastName].filter(Boolean).join(' ').trim();
    return fromProfile || fromAccount || account.login;
  });

  /** Two letters for the avatar, taken from whatever the name above resolved to. */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly initials = computed(() => {
    const name = this.displayName();
    if (!name) {
      return '';
    }
    const words = name.split(/\s+/).filter(Boolean);
    return words.length > 1 ? (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase() : name.slice(0, 2).toUpperCase();
  });

  constructor() {
    // Same shape as ShellCountersService: driven by the account rather than by a screen, so the
    // name is right on whichever screen the session lands on first, and a sign-out does not leave
    // one person's name on the next one's chrome.
    effect(() => {
      const account = this.accountService.account();
      if (!account) {
        this.profile.set(null);
        return;
      }
      this.accountSettingsService.findProfile(account).subscribe({
        next: profile => this.profile.set(profile),
        // A profile that cannot be read is the same as one that does not exist: fall back.
        error: () => this.profile.set(null),
      });
    });
  }
}
