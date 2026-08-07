# `core/mock` — the in-browser API

**Delete this folder and the interceptor registration to point the client at a
real `hc-admin-gateway` on :5504. Nothing else in the app knows the API is
mocked.**

That sentence is the whole architectural point of this build. It is worth
keeping true.

## What is here

| File                      | Responsibility                                                             |
| ------------------------- | -------------------------------------------------------------------------- |
| `mock-api.interceptor.ts` | The functional `HttpInterceptorFn`. Resolves `/api/**` before the network. |
| `mock-router.ts`          | Method + URL → handler. Also `/api/dashboard/metrics`.                     |
| `mock-db.ts`              | The seed dataset, ported from `admin-demo.html`.                           |
| `mock-query.ts`           | `page` / `size` / `sort` / `field.operator` and the `Link` header.         |
| `mock-auth.ts`            | `/api/authenticate` and `/api/account`.                                    |

## Why it is shaped this way

The interceptor is registered **last**:

```ts
provideHttpClient(
  withInterceptors([authInterceptor, authExpiredInterceptor, errorHandlerInterceptor, notificationInterceptor, mockApiInterceptor]),
);
```

Every other interceptor keeps running normally. `authInterceptor` still
attaches the bearer token — which is why `/api/account` can read the signed-in
role off the `Authorization` header exactly as a resource server would.
`notificationInterceptor` still reads the `x-hcadminapp-alert` headers the
router emits on create, update and delete. The mock simply never lets the
request reach the network.

It speaks HTTP properly: real `HttpResponse` objects, real headers,
`X-Total-Count` and RFC 5988 `Link` on every list, `201` + `Location` on
create, `404` on a missing id, `204` on delete, `405` on a write to a
`readOnly` collection. Getting that right is what lets every generated
`*.service.ts` and `*-list.component.ts` work with **zero edits** — which is a
review criterion for this build, not an incidental nicety.

## Latency

Responses are delayed by `DEFAULT_MOCK_LATENCY_MS` (120ms) so loading states are
genuinely exercised. Append `?abfLatency=0` to remove the wait for one request;
Cypress runs do this. Component specs cannot append a parameter to a request
the component itself builds, so they override the whole delay through DI:
`{ provide: MOCK_LATENCY, useValue: 0 }`.

## Roles

`POST /api/authenticate` maps the login to a role and issues a JWT-shaped
token carrying the authorities in its `auth` claim:

| Login                       | Authorities                    |
| --------------------------- | ------------------------------ |
| `efua.mensah@abofonsa.care` | `ROLE_ADMIN`, `ROLE_USER`      |
| `supervisor@abofonsa.care`  | `ROLE_SUPERVISOR`, `ROLE_USER` |
| `desk@abofonsa.care`        | `ROLE_DESK`, `ROLE_USER`       |

The token is **shaped** like a JWT but is not signed and nothing verifies it.
There is no server to verify against. It exists so the client's storage,
expiry and interceptor paths run for real. An unrecognised login resolves to
the read-only supervisor, not the administrator — if this is ever pointed at
something unexpected, the safe default is the role that cannot change
anything.

There is no password check. There is no credential store to check against, and
pretending otherwise would imply a security boundary that does not exist.

## Data parity, and its two honest gaps

`mock-db.ts` keeps the prototype's constants verbatim as `DEMO_*` arrays and
then maps them onto the entity model. The two steps are separate so the
literal block can be diffed against `admin-demo.html` line for line.

Two places where this build deliberately does **not** invent data:

1. **Professional profiles carry nulls** for `dateOfBirth`, `sex`, `idType`
   and `idNumber`. The JDL marks them required and the prototype supplies them
   for patients only. Fabricating birthdates and national ID numbers for named
   people to satisfy a validator is worse than a null.
2. **`documents`, `care-activities` and `user-options` are seeded empty.** They
   come from the PDF's entity model; the prototype has no records for them.
   Their generated CRUD screens work — they are simply empty.

The network totals are the same shape of honesty: the console shows
116 patients / 24 professionals / 9 vendors network-wide while loading a
12-record extract, exactly as the prototype does. `GET /api/dashboard/metrics`
serves the totals; the directory headers say "N of 116 accounts loaded in this
extract". No screen fabricates 116 rows.

## State lives for one page load

`mock-db.ts` holds the data in memory. Writes are real for the life of the
page — create a task and it is there when you navigate back — but a **full
reload reseeds it**, because the module is re-evaluated. The prototype behaves
the same way and offers a Reset button for it.

Two consequences worth knowing:

- Cypress specs must not assert persistence across `cy.visit()`. Navigate
  in-app instead; `src/test/javascript/cypress/e2e/console/message-desk.cy.ts`
  does exactly that and says why.
- `cy.intercept('GET', '/api/…')` never fires. The request is resolved inside
  Angular's `HttpClient` and never reaches the network, so there is nothing for
  Cypress to intercept. Assert on rendered output or on stored state.

`POST /api/mock/reset` restores the seed without a reload.

## Going live

1. Delete this folder.
2. Drop `mockApiInterceptor` from the `withInterceptors([...])` array in
   `app/config/app.config.ts`.
3. Restore a dev-server proxy in `proxy.config.mjs` targeting the gateway on
   :5504.

Nothing else changes. If a fourth step ever becomes necessary, something has
leaked out of this folder and should be moved back in.
