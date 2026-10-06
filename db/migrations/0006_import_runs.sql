-- 0006_import_runs.sql
--
-- Implements the import-log capability: one row for every transaction import that
-- starts, whether it is the nightly Easybank sync, the manual sync command, or the
-- manual CSV import, and whether it writes, runs non-writing, or fails. The row is
-- inserted when the run starts and updated when it ends, so a run that is still
-- going reads as in progress. The counts distinguish what was read, what was
-- already stored, and what was written, which lets a non-writing run report what a
-- writing run would add.
--
-- Additive: transactions and categories are untouched, and no existing row is
-- rewritten. The table is operational history, not part of the Transaction
-- aggregate, so it carries no reference to a transaction.
--
-- Rollback: DROP TABLE import_runs;

CREATE TABLE import_runs (
    id                  bigint GENERATED ALWAYS AS IDENTITY,
    started_at          timestamptz NOT NULL,
    finished_at         timestamptz,
    source              text        NOT NULL,
    non_writing         boolean     NOT NULL,
    outcome             text        NOT NULL,
    rows_read           integer     NOT NULL,
    rows_already_stored integer     NOT NULL,
    rows_written        integer     NOT NULL,
    error               text,
    CONSTRAINT import_runs_pkey PRIMARY KEY (id)
);

CREATE INDEX import_runs_started_at_idx ON import_runs (started_at DESC);
