-- 0002_transaction_categories.sql
--
-- Implements the transaction-domain-model capability (an optional category on a
-- Transaction) and the transaction-postgres-schema capability (the categories
-- table and the nullable reference from transactions to it). Extends
-- 0001_transactions.sql additively; that file is not modified by this change.
--
-- Rollback: ALTER TABLE transactions DROP COLUMN category_id;
--           DROP TABLE categories;

CREATE TABLE categories (
    id      bigint GENERATED ALWAYS AS IDENTITY,
    name    text   NOT NULL,
    pattern text   NOT NULL,
    CONSTRAINT categories_pkey PRIMARY KEY (id),
    CONSTRAINT categories_name_key UNIQUE (name)
);

ALTER TABLE transactions
    ADD COLUMN category_id bigint REFERENCES categories(id);
