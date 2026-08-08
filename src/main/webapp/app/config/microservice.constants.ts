/**
 * The name hc-admin-service registers in Consul, and therefore the segment the gateway routes on.
 *
 * The gateway's discovery locator publishes `/services/<lower-case-service-id>/**`, so every entity
 * request has to be built as `services/hcadminservice/api/<entity>`. A request to `api/<entity>`
 * reaches the gateway's own surface — authentication, account, user management — and 404s, which is
 * exactly what every console entity screen did before this constant existed.
 *
 * A constant rather than the literal repeated in 22 services, because the failure mode is a typo
 * that looks like working code. `CLAUDE.md` records the first time this went wrong: three names for
 * the same service — `hc-admin-ms`, `admin-service`, `hcadminservice` — disagreed, and every entity
 * call 404ed through the gateway while the login page kept working, which is what made it easy to
 * miss in a smoke test.
 *
 * Not used by the credential service. `Credential` is hc-admin-gateway's `Account`; the admin
 * service deliberately has no such entity, so that one keeps its gateway-relative path.
 */
export const ADMIN_SERVICE = 'hcadminservice';
