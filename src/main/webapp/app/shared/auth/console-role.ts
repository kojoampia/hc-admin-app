import { Authority } from 'app/shared/jhipster/constants';

/**
 * The three operator roles the console recognises.
 *
 * `admin-demo.html` expresses these with a `guard()` function that returns
 * early when `S.role === 'sup'`. Here they are real authorities on a real
 * JWT, so the same rule is expressed the JHipster-native way — every mutating
 * control sits behind `*abfHasAnyAuthority="['ROLE_ADMIN']"` — and the
 * read-only supervisor simply never receives that authority.
 */
export const ConsoleAuthority = {
  ADMIN: Authority.ADMIN,
  USER: Authority.USER,
  SUPERVISOR: 'ROLE_SUPERVISOR',
  DESK: 'ROLE_DESK',
} as const;

export type ConsoleRoleKey = 'ops' | 'sup' | 'desk';

export interface ConsoleRole {
  readonly key: ConsoleRoleKey;
  /** i18n key for the full role name, shown on the login form and profile. */
  readonly label: string;
  /** i18n key for the short chip under the sidebar brand. */
  readonly tag: string;
  readonly authorities: readonly string[];
  /** The demo account each role signs in as. */
  readonly login: string;
}

export const CONSOLE_ROLES: readonly ConsoleRole[] = [
  {
    key: 'ops',
    label: 'global.role.ops.label',
    tag: 'global.role.ops.tag',
    authorities: [ConsoleAuthority.ADMIN, ConsoleAuthority.USER],
    login: 'efua.mensah@abofonsa.care',
  },
  {
    key: 'sup',
    label: 'global.role.sup.label',
    tag: 'global.role.sup.tag',
    authorities: [ConsoleAuthority.SUPERVISOR, ConsoleAuthority.USER],
    login: 'supervisor@abofonsa.care',
  },
  {
    key: 'desk',
    label: 'global.role.desk.label',
    tag: 'global.role.desk.tag',
    authorities: [ConsoleAuthority.DESK, ConsoleAuthority.USER],
    login: 'desk@abofonsa.care',
  },
];

export const roleByKey = (key: string | null | undefined): ConsoleRole => CONSOLE_ROLES.find(role => role.key === key) ?? CONSOLE_ROLES[0];

/**
 * Resolve the role from whatever authorities the token actually carries.
 * ROLE_ADMIN wins if present, so an account holding several never resolves
 * to the narrower of them.
 */
export const roleByAuthorities = (authorities: readonly string[] | null | undefined): ConsoleRole => {
  const held = authorities ?? [];
  if (held.includes(ConsoleAuthority.ADMIN)) {
    return roleByKey('ops');
  }
  if (held.includes(ConsoleAuthority.SUPERVISOR)) {
    return roleByKey('sup');
  }
  if (held.includes(ConsoleAuthority.DESK)) {
    return roleByKey('desk');
  }
  return roleByKey('ops');
};
