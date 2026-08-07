import { Injectable, signal } from '@angular/core';

/**
 * Whether the sidebar drawer is open.
 *
 * Under 940px the sidebar becomes an overlay drawer opened from the topbar's
 * menu button and closed by the scrim, a nav link, or Escape. The button and
 * the drawer live in different components, so the flag lives here rather than
 * in either of them.
 */
@Injectable({ providedIn: 'root' })
export class ShellStateService {
  private readonly sidebarOpen = signal(false);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly isSidebarOpen = this.sidebarOpen.asReadonly();

  openSidebar(): void {
    this.sidebarOpen.set(true);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  toggleSidebar(): void {
    this.sidebarOpen.update(open => !open);
  }
}
