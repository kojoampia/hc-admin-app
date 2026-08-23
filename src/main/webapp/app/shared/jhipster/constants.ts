export const MESSAGE_ALERT_HEADER_NAME = 'x-hcadminapp-alert';
export const MESSAGE_ERROR_HEADER_NAME = 'x-hcadminapp-error';
export const MESSAGE_PARAM_HEADER_NAME = 'x-hcadminapp-params';

export const AUTHENTICATION_TOKEN_KEY = 'abf-authenticationToken';

export enum Authority {
  ADMIN = 'ROLE_ADMIN',
  USER = 'ROLE_USER',
  // Seeded by the gateway and enforced by the api's read/write split since the 2026-08 audit. It was
  // absent here for the same reason it was once absent from the api's own AuthoritiesConstants:
  // nothing on this side had needed to name it. The entity route guards do.
  OPERATOR = 'ROLE_OPERATOR',
}
