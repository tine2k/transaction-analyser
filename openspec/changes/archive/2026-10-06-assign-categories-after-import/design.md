# Design

## Context

See proposal.md - Why. The current state that shapes the approach:

- `shared/transactions-import.ts` is deliberately framework-free and is the single import path for the manual CSV importer, the manual sync command, and the nightly sync task. `importRows` classifies rows against the table, then inserts the surplus inside one `withTransaction` call. `INSERT_SQL` writes no `category_id`.
- `server/utils/categories.ts` owns the matching rule as two SQL statements: the global `RECOMPUTE_ASSIGNMENTS` run by create and edit, and `REASSIGN_RETIRING_CATEGORY` run by delete. Both compute a two-tier `COALESCE` over the category's `patterns` (Postgres `~*`) and `windows` (inclusive booking-date `BETWEEN`), with the smallest `c.id` winning.
- `import_runs` holds `rows_read`, `rows_already_stored`, and `rows_written`; `ImportPlan` mirrors those; `finishImportRun` persists them; `GET /api/imports` and `app/pages/imports.vue` show them.

## Goals / Non-Goals

**Goals:**

- Newly written import rows hold the category the existing matching rule selects, decided against the categories stored at import time.
- Assignment is atomic with the write and scoped to the rows written, so nothing already stored changes.
- One definition of the matching rule serves the category mutations and the import path.
- The categorised count is visible in the CLI report, the run record, and the imports screen.

**Non-Goals:**

- No preview of would-be categories in the dry run. A non-writing run writes nothing, assigns nothing, and records zero categorised; the dry run stays a preview of rows.
- No backfill of transactions imported before this change. They keep the null category until the next category change, which already re-evaluates every transaction.
- No change to the category matching rules themselves, to the category management API, or to the transactions read API.

## Decisions

### Assign inside the import's write transaction, scoped to the inserted rows

`importRows` inserts each new row with `RETURNING id`, collects the identities, and runs one scoped assignment `UPDATE ... WHERE t.id = ANY($1::bigint[])` in the same `withTransaction` call. The update returns `category_id` per row, and the plan's `rowsCategorised` is the count of non-null results. A failure in either statement rolls back the whole unit, satisfying the single-unit requirement.

Alternatives considered:

- **Re-run the global `RECOMPUTE_ASSIGNMENTS` after the import.** Rejected: it would re-evaluate every stored transaction on every import, doing far more work than the requirement allows, and a dry run must not trigger it.
- **Assign in `server/utils/categories.ts`.** Rejected: the CLI and the shared sync do not load Nuxt server utilities, so the behaviour would not reach the manual CSV importer.
- **Compute each row's category before insert and include `category_id` in `INSERT_SQL`.** Rejected: it needs a per-row read before the write and splits the matching across two statements anyway; insert-then-scoped-update keeps the existing insert shape and one assignment statement.

### One matching rule in a shared module

Extract the two-tier `COALESCE` expression into `shared/category-assignment.ts` as `matchingCategorySql(options)`, referencing the row alias `t` and optionally excluding a category identity (`$1`, used by the delete path). `server/utils/categories.ts` builds `RECOMPUTE_ASSIGNMENTS` and `REASSIGN_RETIRING_CATEGORY` from it, and `shared/transactions-import.ts` builds the scoped import update from it. Server code already imports shared modules by relative path (`server/tasks/easybank/sync.ts:11`).

Alternative considered: duplicate the expression in the import module. Rejected: two copies of the matching rule would drift, and a future change to the rule would silently miss one path.

### Serialize the import's assignment against category mutations

The import's write transaction takes `LOCK TABLE categories IN SHARE MODE` before inserting, and releases it at commit. A category create, edit, or delete takes `ROW EXCLUSIVE` on `categories` when it writes, which conflicts with `SHARE`, so the two triggers cannot interleave. Either the category change commits first and the import assigns against the new categories, or the import commits first and the category change's recompute sees the new rows. Without this, a category change that commits after the import's assignment statement but whose recompute ran before the import committed could leave the new rows categorised under the old rules.

Alternatives considered:

- **Accept the race.** Rejected: it would break the guarantee that a category change re-evaluates every stored transaction, and a stale category would persist until the next category change.
- **A transaction-scoped advisory lock taken by both paths.** Rejected as more invasive: it would require editing every category mutation in addition to the import path, while the table lock needs one statement in one place and is released automatically by the existing transaction handling.

### Persist the categorised count on the run record

Add `rows_categorised` to `import_runs` (additive, `NOT NULL DEFAULT 0`), thread it through `ImportPlan`, `finishImportRun`, and the sync/CLI callers, return it as `rowsCategorised` from `GET /api/imports`, and show it as its own column on the imports screen. `startImportRun` keeps inserting zeroes; a failed run keeps recording zero categorised, consistent with zero written.

Alternative considered: derive the count on read from the transactions table. Rejected: the run record is the durable account of what a run did, and the count must survive later category changes that re-evaluate the rows.

### Dry run assigns nothing and previews no categories

The non-writing mode keeps its current shape: it classifies rows and reports what it would write, opens no write transaction, takes no lock, and records zero categorised. A would-be categorised count would require a second read-only matching query and is not needed to decide whether to trust a run.

## Risks / Trade-offs

- [The `SHARE` lock blocks category writes while a large import is writing.] Imports are bounded to a statement window and run briefly; the lock is held only for the insert-and-assign transaction.
- [Refactoring the matching SQL could change assignment behaviour.] The existing integration tests for create, edit, and delete assignment (expression over window, smallest identity, inclusive windows) run unchanged and would catch a drift.
- [Existing `import_runs` rows read zero categorised.] Accurate: those runs wrote uncategorised rows. No backfill is needed.
- [An import of many rows issues one `INSERT` per row plus one scoped update.] The current importer already issues one `INSERT` per row; the update adds one statement per run, not per row.

## Migration Plan

1. Apply `0007_import_runs_categorised.sql` before deploying the new code, so `finishImportRun` finds its column; old code is unaffected by the additive column.
2. Deploy the shared module, import core, CLI, sync, API, and screen changes.
3. Rollback: revert the code, then drop the column; no transaction or category data is touched either way.
