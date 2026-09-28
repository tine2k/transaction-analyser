# Tasks

## 1. Database migration

- [x] 1.1 Add `db/migrations/0005_category_windows.sql` adding `windows jsonb NOT NULL DEFAULT '[]'::jsonb` to `categories`, with a rollback note (`ALTER TABLE categories DROP COLUMN windows;`), rewriting no row and re-evaluating no transaction; verify it applies cleanly against the disposable database with `bash tests/run-with-test-database.sh bash -c 'psql "$TEST_DATABASE_URL" -c "\d categories"'` and that the column reads as an empty array for a seeded category.

## 2. Server storage, validation, and assignment

- [x] 2.1 Carry date windows through the category model and input reading in `server/utils/categories.ts`: extend `Category` and the `SELECT`/`INSERT`/`UPDATE` statements with `windows`; add `readWindows` that treats an absent value as no windows, requires an array of objects holding exactly `from` and `to`, requires each a real `YYYY-MM-DD` calendar date (rejecting e.g. `2026-02-30`), requires `from <= to`, and rejects a category carrying neither an expression nor a window; add the database-wide non-overlap check inside the same write transaction, comparing the candidate windows against every other category's stored windows on day intersection and excluding the edited category's own windows. Extend `tests/integration/api.test.ts` to cover create/edit returning `windows` in the stored order, a date-only category, an omitted window list, a malformed date, `from` after `to`, a window overlapping another category's window, a shared endpoint day, adjacent windows accepted, and an edit keeping its own windows; update the existing exact category-object expectations to include `windows`; verify with `npm run test:integration`.

- [x] 2.2 Implement the two-tier assignment in `server/utils/categories.ts`: make `RECOMPUTE_ASSIGNMENTS` pick the smallest-identity category whose `patterns` match the purpose line, falling back by `COALESCE` to the smallest-identity category whose `windows` contain the booking date (`booking_date BETWEEN (w->>'from')::date AND (w->>'to')::date`, `from`/`to` inclusive, value date ignored), and apply the same two-tier rule to `REASSIGN_RETIRING_CATEGORY`; extend `tests/integration/api.test.ts` to cover an expression match beating a covering window, a window deciding when no expression matches, a window on each inclusive endpoint day, a booking date outside the window, the value date not deciding a window, and the smallest identity winning among overlapping stored windows; verify with `npm run test:integration`.

## 3. Category management screen

- [x] 3.1 Add date-window controls to the shared create/edit form in `app/pages/categories.vue`: a windows list with add/remove, each window a native `<input type="date">` for `from` and `to`, blank rows dropped before submitting, an existing category's windows loaded into the form for editing, and a "Windows" count column in the list; extend `tests/components/categories.test.ts` to cover creating a category with a window, creating a date-only category, loading and removing an existing window, the window count column, an omitted window list sending `windows: []`, and a rejected overlap reported without changing the row; verify with `npm run test:components`.

## 4. Integration verification

- [x] 4.1 Run `npm test` to confirm the migration, server validation and two-tier assignment, the API shape, the screen, and the existing unit, component, and integration suites all pass together.
