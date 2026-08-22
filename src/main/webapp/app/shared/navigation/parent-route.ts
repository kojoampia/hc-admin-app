import { SHELL_NAVIGATION } from 'app/layouts/shell-navigation';

/** Where a back link goes, and what it should be called. */
export interface ParentRoute {
  /** Router commands, ready for `routerLink`. */
  readonly commands: string[];
  /** i18n key for the label. */
  readonly label: string;
  /** Interpolation for {@link label}; empty when the label needs none. */
  readonly params: Record<string, string>;
}

/** The trailing segments the generated routes use for an action rather than an identifier. */
const ACTIONS = new Set(['new', 'edit', 'view']);

/**
 * Entity roots with no `:id/view` route, where an edit screen has no record to go back to.
 *
 * <p>`credential` is the gateway's `Account` surfaced read-only — it lists and edits but has no
 * detail screen, so its edit form's parent is the list. Every other generated entity has all three.
 * Checked against the route files rather than assumed; if a second one appears, it belongs here or
 * its back link points at a 404.
 */
const NO_DETAIL_ROUTE = new Set(['credential']);

/**
 * Path prefixes that route children but render nothing themselves.
 *
 * <p>`/admin` is a `loadChildren` parent with no component: navigating to it leaves the shell up and
 * the content area empty. Nothing about a URL says so — it looks exactly like a list route one
 * segment shorter — so it is named here, and a back link that would land on it is dropped instead.
 */
const NOT_A_SCREEN = new Set(['admin']);

/**
 * Where "back" goes from a URL, or `null` when the screen is a navigation destination in its own
 * right and should not offer one.
 *
 * <p><b>The parent, not browser history.</b> History is tempting and wrong here: on a fresh tab, or
 * straight after signing in, the previous entry is the login screen or nothing at all, and after a
 * redirect it can loop. A parent is derivable from the URL, always inside the console, and — the
 * part that matters on a screen an operator uses daily — predictable from looking at it.
 *
 * <p>The rule is the shape the generated routes already have:
 *
 * <ul>
 *   <li>{@code /patient} — a sidebar destination, so no back link at all.
 *   <li>{@code /patient/new} and {@code /patient/p1/view} — back to {@code /patient}.
 *   <li>{@code /patient/p1/edit} — back to {@code /patient/p1/view}, the record being edited.
 *   <li>{@code /message-desk/m1} — a trailing id with no action, so back to {@code /message-desk}.
 * </ul>
 */
export function parentOf(url: string): ParentRoute | null {
  const segments = url
    .split(/[?#]/)[0]
    .split('/')
    .filter(segment => segment.length > 0);

  if (segments.length < 2) {
    return null;
  }

  // A screen reachable from the sidebar is a destination, and a destination is where back goes
  // rather than somewhere it goes from. The five admin screens are two segments long — the sidebar
  // lists `admin/user-management`, not `user-management` — so a rule that counted segments alone
  // offered them a back link to `/admin`, which renders an empty page.
  if (SHELL_NAVIGATION.some(item => item.route === segments.join('/'))) {
    return null;
  }

  const last = segments[segments.length - 1];

  if (last === 'edit' && segments.length >= 3) {
    const root = segments.slice(0, -2);
    const id = segments[segments.length - 2];
    if (!NO_DETAIL_ROUTE.has(root[root.length - 1])) {
      return { commands: ['/', ...root, id, 'view'], label: 'global.action.backToRecord', params: {} };
    }
    return listParent(root);
  }

  if (ACTIONS.has(last)) {
    // `new` sits directly under the root; `view` sits under an id.
    return listParent(last === 'new' ? segments.slice(0, -1) : segments.slice(0, -2));
  }

  // A trailing identifier with no action — the message desk addresses a thread that way.
  return listParent(segments.slice(0, -1));
}

/**
 * The label for a list destination.
 *
 * <p>Read from {@link SHELL_NAVIGATION} so the back link and the sidebar entry cannot come to
 * different conclusions about what a screen is called. Entities with no sidebar entry — addresses,
 * profiles, hubs — fall back to a plain "Back" rather than to a guessed name.
 */
function listParent(root: string[]): ParentRoute | null {
  const path = root.join('/');
  if (NOT_A_SCREEN.has(path)) {
    return null;
  }
  const item = SHELL_NAVIGATION.find(navItem => navItem.route === path);
  return item
    ? { commands: ['/', ...root], label: 'global.action.backTo', params: { name: item.label } }
    : { commands: ['/', ...root], label: 'global.action.back', params: {} };
}
