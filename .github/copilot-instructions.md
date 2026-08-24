# Project Guidelines

`AGENTS.md` in the repository root is the full version of this file. This is the condensed set.

## Code Style

- Angular 21, standalone components throughout. **No `SharedModule` exists** — do not create one.
- 2-space indentation; `dayjs` for dates; selector prefix `abf` (`abf-*`, `abfCamelCase`).
- Formatting is Prettier: `npm run prettier:format` covers ts, html, scss, json, yml, md. ESLint via `npm run lint`.

## The traps, in order of how much time they cost

- **Tests are Vitest, not Jest.** `ng test` is bound to the Vitest builder over `vitest-base.config.ts`; `jest.conf.js` does not exist and JHipster's Jest guidance does not transfer. Run `npm test` — invoking Vitest directly on a path misses `vitest-setup.ts` and every spec fails with `Need to call TestBed.initTestEnvironment() first`. `--filter` matches test **names**, not paths.
- **`@ngx-translate` is at 18.** `TranslateModule` no longer exists; import `TranslatePipe` and `TranslateDirective` directly. `TranslateModule.forChild()` will not resolve.
- **Bootstrap 5 + ng-bootstrap — not Material, not Tailwind.** Neither `@angular/material` nor `tailwindcss` is a dependency. `_bootstrap-variables.scss` is load-bearing. Guidance written for the archived `web/` repo, or for `hc-professional/web`, inverts here.
- **`global.scss` imports `_console-admin.scss` only.** `_console-components.scss` is imported per component. Generated create/edit components declare **no `styleUrl`**, so a class they need must live in `_console-admin.scss`. The wrong file compiles, lints, type-checks, passes every test and renders unstyled.
- **Run `npx ng build` as well as `npm test`.** Unrouted generated files are otherwise never type-checked.

## Architecture

- Frontend only — **no Java, no `pom.xml`**. The deployed image is built from `deploy/docker/app.Dockerfile` in the private `hc-admin-ci` repo.
- Requests are same-origin: `proxy.config.mjs` forwards `/api`, `/management` and `/services` in development; nginx does in production.
- **Build URLs with `ApplicationConfigService.getEndpointFor(api, microservice?)`** — never hardcode `/services/...`. Entity services resolve to `/services/hcadminservice/api/<entity>`. `credential` is the deliberate exception and is gateway-relative (`/api/account`).
- `core/auth/state-storage.service.ts` is the **only** file permitted to touch `localStorage` / `sessionStorage`.
- Colour comes from `var(--abf-*)`, never a hex literal; `content/scss/_hc-tokens.scss` is the single source. Never put white text on gold (fails AA).
- Charts are hand-written SVG in `shared/viz/` over `viz-palette.ts`. There is no charting library.
- Pagination is `<ngb-pagination>` beside `abf-item-count`. A `query()` with no `size` returns 20 — pass `RELATIONSHIP_OPTIONS_PAGE_SIZE` in relationship loaders.
- **Filter server-side, always** (`status.equals`, `role.equals`, `verification.equals`), reading counts from `X-Total-Count`. Client-side counting is correct until the collection exceeds one page.
- Route authorities come from `shared/auth/entity-route-authorities.ts`. It is defence in depth — **change the api first if you relax it**.
- **There is no mock API.** To develop against data, run `hc-admin-service` with `spring.profiles.active=test`.

## Layout

`app/console/` — hand-written screens. `app/admin/` — JHipster admin screens. `app/entities/` — generated, grouped `catalogue` / `directory` / `operations` / `platform`. `app/shared/` — navigation, format, form, pagination, sort, viz, auth.

## Writing tests

- Assert on the request **and** on what the code does with the response. Specs here have passed while asserting nothing — a `StreamingResponseBody` needs `asyncDispatch`, and `URL.createObjectURL` does not exist in jsdom, so a download path throws inside a subscriber while the assertion above it still passes.
- Effects run on change detection: call `fixture.detectChanges()` before asserting on effect-loaded state.
- Add every icon a template renders to the spec's `FaIconLibrary`, or the whole file fails on the chrome.
- Prefer discovery to enumeration — a guard whose coverage is maintained by hand silently stops covering things.
