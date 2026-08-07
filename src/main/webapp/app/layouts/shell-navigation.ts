import { IconProp } from '@fortawesome/fontawesome-svg-core';

import { Authority } from 'app/shared/jhipster/constants';

/**
 * The console's navigation, in one place.
 *
 * The sidebar, the bottom tab bar and the topbar breadcrumb all read this
 * array — there is no second list to keep in step. `admin-demo.html`'s NAV
 * const is the source it was transcribed from, group order included.
 *
 * `badge` names a counter the shell resolves at render time rather than a
 * number, because the unread and open-task counts move while the console is
 * open and a literal would go stale.
 */
export type ShellBadge = 'unreadMessages' | 'openTasks';

export interface ShellNavItem {
  /** Router path, without a leading slash. */
  readonly route: string;
  /** i18n key for the link label. */
  readonly label: string;
  readonly icon: IconProp;
  /** i18n key for the group heading this item sits under. */
  readonly group: string;
  readonly badge?: ShellBadge;
  /**
   * Authorities allowed to see the link. Every console route is readable by
   * all three demo roles; write gating happens per-control inside the
   * screens, not here, so this stays open unless a link is admin-only.
   */
  readonly authorities?: readonly string[];
}

export const SHELL_NAVIGATION: readonly ShellNavItem[] = [
  { route: 'dashboard', label: 'global.menu.console.dashboard', icon: 'home', group: 'global.menu.group.operations' },
  {
    route: 'message-desk',
    label: 'global.menu.console.messageDesk',
    icon: 'envelope',
    group: 'global.menu.group.operations',
    badge: 'unreadMessages',
  },
  { route: 'duty-roster', label: 'global.menu.console.dutyRoster', icon: 'calendar-alt', group: 'global.menu.group.operations' },
  {
    route: 'task-board',
    label: 'global.menu.console.taskBoard',
    icon: 'clipboard-list',
    group: 'global.menu.group.operations',
    badge: 'openTasks',
  },

  { route: 'patient', label: 'global.menu.console.patients', icon: 'user', group: 'global.menu.group.directory' },
  { route: 'professional', label: 'global.menu.console.professionals', icon: 'stethoscope', group: 'global.menu.group.directory' },
  { route: 'vendor', label: 'global.menu.console.vendors', icon: 'truck-fast', group: 'global.menu.group.directory' },

  { route: 'service-plan', label: 'global.menu.console.servicePlans', icon: 'shield-halved', group: 'global.menu.group.catalogue' },
  { route: 'category', label: 'global.menu.console.catalog', icon: 'folder-open', group: 'global.menu.group.catalogue' },
  { route: 'platform-health', label: 'global.menu.console.platformHealth', icon: 'gauge-high', group: 'global.menu.group.catalogue' },

  { route: 'organisation-profile', label: 'global.menu.console.organisation', icon: 'building', group: 'global.menu.group.account' },

  // JHipster's stock admin screens, adopted into the console rather than left
  // unreachable. They are the only entries that name an authority: the routes
  // themselves are already guarded by `data.authorities` in admin.routes.ts,
  // and a link that always 403s is worse than no link.
  {
    route: 'admin/health',
    label: 'global.menu.admin.health',
    icon: 'heart',
    group: 'global.menu.group.administration',
    authorities: [Authority.ADMIN],
  },
  {
    route: 'admin/metrics',
    label: 'global.menu.admin.metrics',
    icon: 'chart-line',
    group: 'global.menu.group.administration',
    authorities: [Authority.ADMIN],
  },
  {
    route: 'admin/configuration',
    label: 'global.menu.admin.configuration',
    icon: 'cogs',
    group: 'global.menu.group.administration',
    authorities: [Authority.ADMIN],
  },
  {
    route: 'admin/logs',
    label: 'global.menu.admin.logs',
    icon: 'file-lines',
    group: 'global.menu.group.administration',
    authorities: [Authority.ADMIN],
  },
];

/**
 * The five-item bottom bar shown under 940px — the sidebar's first five
 * destinations, exactly as the prototype's TABS const has them.
 */
export const SHELL_TAB_ROUTES: readonly string[] = ['dashboard', 'message-desk', 'duty-roster', 'patient', 'organisation-profile'];

export const SHELL_TABS: readonly ShellNavItem[] = SHELL_TAB_ROUTES.map(route => SHELL_NAVIGATION.find(item => item.route === route)!);

/**
 * The topbar's "New" quick-add menu. Each entry routes straight at a
 * generated entity's create form — the console adds no bespoke create
 * screens of its own.
 */
export interface QuickAddItem {
  readonly route: string;
  readonly label: string;
  readonly icon: IconProp;
}

export const QUICK_ADD: readonly QuickAddItem[] = [
  { route: '/patient/new', label: 'global.menu.quickAdd.patient', icon: 'user-plus' },
  { route: '/professional/new', label: 'global.menu.quickAdd.professional', icon: 'user-doctor' },
  { route: '/vendor/new', label: 'global.menu.quickAdd.vendor', icon: 'truck-fast' },
  { route: '/task/new', label: 'global.menu.quickAdd.task', icon: 'clipboard-list' },
  { route: '/service-activity/new', label: 'global.menu.quickAdd.serviceActivity', icon: 'layer-group' },
];

/** Only an administrator may reach the quick-add menu at all. */
export const QUICK_ADD_AUTHORITIES: readonly string[] = [Authority.ADMIN];
