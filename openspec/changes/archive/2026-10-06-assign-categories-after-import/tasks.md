# Tasks

## 1. Run record schema and plumbing

- [x] 1.1 Add `db/migrations/0007_import_runs_categorised.sql` adding `rows_categorised integer NOT NULL DEFAULT 0` to `import_runs`, with a rollback note in the file's header; verify by applying all migrations to a disposable database and reading the new column.
- [x] 1.2 Extend `ImportPlan` and the `startImportRun`/`finishImportRun` calls in `shared/transactions-import.ts` with `rowsCategorised`, persisted to `rows_categorised`; verify `tests/integration/transactions-import.test.ts` asserts the column on a written run and on a failed run.

## 2. Shared matching rule and import assignment

- [x] 2.1 Add `shared/category-assignment.ts` exporting `matchingCategorySql` (the two-tier COALESCE over `t.purpose` and `t.booking_date`, with an optional excluded category identity) and rebuild `RECOMPUTE_ASSIGNMENTS` and `REASSIGN_RETIRING_CATEGORY` in `server/utils/categories.ts` from it; verify the existing create, edit, and delete assignment tests in `tests/integration/api.test.ts` pass unchanged.
- [x] 2.2 In `shared/transactions-import.ts`, take `LOCK TABLE categories IN SHARE MODE` inside the write transaction, insert each new row with `RETURNING id`, run the scoped assignment update over those identities, and return the non-null count as `rowsCategorised` (zero on a dry run); verify with the tests added in 2.3.
- [x] 2.3 Extend `tests/integration/transactions-import.test.ts`: a new row matching an expression and a new row covered by a window are categorised, a row matching nothing stays uncategorised, a row stored before the import keeps the category it had, a dry run assigns nothing, and a write failure leaves no category behind; verify the suite passes against the disposable database.

## 3. CLI and sync surfaces

- [x] 3.1 Update `tools/import-transactions.ts`: the writing report states how many written rows received a category, the usage text no longer claims every imported transaction is uncategorised, and both `finishImportRun` calls pass `rowsCategorised`; verify `npm run import -- --help` shows the updated usage text.
- [x] 3.2 Update `shared/easybank-sync.ts` to pass `plan.rowsCategorised` on success and zero on failure, and extend `tests/integration/easybank-sync.test.ts` to assert a synced row matching a stored category is categorised and the run record holds the count; verify the suite passes against the disposable database.
- [x] 3.3 Update `README.md` so its importer paragraph says a newly imported row is categorised at import time and its migration pointer names `0007_import_runs_categorised.sql`; verify by reading the two statements.

## 4. Import log API and screen

- [x] 4.1 Add `rows_categorised` to the SELECT and `rowsCategorised` to the response in `server/api/imports.get.ts`; verify the import-log tests in `tests/integration/api.test.ts` insert and expect the new field.
- [x] 4.2 Add the categorised count to the `ImportRun` type and a `Categorised` column to `app/pages/imports.vue`; verify `tests/components/imports.test.ts` renders the count for each run.
- [x] 4.3 Update the stubbed run payloads in `tests/browser/imports-sync.spec.ts` and `tests/browser/responsive.spec.ts`; verify `npm run test:browser` passes with headless Chromium.

## 5. Integration verification

- [x] 5.1 Run `npm test` (unit, components, and integration on the disposable database) and verify it passes.
- [x] 5.2 Run the import CLI against a disposable database holding a category that matches a fixture row and verify the written row is categorised and the report states the categorised count.

## Workflow follow-up

- After the change is implemented and verified, archive it with the archive workflow.
