-- 0001_transactions.sql
--
-- Implements the transaction-postgres-schema capability: the SQL representation of
-- the Transaction domain model defined by the transaction-domain-model capability.
--
-- Rollback: DROP TABLE transactions;

CREATE TABLE transactions (
    id                   bigint GENERATED ALWAYS AS IDENTITY,
    booking_date         date    NOT NULL,
    value_date           date    NOT NULL,
    amount               numeric NOT NULL,
    purpose              text    NOT NULL,
    counterparty_name    text    NOT NULL,
    counterparty_account text,
    CONSTRAINT transactions_pkey PRIMARY KEY (id),
    CONSTRAINT transactions_amount_check CHECK (amount <> 0)
);
