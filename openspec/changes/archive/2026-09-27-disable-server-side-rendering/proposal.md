# Proposal

## Why

Every page is currently rendered on the Nitro server before it is sent: the index route runs `await useFetch` during server rendering, so the transactions table is assembled on the server and delivered as finished HTML. The user wants the interface rendered in the browser instead, so the server is left to answer the API and the page is built by the client after the document arrives. Keeping the current server-rendered path would mean every future screen has to stay server-render-safe, which is not the direction the user wants.

## What Changes

- Render the application in the browser rather than on the server: set `ssr: false` so Nuxt delivers an app shell and the Vue application builds the page on the client.
- Move the index route's data read to the browser: the transactions are still fetched from the same-origin `GET /api/transactions`, but the request and the rendering now happen after the document is delivered, so the rows are no longer present in the delivered document.
- Keep the Nitro server as it is: the same process still serves the application and the API on one origin, `GET /api/health` and `GET /api/transactions` are unchanged, and `GET /api/transactions` still runs its single `SELECT` on the server. Only page rendering moves to the client.
- Keep the build a server that answers at run time rather than a pre-rendered static export. The application is not `nuxt generate`d; a Nitro server is still built and served.
- Serve the application shell for any path. A path that matches no page route or API endpoint is answered with the shell rather than a missing-resource response, so the server never sends a `404` for an unknown path. This is Nuxt's default single-page-application behavior and the simplest option: no server-side guard, no duplicated route list.
- **BREAKING (spec-level)**: replace the `frontend-shell` requirement `The only route is the index route, and it presents the transactions table` with `The only route is the index route, and it is rendered by the browser`. The sentence requiring the table's rows to be present in the delivered document, and the scenario asserting that the document already holds the rows, are replaced by the opposite: the page is assembled by the browser, and the document delivered first carries an app shell rather than rows. The route's identity, its exclusion of invented data, and its prohibition on writing are unchanged.
- **BREAKING (spec-level)**: the `backend-shell` requirement `The API is a health endpoint and a read-only transactions endpoint` changes. Its scenario `Only the named endpoints exist`, which required the server to report that an unmatched `/api` path is a missing resource, now states that such a path is answered by the application shell and reads no row. The API surface is still exactly two endpoints.
- Add no new capability, endpoint, schema, migration, or dependency. The change is one configuration value plus the frontend's move to client-side data fetching.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `frontend-shell`: the requirement `The only route is the index route, and it presents the transactions table` is removed and an added requirement `The only route is the index route, and it is rendered by the browser` takes its place. The requirement and its scenario currently state that the table's rows are present in the delivered document because the route is rendered by the server; the added requirement states the opposite — the route is rendered by the browser and the delivered document carries the app shell that the client fills. The route's identity, its exclusion of invented data, and its prohibition on writing are carried forward unchanged. The unknown-route scenario changes too: the server serves the app shell rather than a missing-resource response, and the browser renders the failure page. No other frontend-shell requirement changes.
- `backend-shell`: the requirement `The API is a health endpoint and a read-only transactions endpoint` changes. Its scenario `Only the named endpoints exist` currently requires the server to report that an unmatched `/api` path is a missing resource; it becomes "no endpoint answers it and no row is read, and the request is answered by the application shell". The requirement also gains a sentence that a path under `/api` matching no endpoint is served the application shell and is not reported as missing. No other backend-shell requirement changes.

## Impact

- **Changed files**: `nuxt.config.ts` gains `ssr: false` in place of `ssr: true`; `app/pages/index.vue`'s data fetch moves from a server-rendered `await useFetch` to a client-side read, and the comment describing server rendering is updated to match.
- **Unchanged**: the running server's data access — `server/api/transactions.get.ts` still runs its single `SELECT` through `server/utils/db.ts` and `server/plugins/database.ts`, and `server/api/health.get.ts` still reports on the server alone. `transaction-read-api`, `transaction-table`, and the `backend-shell` requirements other than the unmatched-path scenario are not modified. The server half does not gain a guard: the app shell is served at any path by the existing SPA fallback.
- **No new dependency**: `ssr: false` is a Nuxt configuration value, not a package. No SPA-only library, router, or state manager is added.
- **Compatibility**: a consumer that relied on a `404` for an unknown path — a request with no JavaScript, a crawler, or a `curl` of `/nonexistent` or `/api/nope` — now receives the application shell with a success status, and the browser assembles either the page or the failure page. A consumer that relied on the transaction rows being in the delivered HTML also receives the shell and no rows. These are the intended effects of the change and are why the `frontend-shell` and `backend-shell` requirements are amended rather than left beside a contradicting server. Any consumer reading `/api/transactions` directly is unaffected.
- **Deferred to later changes**: any decision about a build mode beyond `ssr: false` (for example, whether a static export is ever wanted), and any client-side state or caching policy for the read. Recorded in design.md.
