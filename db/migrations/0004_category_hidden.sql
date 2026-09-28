-- 0004_category_hidden.sql
--
-- Implements the add-hidden-category-flag change: a category carries a hidden flag
-- that takes its transactions out of the analysis views (analytics, monthly totals,
-- monthly average) while leaving them visible in the transactions table. The flag is
-- not part of category membership: a hidden category matches purpose lines and
-- categorises transactions exactly as a visible one does.
--
-- The column is added additively with a false default, so every category that
-- existed before this migration reads as visible and no row is rewritten and no
-- transaction is re-evaluated. Extends 0002_transaction_categories.sql and
-- 0003_category_patterns.sql: the id, name, and patterns columns are untouched.
--
-- Rollback: ALTER TABLE categories DROP COLUMN hidden;

ALTER TABLE categories
    ADD COLUMN hidden boolean NOT NULL DEFAULT false;
