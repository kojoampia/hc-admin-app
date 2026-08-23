import { Authority } from 'app/shared/jhipster/constants';

/**
 * Who may reach an entity screen, mirroring what the api already enforces.
 *
 * <p>The api's read/write split gives `ROLE_OPERATOR` `GET` across the whole entity surface and
 * nothing else; `ROLE_ADMIN` gets everything. The gateway mirrors it for `/services/**`. The console
 * did not mirror it at all — `web/` had, and `app/` was generated afterwards without it — so an
 * operator could open a create form, fill it in and discover on save that the server refuses.
 *
 * <p><b>This is defence in depth, not the defence.</b> The boundary is server-side and was never
 * missing; what was missing is the client declining to offer a door that does not open. Anyone
 * tempted to relax these should change the api first — a route guard that disagrees with the server
 * is worse than none, because it teaches the wrong rule.
 */
export const ENTITY_READ_AUTHORITIES: readonly string[] = [Authority.ADMIN, Authority.OPERATOR];

export const ENTITY_WRITE_AUTHORITIES: readonly string[] = [Authority.ADMIN];
