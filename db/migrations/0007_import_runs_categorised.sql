-- 0007_import_runs_categorised.sql
--
-- Adds the categorised count to the import-log record: the number of newly
-- written rows that received a category when the import evaluated them against
-- the stored categories. A run that wrote no row, or whose rows matched no
-- category, records zero.
--
-- Additive: every existing import_runs row keeps its columns and reads zero
-- categorised, which is accurate because those runs wrote uncategorised rows.
-- transactions and categories are untouched, and no stored transaction is
-- rewritten.
--
-- Rollback: ALTER TABLE import_runs DROP COLUMN rows_categorised;

ALTER TABLE import_runs
    ADD COLUMN rows_categorised integer NOT NULL DEFAULT 0;
