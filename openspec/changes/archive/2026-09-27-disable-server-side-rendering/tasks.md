# Tasks

## 1. Switch rendering to the browser

- [x] 1.1 In `nuxt.config.ts`, replace `ssr: true` with `ssr: false` and reword the comment so it no longer claims the application is server-rendered. Verify the config loads by starting the dev server (`npm run dev`) and confirming `/` answers with the application shell.
- [x] 1.2 Confirm the build is still a runtime server rather than a static export: run `npm run build` and verify a Nitro server output is produced, then `npm run preview` serves the page and `GET /api/health` on one origin. This keeps `backend-shell`'s "not a static export" requirement satisfied.
- [x] 1.3 Verify the application is served under any path: request an unknown page path (for example `/nonexistent`) and an unmatched `/api` path (for example `/api/nope`) and confirm each is answered with the application shell and not a `404`, and that neither reads a row. This is the behavior the `frontend-shell` unknown-route scenario and the `backend-shell` unmatched-path scenario now require.

## 2. Move the data read to the browser

- [x] 2.1 In `app/pages/index.vue`, remove the top-level `await` from `useFetch('/api/transactions')` and update the comment that describes server rendering. Verify the request is still a same-origin `GET /api/transactions` and the template's `data`, `error`, and `pending` bindings are unchanged.
- [x] 2.2 Verify the delivered document for `/` carries the app shell and not the rows: request the page and confirm no transaction values are present in the initial HTML. Then confirm the rows appear once the browser runs — the behavior the amended `frontend-shell` scenario `The browser assembles the rows` requires. This task carries the check for that spec change.
- [x] 2.3 Verify the `transaction-table` states still hold with the client read: the pending state shows while the request is in flight, a populated response renders one row per transaction in the endpoint's order, an empty response shows the "no transactions" state, and a failed request shows the error state rather than an empty table or stale rows.

## 3. Integration verification

- [x] 3.1 With a reachable database holding transactions, load `/` in the browser and confirm the full list is presented, matching `GET /api/transactions`. This checks the client-rendered table against the unchanged read endpoint end to end.
- [x] 3.2 Confirm the server half is unaffected where it must be: `GET /api/health` still reports the server is up regardless of the database, `GET /api/transactions` still runs its server-side read, and the only two endpoints remain those two — an unmatched `/api` path and an unknown page path are answered by the application shell rather than an endpoint, with no database access. This checks that rendering the pages in the browser did not move any database access to the client.
