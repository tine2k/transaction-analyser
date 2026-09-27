-- 0003_category_patterns.sql
--
-- Implements the allow-multiple-category-expressions change: a category holds
-- one or more regular expressions instead of a single one. The existing
-- `pattern` column is replaced by a `patterns` array, so a category carrying
-- several expressions is still exactly one row and no dependent table is
-- introduced. Extends 0002_transaction_categories.sql: the `id` and `name`
-- columns are untouched, and every stored expression is preserved as a
-- one-element array. No transaction is re-evaluated by this migration.
--
-- Rollback:
--   ALTER TABLE categories ADD COLUMN pattern text;
--   UPDATE categories SET pattern = patterns[1];
--   ALTER TABLE categories ALTER COLUMN pattern SET NOT NULL;
--   ALTER TABLE categories DROP COLUMN patterns;

ALTER TABLE categories
    ADD COLUMN patterns text[];

UPDATE categories
    SET patterns = ARRAY[pattern];

ALTER TABLE categories
    ALTER COLUMN patterns SET NOT NULL;

ALTER TABLE categories
    DROP COLUMN pattern;
