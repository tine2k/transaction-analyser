# Design

## Context

See `proposal.md` for motivation. The application is Nuxt 4 with a Nitro server on one origin. Today `nuxt.config.ts` sets `ssr: true`, and `app/pages/index.vue` uses `await useFetch('/api/transactions')` at the top level of `<script setup>`, which runs during server rendering and puts the rows in the delivered document. The server half — the health endpoint, the transactions read endpoint, the shared lazy pool — is independent of how pages are rendered, and its data access is not in scope; only one `backend-shell` scenario about unmatched paths is.

The `frontend-shell` requirement currently being amended is the only spec that ties rendering to the server; the `backend-shell` requirement "The application is not a static export" is about build output, not about `ssr`, and is unaffected as long as a Nitro server is still built. One `backend-shell` scenario is in scope: `Only the named endpoints exist` currently requires an unmatched `/api` path to be reported as a missing resource, which the SPA fallback no longer does.

## Goals / Non-Goals

**Goals:**

- Pages are rendered by the browser, not the server, while the API and its database read stay on the server.
- The build is still a runtime server, so `backend-shell`'s build-output requirement is untouched.
- The change is small and reversible: one configuration value plus the page's data fetch.
- Any path the server does not match to an endpoint or asset is answered with the application shell, and unknown paths are not reported as missing.

**Non-Goals:**

- Removing or restructuring the Nitro server, the API, or the database access.
- A static export / `nuxt generate`, client-side routing changes, a state manager, or a caching layer.
- Any change to the read endpoint's response shape or to the table's columns and presentation.
- Any server-side guard that inspects paths to emit a `404` or to distinguish page routes from unknown ones.

## Decisions

- **Render mode: `ssr: false` in `nuxt.config.ts`, replacing `ssr: true`.** Nuxt's SPA mode delivers the app shell and lets the Vue application build the page in the browser. The Nitro server is still built and still serves the application and the API, so the API remains a server-side read and `backend-shell`'s "not a static export" requirement holds. Alternatives considered: a static export (`nuxt generate`) would drop the runtime server needed by the transactions endpoint and break `backend-shell`, so it is rejected; removing the server entirely would move or delete the API, which the user did not ask for and which is far larger scope.

- **Client-side data fetch: drop the top-level `await` from the index route's `useFetch`.** With `ssr: false` the component is only rendered in the browser, so the fetch is a client request either way. Keeping `await` would suspend the page until the request finishes and would mean the template's `pending` branch never renders; not awaiting lets the existing `pending` and `error` states work as written and keeps the shell visible while the rows load. The request itself — same-origin `GET /api/transactions` — is unchanged, as is the response shape.

- **Comment accuracy: update the page and config comments that describe server rendering.** The reasoning recorded in `app/pages/index.vue` ("runs during server rendering, so the rows are already in the delivered document") and in `nuxt.config.ts` ("Server-rendered, not a static export") would otherwise contradict the change. Comments are kept, reworded to the new mode.

- **Unknown paths: accept Nuxt's SPA fallback, add no guard.** With `ssr: false`, Nitro's catch-all renderer answers every path that no endpoint or asset matches with the application shell, including unmatched `/api/**` paths and unknown page paths. This is the simplest option and the one chosen, so no server middleware, wildcard route, or route rule is added. Alternatives were considered and rejected: a server middleware that emits `404` would have to know the application's page routes, but in SPA mode the server does not have that list — Nuxt's router runs only in the browser — so the guard would either hardcode the route list or intercept paths it should not; a wildcard `/api/**` route would add a route to an API surface the specs keep at exactly two endpoints. The behavior is instead recorded in the specs: `backend-shell`'s unmatched-path scenario and `frontend-shell`'s unknown-route scenario both describe the shell response.

## Risks / Trade-offs

- **A request with no JavaScript, a crawler, or a `curl` of `/` receives the app shell and no rows.** This is the intended effect and is exactly what the amended `frontend-shell` requirement records; it is called out in the proposal's Compatibility note. → Mitigation: none needed for a locally hosted developer tool; the API remains directly readable for any consumer that needs the data without the browser.
- **A brief empty shell before the rows appear.** → Mitigation: the existing template already renders a `pending` state while the request is in flight; not awaiting preserves it.
- **`ssr: false` changes which lifecycle the page code runs in.** Code that assumed a server render (for example, access to server-only values during setup) would break. → Mitigation: the page already carries only presentation logic; the change's tasks include verifying the page renders unchanged apart from the timing of the read.
- **An unmatched path returns the shell with a success status instead of a `404`.** This includes `/api/nope`, which previously returned a JSON `404`, and unknown page paths, which previously returned the server-rendered failure page with `404`. → Trade-off: the failure page is now rendered by the browser, and the status no longer names the path as missing. This is the behavior the user chose and the specs now record; the read and health endpoints are unaffected.

## Migration Plan

1. Set `ssr: false` in `nuxt.config.ts` and update its comment.
2. Remove the top-level `await` from `useFetch` in `app/pages/index.vue` and update its comment.
3. Start the dev server and confirm the delivered document no longer contains the rows, that the rows appear once the browser runs, that an unknown page path and an unmatched `/api` path each return the application shell with no `404`, and that the empty, error, and populated states still behave as the `transaction-table` capability requires.

Rollback: restore `ssr: true` and the `await`; no data or schema is involved, so the change is fully reversible by reverting the two files.

## Open Questions

- Whether a static export is ever wanted for this application, and if so how the transactions endpoint would be served beside it. Deferrable; it does not affect this change.
- Whether the client read should later gain a caching or refetch policy. Deferrable; the current single read on load meets the `transaction-table` requirement.
