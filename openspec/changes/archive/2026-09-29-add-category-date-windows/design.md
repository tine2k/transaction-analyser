# Design

## Context

See `proposal.md` for motivation and `specs/` for the observable contract. Today a
category is one row of `categories` carrying `id`, `name`, `patterns text[]`, and
`hidden boolean`; `server/utils/categories.ts` reads, validates, and writes it, and
after every create, edit, or delete runs one global `UPDATE transactions` that sets
each row's `category_id` to the smallest-identity category whose `patterns` match the
purpose line (or null). The category management surface renders coordinates in
`server/api/categories/*.ts`, and `app/pages/categories.vue` is the shared create/edit
form and list. Matching is done by PostgreSQL with the case-insensitive `~*`
operator, and the same engine validates an expression by probing it against the empty
string, so the engine that validates is the engine that evaluates. Three new
behaviours are needed: a category may own a set of inclusive from/to date windows, a
window may only decide a transaction that no expression explains, and windows may not
overlap anywhere in the database.

## Goals / Non-Goals

**Goals:**
- Store a category's date windows on its existing single row, additively, with no
  change to `patterns`, `hidden`, or any `transactions` column.
- Decide assignment in two tiers inside the existing recompute so stored references
  stay consistent, without a second pass or a schema-level overlap constraint.
- Validate windows (shape, real calendar date, ordering, database-wide non-overlap)
  in the same transaction as the write, so a rejected request changes nothing.
- Keep windows full-day and time-zone-free end to end: browser, JSON, and storage all
  carry `YYYY-MM-DD`.

**Non-Goals:**
- No change to the transactions read API, the transaction table, analytics, monthly
  totals, or monthly average: none returns or consumes category windows.
- No change to the `match-count` preview, which stays about regular expressions only.
- No per-window precedence, priority, name, or label beyond `from` and `to`.
- No database constraint enforcing non-overlap; that stays a surface rule, keeping
  the schema structural as `transaction-postgres-schema` requires.
- No time-of-day, time-zone conversion, or "either date" matching.

## Decisions

1. **Store the windows in one `windows jsonb NOT NULL DEFAULT '[]'` column, holding an
   ordered JSON array of `{"from":"YYYY-MM-DD","to":"YYYY-MM-DD"}` objects.** This
   mirrors `patterns` as "all of a category's values in one column on its one row",
   keeps the stored order so the API can return it as entered, and maps directly onto
   the JSON the surface already speaks. A `daterange[]` column was considered because
   its `&&` operator makes overlap detection elegant, but Postgres canonicalises an
   inclusive `[]` range with an exclusive upper bound, so reading `to` back requires
   `upper(w) - 1`; a `daterange` with an exclusive upper bound contradicts the
   spec's inclusive contract. A dependent `category_windows` table was rejected: it
   would break the "exactly one row" guarantee. A `date[]` pair-per-array was rejected
   because parallel arrays are easy to desynchronise.

2. **Assign in two tiers with `COALESCE` over two ordered subqueries in the existing
   recompute.** For each transaction, the first subquery picks the smallest matching
   `patterns` category (or null); the second picks the smallest category whose
   `windows` contain the booking date; `COALESCE` keeps the first non-null. Reading
   the window as `booking_date BETWEEN (w->>'from')::date AND (w->>'to')::date` gives
   inclusive `from`/`to` and tests the booking date alone. This keeps the "smallest
   identity wins" rule in SQL for both tiers, adds no column that ranks categories,
   and short-circuits so a matching expression means no window is consulted. A priority
   column or a union-ordered candidate query was considered and rejected: it would
   store evaluation order, which the schema spec forbids, and would complicate the
   existing per-row update.

3. **Check non-overlap against the stored set inside the write transaction, in SQL.**
   A rejected overlap must not be observable, so the check must share the transaction
   with the insert or update; otherwise two concurrent requests could each pass a
   check and together create an overlap. The query compares the candidate windows
   against `jsonb_array_elements` of every other category's `windows`:

   ```sql
   SELECT EXISTS (
     SELECT 1
     FROM categories c,
          jsonb_array_elements(c.windows) AS existing,
          unnest($1::date[]) AS cand_from
     ...
   )
   ```

   Because the candidate set and the existing set are both inclusive day ranges, two
   windows overlap when `cand_from <= existing_to AND existing_from <= cand_to`. The
   edited category's own windows are excluded, since an edit replaces them. Validating
   after the read but before the write keeps a rejection free of stored change.

4. **Validate window shape and dates in the server, not by a database cast.** The
   existing code validates expressions by probing the engine, but a window's date is
   plain data, not an operator input. `readWindows` accepts an absent value as no
   windows, requires an array of objects holding exactly `from` and `to`, requires
   each to match `^\d{4}-\d{2}-\d{2}$` and to round-trip as a real calendar day
   (rejecting `2026-02-30`), and requires `from <= to`. Storing only validated ISO
   strings is what makes `::date` casts in the recompute and overlap queries safe.
   Letting `$1::date` raise `22008` was considered; it would report a less specific
   error and tie validation to a database round-trip the shape does not need.

5. **Relax "at least one pattern" to "at least one pattern or one window" at the read
   step, not the schema.** `patterns` stays `NOT NULL` and may be empty; `readCategoryInput`
   stops requiring a non-empty list and rejects the request only when both `patterns`
   and `windows` are empty. This is the smallest change that lets `Urlaub` be a
   date-only category while keeping every other validation rule intact.

6. **Use `<input type="date">` for the window controls and drop blank rows on submit.**
   A native date input emits a `YYYY-MM-DD` value with no time component and no
   time-zone shifting, which is exactly the wire format, so the browser still
   evaluates nothing and formats nothing. The shared create/edit form gains a windows
   list with add/remove, blank rows are filtered out before sending (as blank
   expression fields already are), and the list table gains a "Windows" count column
   beside the existing expression count. The `match-count` preview is left unchanged
   because it answers "how many transactions do these expressions match", a question
   windows do not extend.

## Risks / Trade-offs

- [Two windows may still overlap if data predates this rule or is written outside the
  surface] → The recompute keeps the smallest-identity tie-break, so an overlapping
  state still assigns deterministically; the non-overlap rule narrows the common case.
- [`COALESCE` over two correlated subqueries could be slower on large tables] → Both
  subqueries are indexed-adjacent to the existing recompute and run once per category
  change, not per request; if needed, the window expression can be turned into an
  expression index, which the design avoids for now.
- [A `jsonb` column does not enforce the date shape at rest] → The surface validates
  before writing and is the only writer, and the recompute casts to `date`; a malformed
  row would fail loudly rather than assign silently.
- [An edit that changes only the name still re-checks overlap] → Accepted: the check
  excludes the edited category's own windows, so an unchanged valid category passes.
- [The recompute reassigns every transaction on every category change] → This is the
  existing behavior and the spec's rule; windows add a second tier to the same single
  statement rather than a second pass.

## Migration Plan

1. Add `db/migrations/0005_category_windows.sql` adding
   `windows jsonb NOT NULL DEFAULT '[]'::jsonb` to `categories`, with a rollback note
   (`ALTER TABLE categories DROP COLUMN windows;`). It rewrites no row and re-evaluates
   no transaction; every existing category reads as windowless.
2. Deploy the server change with the migration; the API gains `windows` on returned
   categories and accepts it on create and edit, and the recompute gains the window
   tier.
3. Deploy the browser change; the form and list gain window controls and a window
   count.
4. Rollback: revert the server and browser, then drop the `windows` column. No stored
   category or transaction data needs restoring.

## Open Questions

None.
