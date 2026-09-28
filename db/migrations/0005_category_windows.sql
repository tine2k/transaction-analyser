-- 0005_category_windows.sql
--
-- Implements the add-category-date-windows change: a category may carry a set of
-- inclusive from/to date windows that assign transactions to it by booking date,
-- but only when no regular expression matches. The windows are held together in
-- one jsonb column on the category's existing row, so a category with several
-- windows is still exactly one row and no dependent table is introduced. Each
-- window is an object {"from":"YYYY-MM-DD","to":"YYYY-MM-DD"} and both endpoints
-- are inclusive.
--
-- The column is added additively with an empty default, so every category that
-- existed before this migration carries no window, no row is rewritten, and no
-- transaction is re-evaluated. Extends 0002_transaction_categories.sql,
-- 0003_category_patterns.sql, and 0004_category_hidden.sql: the id, name,
-- patterns, and hidden columns are untouched.
--
-- Rollback: ALTER TABLE categories DROP COLUMN windows;

ALTER TABLE categories
    ADD COLUMN windows jsonb NOT NULL DEFAULT '[]'::jsonb;
