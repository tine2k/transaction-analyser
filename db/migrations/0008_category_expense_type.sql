-- 0008_category_expense_type.sql
--
-- Implements the add-category-expense-type change: a category carries an optional
-- expense type, `recurring` or `one-time`, that classifies its spending for the
-- analysis views. The type is not part of category membership: a classified
-- category matches transactions exactly as an unclassified one does.
--
-- The column is added additively and is nullable: every category that existed
-- before this migration carries no expense type and reads as unset, no row is
-- rewritten, and no transaction is re-evaluated. The check limits the stored
-- values to the two declared labels; the category management surface validates
-- requests before they reach the database. Extends 0002_transaction_categories.sql,
-- 0003_category_patterns.sql, 0004_category_hidden.sql, and 0005_category_windows.sql:
-- the id, name, patterns, hidden, and windows columns are untouched.
--
-- Rollback: ALTER TABLE categories DROP COLUMN expense_type;

ALTER TABLE categories
    ADD COLUMN expense_type text
        CONSTRAINT categories_expense_type_check
        CHECK (expense_type IN ('recurring', 'one-time'));
