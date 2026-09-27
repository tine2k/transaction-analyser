# Tasks

## 1. Database migration

- [x] 1.1 Add `db/migrations/0003_category_patterns.sql` that adds `patterns text[]`, backfills every row with `ARRAY[pattern]`, sets the column `NOT NULL`, and drops `pattern`, with a documented rollback that reconstructs `pattern` from `patterns[1]`. Verify by applying it to a seeded database and confirming with `psql` that every category has a one-element `patterns` array holding its former expression, and that `pattern` no longer exists.
- [x] 1.2 Verify the rollback with `psql`: re-add `pattern text`, backfill `pattern = patterns[1]`, drop `patterns`, and confirm each category again carries its original expression.

## 2. Category assignment and validation (server)

- [x] 2.1 Change the `Category` shape in `server/utils/categories.ts` to `{ id, name, patterns: string[] }`, and update `SELECT_CATEGORIES`, `INSERT_CATEGORY`, and `UPDATE_CATEGORY` to read and write the `patterns` column. Verify with `psql` against a seeded database that a category with two expressions is returned with both in `patterns`, in stored order.
- [x] 2.2 Update `RECOMPUTE_ASSIGNMENTS` and `REASSIGN_RETIRING_CATEGORY` so a category matches when any one of its expressions matches, using `EXISTS (SELECT 1 FROM unnest(c.patterns) AS expression WHERE t.purpose ~* expression)` with `ORDER BY c.id LIMIT 1` unchanged. Verify with `psql` that a transaction whose purpose matches only the second of a category's expressions holds that category, and that the smallest matching identity still wins across categories.
- [x] 2.3 Update `readCategoryInput` to accept `patterns` as a non-empty array of strings, rejecting an absent value, a non-array, an empty array, and any non-string element with a 400, and update `assertPatternCompiles` to probe every element with `SELECT '' ~* $1`. Verify with `curl`/`psql` that a list containing an uncompilable expression such as `(` is rejected with no row written, that an empty list is rejected, and that a list containing an empty string is accepted.

## 3. Category management API

- [x] 3.1 Update `GET /api/categories` so each returned object is `{ id, name, patterns }` with `id` as a string and `patterns` as an array of strings, ordered by id ascending. Verify with `curl` that a category with two expressions returns both, and that the listing order is stable across two calls.
- [x] 3.2 Update `POST /api/categories` and `PUT /api/categories/:id` to take `{ name, patterns }`, validate every expression, persist the list, and re-run the recompute in one transaction. Verify with `curl` that a created category carries every expression it was given, that an edit replaces the list, and that matching transactions are categorised by agreement with the new list.
- [x] 3.3 Confirm `DELETE /api/categories/:id` still reassigns only referencing transactions and deleting works with the array column, and that error mapping is unchanged. Verify with `curl` and `psql` that no transaction references a missing category after a delete.

## 4. Browser category management screen

- [x] 4.1 Update `app/pages/categories.vue` to list every expression a category carries and to edit a category through one or more expression inputs with add/remove controls, sending `patterns` on create and edit. Verify a category with several expressions shows all of them, that an expression can be added/removed and saved, and that a rejected create or edit is reported without changing the list.
- [x] 4.2 Confirm the screen still evaluates no regular expression and writes only through `/api/categories`. Verify by inspecting the page and confirming matching is done only by the server.

## 5. Integration verification

- [x] 5.1 Against a seeded database, walk the flow in the browser: create "Groceries" with two expressions that each match different purpose lines and confirm all matching rows are categorised; edit the list to add an expression and confirm reassignment; create a second overlapping category and confirm the smallest identity wins; delete a category and confirm its transactions are reassigned or uncategorised.
- [x] 5.2 Confirm the untouched surfaces still behave as before: `GET /api/transactions` is unchanged, the importer writes uncategorised transactions that stay uncategorised until the next category change, and the health endpoint still reports the server up with no database.

## Notes

- Verification caveat: tasks 4.1, 4.2, 5.1, and 5.2 were verified without an interactive browser,
  because no desktop browser was connected to the session. Evidence used instead: a production
  build (`npm run build`) succeeded, the client bundle contains the multi-expression form, the
  screen writes only through `/api/categories` and evaluates no regular expression (source
  inspection), and the full create/edit/overlap/delete flow was exercised at the HTTP and database
  level against `tximport_scratch` (including the smallest-identity precedence and reassignment on
  delete). The route `/categories` serves the application shell with HTTP 200.

