# Project Overview

This is `hc-admin-app` — the **BridgeCare admin console**, the Angular frontend of the Health Connect admin stack. It is the current UI and the only one: the earlier `hc-admin-dashboard` (`web/`) was archived on 2026-08-11 and is read-only on GitHub.

There is **no Java in this project** — no `pom.xml`, no Maven wrapper. The deployed image is built from `deploy/docker/app.Dockerfile` in the private `hc-admin-ci` repo, not from here.

- Angular **21.2.x**, standalone components throughout, lazy routes
- Selector prefix `abf` (`abf-*` components, `abfCamelCase` directives)
- Talks to a real gateway and only to a real gateway — same-origin, via `proxy.config.mjs` in development and nginx in production
- Domain data comes from `hc-admin-service`; authentication from `hc-admin-gateway`

## Documentation map

| File                                                                 | What it is                                           |
| -------------------------------------------------------------------- | ---------------------------------------------------- |
| `AGENTS.md` (this file)                                              | Working conventions — read first                     |
| [`README.md`](README.md)                                             | Setup and commands, mostly JHipster's generated text |
| `hc-admin.jdl`                                                       | The entity model this project was generated from     |
| `admin-demo.html`                                                    | The design prototype the console is measured against |
| [`.github/copilot-instructions.md`](.github/copilot-instructions.md) | Condensed conventions for Copilot                    |

The authoritative, reasoned guide is **`docs/CLAUDE.md` in the private `hc-admin-doc` repo**, symlinked to the product root as `hc-admin/CLAUDE.md`. This file is the subset that matters while editing code in this repository. Where the two disagree, that one is newer.

`Abofonsa-Admin-JHipster-Prompt.md` is the **original generation brief**. Its checklists describe a console served with an in-browser mock at `:9000`, which is not what was built. Do not execute it as a prompt.

## The five things that cost the most time here

Each of these has actually been got wrong in this repository. They are first because they are cheap to avoid and expensive to discover.

1. **Tests are Vitest, not Jest.** `ng test` is bound to the Vitest builder over `vitest-base.config.ts`. Nothing in JHipster's Jest guidance transfers, and `jest.conf.js` does not exist. Run the whole suite — `npm test` — rather than pointing Vitest at a file: invoked directly it misses `vitest-setup.ts` and every spec fails with `Need to call TestBed.initTestEnvironment() first`, which looks like a broken test and is a broken command. `--filter` matches **test names**, not paths.

2. **`@ngx-translate` is at 18, where `TranslateModule` no longer exists.** Components import `TranslatePipe` and `TranslateDirective` directly — all ~120 of them do. `TranslateModule.forChild()` will not resolve.

3. **The stack is Bootstrap 5 + ng-bootstrap, not Material and not Tailwind.** Neither `@angular/material` nor `tailwindcss` is a dependency. There is no `mat.theme()`, no `tailwind.config.js`. `_bootstrap-variables.scss` is load-bearing — it is how the BridgeCare tokens reach Bootstrap. Guidance written for `web/` or for `hc-professional/web` **inverts** here.

4. **Only one of the two console stylesheets is global.** `global.scss` imports `_console-admin.scss`. `_console-components.scss` is imported **per component**, because Angular scopes component styles. **No generated create/edit component declares a `styleUrl` at all** — so a class those screens need must live in `_console-admin.scss`. Putting it in the other one compiles, lints, type-checks, passes every test, and renders an unstyled column of full-width inputs. It shipped to quality exactly once. `global-styles.spec.ts` pins where `.abf-form` and `.abf-steps` live.

5. **`tsc` is not a sufficient gate.** Unrouted generated files are never type-checked by the test run, so `npx ng build` has to be run as well.

## Architecture and conventions

