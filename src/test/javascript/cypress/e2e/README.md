# End-to-end specs

`console/` holds the specs for this build. They sign in through the real form and drive the real
screens against a real gateway.

**They do not run today, and have never run.** `pree2e:headless` invokes `npm run ci:server:await`,
and that script — along with `app:start` and `ci:e2e:server:start`, both referenced by the e2e
scripts — is not defined in `package.json`. `npm run e2e:headless` fails at its pre-hook before
cypress starts. `.github/workflows/ci.yml` records the same gap.

## What they now need

Until 2026-08-08 this build answered `/api/**` from an in-browser mock, so e2e needed no backend at
all. #11 removed it. These specs now need the full local stack — gateway, admin service, and Mongo
behind both — with the backend under `SPRING_PROFILES_ACTIVE=test` for the console's dataset.
`hc-admin-ci`'s `dev/startup.sh` starts exactly that.

That is worth knowing before picking the work up: wiring the three missing scripts was the whole job
when the mock existed, and is now the smaller half of it.

## What was removed, and why

The generator produced three suites that were deleted rather than left permanently red:

| Suite             | Why it was deleted                                                      |
| ----------------- | ----------------------------------------------------------------------- |
| `entity/` (23)    | Seeds fixtures with `cy.request('POST', '/api/profiles', …)`.           |
| `account/`        | Drives the top navbar's account dropdown, and covers register/settings. |
| `administration/` | Drives the same navbar's admin dropdown.                                |

The reason for the entity suites has expired and the suites are worth reconsidering. `cy.request`
issues HTTP from the Cypress process rather than the browser, which the mock could never answer —
every such call came back as `Cannot POST /api/authenticate` in HTML. Against a real gateway that
is an ordinary API call. What stands in the way now is only that those requests must be
authenticated and must carry the `services/hcadminservice/` prefix the generator omits.

`account/` and `administration/` fail for a reason that has not expired: this console replaces
JHipster's top navbar with a sidebar, so `cy.clickOnLoginItem()` and friends have nothing to click,
and there is no register or settings screen here — registration was removed from the gateway
deliberately.

Restore any of them from `git show 91db204 -- src/test/javascript/cypress/e2e`.

The generated entity CRUD is still covered by the Vitest suites, which drive the real entity
services against `HttpTestingController`.

## Running them, once the scripts exist

```bash
npm start          # in one terminal, serves on :9000
npm run e2e        # in another
```

`cypress.config.ts` sets `baseUrl` to `http://localhost:9000`, and its seeded credentials are the
gateway's `dev` profile admin — not the console logins the mock used to accept.
