# End-to-end specs

`console/` holds the specs for this build. They sign in through the real form and drive the real
screens against a real gateway.

**They run in CI since 2026-09-05** — `.github/workflows/e2e.yml`, on every push to `main` and every
pull request onto it. Before that they had never run anywhere: `pree2e:headless` invoked
`npm run ci:server:await`, and that script, along with `app:start` and `ci:e2e:server:start`, was
defined nowhere, so `npm run e2e:headless` died in its pre-hook. Backlog item 15 is the record.

## Running them

```bash
# 1. a stack. From the hc-admin-ci checkout, one directory up:
DOCKER_BUILDKIT=1 docker build -f docker/app.Dockerfile --build-context deploycfg=./docker \
  -t hc-admin-app:e2e ../app
APP_IMAGE=hc-admin-app:e2e docker compose -f e2e/compose.yml up -d --wait

# 2. the specs
npm run e2e:headless          # the read-only set
npm run cypress               # interactive, same set

APP_IMAGE=hc-admin-app:e2e docker compose -f e2e/compose.yml down -v
```

`e2e/README.md` in hc-admin-ci is the fuller description. The console lands on `:9000` either way —
that is the port `ng serve` binds and the port the compose file publishes the container on, which is
why `cypress.config.ts`'s `baseUrl` needs no override and the same command works for both.

Against `ng serve` instead (`npm start` in one terminal, `npm run e2e` in another) the specs mostly
pass and prove less: the dev server proxies `/api`, `/management` and `/services` through
`proxy.config.mjs`, a different file from the `web-nginx.conf` that ships, so nothing about the real
edge is exercised. Use it for writing a spec, not for believing one.

## The two spec sets

Every spec declares which set it is in, on a line of its own near the top:

```ts
// e2e-fixture: read-only
// e2e-fixture: mutating
```

`cypress.config.ts` reads those markers and **refuses to run at all** if a spec declares neither,
naming the file. Deliberately not a list in one place: a list is an enumeration somebody has to
remember to extend, and the api's `PaginationIT` is this estate's worked example of one silently
ceasing to cover things.

| Set         | Specs                                                                                                   | Where it may run                      |
| ----------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `read-only` | administration, dashboard, login, navigation, organisation, password-reset, platform-health, responsive | anywhere, including the quality stack |
| `mutating`  | duty-roster, message-desk, task-board                                                                   | a throwaway stack only                |

`read-only` is the default, so the safe thing happens when nobody chose; `ABF_E2E_SPECS=mutating`
selects the other, and `npm run e2e:headless:mutating` is the shorthand. Both print which set they
are running on every invocation.

**The mutating set is not one run.** Cypress runs specs alphabetically, `message-desk.cy.ts` raises a
Task from a thread, and `task-board.cy.ts` asserts the seeded columns hold exactly 5/4/4 cards — so a
single pass over both is red on a pristine stack and reads as a broken task board. `e2e.yml` runs one
spec per stack, recreating the stack between them, which is affordable only because
`deploy/e2e/compose.yml` has no volume. Only `duty-roster.cy.ts` restores what it writes, and even
that cannot give an assignment back its seeded id.

`administration.cy.ts` is in `read-only` by a hair: one case changes a logger level on the gateway,
and it puts the level back through the same screen. Without that it would belong in the other set,
and five admin screens would be out of the gate.

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

## A literal in a spec here is a copy of a fixture

Seven assertions in this folder were fabricated and could not fail until something ran them. Six went
on 2026-09-05 with `administration.cy.ts`'s rewrite — 17 health rows including a `Vendor Gateway`,
`Total: 8` threads, "no backend is running", `There are 10 loggers`, two `springframework` rows, and
a `care.abofonsa.gateway` logger that exists on no stack — and one was `navigation.cy.ts` expecting
`Service Plans` where the screen has always said `Service plans`. The two before them,
`login.cy.ts`'s comma-split claim and `dashboard.cy.ts`'s `116 / 24 / 80%`, are what put item 15 on
the backlog.

So: **derive the expectation from the endpoint the screen reads**, as `dashboard.cy.ts`,
`administration.cy.ts` and `duty-roster.cy.ts` now do, and keep the literals for things a fixture
cannot supply — the relationship between two figures, a label, an absence.
