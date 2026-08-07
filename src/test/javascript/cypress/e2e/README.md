# End-to-end specs

`console/` holds the specs for this build. They sign in through the real form
and drive the real screens against the in-browser mock API.

## What was removed, and why it could not stay

The generator produced three suites that were deleted rather than left
permanently red:

| Suite             | Why it cannot pass here                                                 |
| ----------------- | ----------------------------------------------------------------------- |
| `entity/` (23)    | Seeds fixtures with `cy.request('POST', '/api/profiles', …)`.           |
| `account/`        | Drives the top navbar's account dropdown, and covers register/settings. |
| `administration/` | Drives the same navbar's admin dropdown.                                |

The entity suites are the structural one. `cy.request` issues HTTP from the
Cypress process straight at the dev server — it never enters the browser, so
it never reaches `mockApiInterceptor`. Against this build every such call gets
`Cannot POST /api/authenticate` back as HTML. That is not a bug to fix: an
API that lives inside the browser cannot be reached from outside it, and
"no data leaves your browser" is the point of the architecture.

`account/` and `administration/` fail for a smaller reason: prompt §4.2
replaces JHipster's top navbar with a sidebar, so `cy.clickOnLoginItem()` and
friends have nothing to click. There is also no register or settings screen in
this console.

The generated entity CRUD is still covered — by the 189 generated Vitest
suites, and by `app/console/**/*.spec.ts`, which drive the real entity
services against the real interceptor.

If this client is ever pointed at a real gateway (see
`app/core/mock/README.md`), restore those suites from
`git show 91db204 -- src/test/javascript/cypress/e2e`.

## Running them

```bash
npm start          # in one terminal, serves on :9000
npm run e2e        # in another
```

`cypress.config.ts` sets `baseUrl` to `http://localhost:9000`.