- **Entity services build URLs through `ApplicationConfigService.getEndpointFor(api, microservice?)`** — never a hardcoded `/services/...` path. Entity services address `getEndpointFor('api/<entity>', ADMIN_SERVICE)`, which resolves to `/services/hcadminservice/api/<entity>`. `credential` is the one deliberate exception and is gateway-relative: it is the gateway's `Account`, read from `/api/account`.
- **There is no `SharedModule`.** Standalone components throughout, 2-space indent, `dayjs` for dates.
- **`core/auth/state-storage.service.ts` is the only file that touches `localStorage` or `sessionStorage`.** Keep it that way rather than adding a storage dependency.
- **Layout classes** are `.abf-shell` / `.abf-sidebar` / `.abf-topbar` / `.abf-tabbar` / `.abf-content` / `.abf-card` / `.abf-grid`. Colour comes from `var(--abf-navy)` and friends, never a hex literal — `content/scss/_hc-tokens.scss` is the single source. **Never put white text on gold** (2.74:1, fails AA).
- **Charts are hand-written SVG** in `shared/viz/` (`abf-line-chart`, `abf-sparkline`, `abf-grouped-bars`, `abf-stacked-bar`, `abf-chart-card`) over `viz-palette.ts`. There is no charting library, and the palette's series colours were validated for lightness band, chroma floor and CVD separation — do not substitute ad-hoc colours.
- **Pagination is `<ngb-pagination>` beside `abf-item-count`** (`shared/pagination/`). Worked examples: `entities/platform/audit-entry/list` and `entities/directory/patient/list`. Two things go with a pager and are easy to miss: drop `refineData` (it re-sorts one page against a sort the server computed over the whole collection), and make `ngOnInit` load unconditionally.
- **A `query()` with no `size` returns 20.** The generated relationship loaders in `*/update/` pass `RELATIONSHIP_OPTIONS_PAGE_SIZE` for exactly this reason: without it a form offers the first 20 of whatever it is choosing from, and nothing reports that the 21st is missing.
- **Filtering is server-side, always.** Directory tiles and status chips send named parameters (`status.equals`, `role.equals`, `verification.equals`) and read their counts from `X-Total-Count`. Counting a page client-side breaks the moment the collection exceeds one page — and looks correct until it does.
- **Route authorities** come from `shared/auth/entity-route-authorities.ts`: `ENTITY_READ_AUTHORITIES` on lists and records, `ENTITY_WRITE_AUTHORITIES` on create and edit. This is defence in depth — **change the api first if you relax it**, because a guard that disagrees with the server teaches the wrong rule.
- **There is no mock API.** No `db.json`, no `npm run mock:api`. The in-browser mock was deleted on 2026-08-08 because a mock-first client renders a complete fabricated directory without making a request — it looks healthy whether or not anything is behind it. To develop against data, run the api with `spring.profiles.active=test`.

### Four shared pieces the generated screens depend on

- `shared/navigation/` — the back link, rendered **once in the topbar**. Its destination is decided by `SHELL_NAVIGATION`, not by counting URL segments, and it carries two named exceptions (`credential` has no `:id/view`; `admin` is a `loadChildren` parent that renders nothing).
- `shared/format/record-label.pipe.ts` — how a record is named in a relationship picker. Prefers a person's name, then name/label/subject, then a readable address, and **falls back rather than blanking**.
- `shared/form/form-wizard.ts` — the state behind the stepwise forms. `next()` refuses on an invalid step; going back is never gated; the rail ticks only steps already passed.
- `.abf-form` in `_console-admin.scss` — the form idiom. See point 4 above for why it is in the global file.

### Where things live

`app/console/` holds the hand-written screens (dashboard, duty-roster, message-desk, organisation, platform-health, task-board, wage-rates). `app/admin/` holds JHipster's admin screens. `app/entities/` holds the generated ones, grouped `catalogue` / `directory` / `operations` / `platform`.

**`QUICK_ADD` is not the place to start an account.** Patient, professional and vendor came off the New menu deliberately — each has an intake behind it, and two end in an account on another stack. The three directories keep their own Create buttons; `shell-navigation.spec.ts` pins both halves.

## Commands

```bash
npm start                 # ng serve --hmr on :4200, proxying to the gateway on :5504
npm test                  # ng test → Vitest with coverage; `pretest` runs lint first
npm run lint / lint:fix
npm run cypress           # interactive; e2e:cypress / e2e:headless for CI
npm run webapp:prod       # production build → target/classes/static/
npm run prettier:format   # ts, html, scss, json, yml, md
npx ng build              # run this too — see point 5 above
```

The Cypress specs under `src/test/javascript/cypress/e2e/console/` are real and run against a live stack.

## Writing tests

- **Assert on the request, and on what the code does with the response.** Several specs here have passed while asserting nothing: a `StreamingResponseBody` needs `asyncDispatch` or MockMvc returns an empty body with a 200; `URL.createObjectURL` does not exist in jsdom, so a download path throws inside a subscriber while the request assertion above it still passes. If a test exercises browser plumbing, stub it explicitly so the path actually runs.
- **Effects run on change detection, not on `setInput`.** A component that loads in an `effect` needs `fixture.detectChanges()` before the assertion.
- **Add every icon a template renders to the spec's `FaIconLibrary`.** A missing icon throws during render, so every test in the file fails on the chrome rather than on its subject.
- **Prefer discovery to enumeration.** A test whose coverage has to be extended by hand silently stops covering things — the api's `PaginationIT` records what that cost.
