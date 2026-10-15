-- 0009_transactions_manual_category.sql
--
-- Implements the manual-category-assignment capability: a per-transaction flag
-- recording that the transaction's category reference was chosen by hand. The
-- flag is storage metadata beside the category reference, not a domain element:
-- it decides only whether the rule-driven re-evaluation may overwrite the
-- reference.
--
-- The column is added additively with a false default, so every transaction that
-- existed before this migration is unpinned and no row is rewritten. The check
-- encodes the invariant the write surface maintains: a pinned transaction always
-- names a category, because clearing the assignment is what unpins it. Extends
-- 0002_transaction_categories.sql: the category_id column is untouched.
--
-- Rollback: ALTER TABLE transactions DROP CONSTRAINT transactions_category_locked_check;
--           ALTER TABLE transactions DROP COLUMN category_locked;

ALTER TABLE transactions
    ADD COLUMN category_locked boolean NOT NULL DEFAULT false,
    ADD CONSTRAINT transactions_category_locked_check
        CHECK (NOT category_locked OR category_id IS NOT NULL);
