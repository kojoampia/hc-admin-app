import { Injectable, signal } from '@angular/core';

/** Where the collapsed preference is kept. Namespaced so it cannot collide with the auth keys. */
const RAIL_KEY = 'abf.shell.sidebarCollapsed';

/**
 * Two independent pieces of shell state, and they are not the same thing.
 *
 * **Open** is the mobile drawer. Under 940px the sidebar leaves the flow and becomes an overlay
 * opened from the topbar's menu button and closed by the scrim, a nav link, or Escape. It is
 * transient and always starts closed.
 *
 * **Collapsed** is the desktop rail. Above that breakpoint the sidebar is always present, and this
 * decides whether it shows at full width or as a 50px strip of icons. It is a preference, so it
 * survives reloads.
 *
 * Keeping them separate matters. Collapsing on a wide screen must not leave the drawer "open" when
 * the window is narrowed, and opening the drawer on a phone must not silently change a preference
 * that only applies to desktop.
 */
@Injectable({ providedIn: 'root' })
export class ShellStateService {
  private readonly sidebarOpen = signal(false);
  private readonly sidebarCollapsed = signal(readStoredCollapsed());

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly isSidebarOpen = this.sidebarOpen.asReadonly();
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly isSidebarCollapsed = this.sidebarCollapsed.asReadonly();

  openSidebar(): void {
    this.sidebarOpen.set(true);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  toggleSidebar(): void {
    this.sidebarOpen.update(open => !open);
  }

  toggleSidebarCollapsed(): void {
    this.sidebarCollapsed.update(collapsed => {
      const next = !collapsed;
      writeStoredCollapsed(next);
      return next;
    });
  }
}

/**
 * Reading and writing are wrapped because storage throws rather than returning null in two ordinary
 * situations: Safari's private mode, and a browser configured to block site data. A shell that fails
 * to render because it could not remember a sidebar preference would be a poor trade, so a failure
 * here degrades to "expanded, and do not remember" rather than propagating.
 */
function readStoredCollapsed(): boolean {
  try {
    return localStorage.getItem(RAIL_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeStoredCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(RAIL_KEY, String(collapsed));
  } catch {
    // Preference not remembered; the current session still honours the toggle.
  }
}
