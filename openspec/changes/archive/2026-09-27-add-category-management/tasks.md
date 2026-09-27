# Tasks

## 1. Category assignment engine (server)

- [x] 1.1 Add a server module (for example `server/utils/categories.ts`) exposing the global recompute query and the delete reassignment query from design.md, running them on the shared pool from `server/utils/db.ts`. Verify against a seeded database with `psql`: create two categories with overlapping patterns, run the recompute, and confirm each transaction holds the smallest matching category id and a transaction that matches nothing holds `NULL`.
- [x] 1.2 Add pattern validation by probing `SELECT '' ~* $1` and name validation (present, non-blank) alongside the assignment module. Verify that the domain model's example `(?i)rewe|edeka` is accepted and that an uncompilable pattern such as `(` is rejected, with no row written.

## 2. Category management API

- [x] 2.1 Add `GET /api/categories`, returning every category as `{ id, name, pattern }` with `id` as a string, ordered by id ascending. Verify with `curl` that it returns a JSON array, including an empty array when `categories` holds no row.
- [x] 2.2 Add `POST /api/categories` taking `{ name, pattern }`, validating, inserting, and running the global recompute in one database transaction, then returning the created category. Verify with `curl` that the created category is stored and listed, and that matching transactions are categorised.
- [x] 2.3 Add `PUT /api/categories/:id` taking `{ name, pattern }`, validating, updating, and re-running the global recompute in one transaction. Verify with `curl` that the name and expression change and that transactions are reassigned to agree with the new expression.
- [x] 2.4 Add `DELETE /api/categories/:id` that reassigns only the transactions referencing the category (excluding it from the candidate set), then deletes it, in one transaction. Verify with `curl` and `psql` that a referenced category can be deleted, that its transactions move to the winning remaining category or become uncategorised, and that no transaction references a missing category.
- [x] 2.5 Map failures to responses: a missing or duplicate name and an uncompilable pattern are client errors (`409`/`400`), an unknown identity is `404`, and a database failure is a `500` with a fixed message that logs only an error code. Verify that no response body or log line contains the database address, user name, password, or connection string.

## 3. Browser category management screen

- [x] 3.1 Add `app/pages/categories.vue` that reads `GET /api/categories` with `useFetch` and lists each category's name and expression. Verify it shows every returned category, a defined "no categories" state when empty, and a distinct "could not be loaded" state when the request fails.
- [x] 3.2 Add the create form (name and expression fields plus a submit control) calling `POST /api/categories` and refreshing the list on success. Verify a created category appears without a manual reload, and a rejected create is reported and does not add a row.
- [x] 3.3 Add editing of an existing category's name and expression calling `PUT /api/categories/:id`, refreshing the list on success. Verify the row shows the new values and a rejected edit is reported without changing the row.
- [x] 3.4 Add a per-category delete control that asks for confirmation, states that transactions may be re-categorised, sends `DELETE /api/categories/:id` only on confirmation, and refreshes the list on success. Verify cancelling sends no request and confirming removes the category.
- [x] 3.5 Ensure no failed write is presented as applied and that the browser evaluates no regular expression. Verify by inspecting the page: matching is done only by the server, and a failed request leaves the list unchanged with an error shown.

## 4. Menu bar and routing

- [x] 4.1 Add a menu bar to `app/layouts/default.vue` with a `NuxtLink` to `/` and a `NuxtLink` to `/categories`, marking the active route, styled with the existing Tailwind classes and adding no dependency. Verify the menu bar appears on both routes and the current screen's link is distinguishable.
- [x] 4.2 Confirm the `/categories` route is served by the browser and that an unknown path still renders the failure page rather than being answered as missing. Verify by loading `/` and `/categories` and an unknown path in a browser.

## 5. Integration verification

- [x] 5.1 Against a seeded database, walk the full flow in a browser: create "Groceries" with an expression matching some purpose lines, confirm the transactions table categorises exactly those rows; edit the expression and confirm reassignment; create a second overlapping category and confirm the smallest identity wins; delete a referenced category and confirm its transactions are reassigned or uncategorised.
- [x] 5.2 Confirm the untouched surfaces still behave as before: `GET /api/transactions` is unchanged, the importer writes uncategorised transactions that stay uncategorised until the next category change, the health endpoint still reports the server up with no database, and no migration file was added or changed.

## Notes

- Verification caveat: tasks 3.1-4.2 and 5.1 were implemented and verified by a production build (`npm run build`), HTTP checks (both routes and an unknown path return the shell), and the full create/edit/overlap/delete flow exercised at the API and database level. Interactive browser verification was not run because no desktop browser was connected to the session; the user accepted this evidence.
