-- 0010_people.sql
--
-- Implements the person extension: every transaction gets a named owner held by
-- reference, and the import log can record the person a run imported into.
--
-- A person is a stable generated identity and a changeable name. The name is
-- unique ignoring letter case, which is the identity rule the management surface
-- and the imports rely on. `Default` is inserted unconditionally, so a fresh
-- database already has a usable target and every pre-existing transaction has an
-- owner to be backfilled with.
--
-- The backfill is the one intentional rewrite of stored data in this extension:
-- a required reference needs a value, and `Default` is that value. No other
-- column or value on an existing transaction changes. Existing import runs stay
-- unset, because no person can be inferred for a run that never recorded one.
--
-- Rollback: ALTER TABLE import_runs DROP COLUMN person_id;
--           ALTER TABLE transactions DROP COLUMN person_id;
--           DROP TABLE people;

CREATE TABLE people (
    id      bigint GENERATED ALWAYS AS IDENTITY,
    name    text   NOT NULL,
    CONSTRAINT people_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX people_name_lower_key ON people (lower(name));

INSERT INTO people (name) VALUES ('Default');

ALTER TABLE transactions
    ADD COLUMN person_id bigint REFERENCES people(id);

UPDATE transactions
SET person_id = (SELECT id FROM people WHERE name = 'Default');

ALTER TABLE transactions
    ALTER COLUMN person_id SET NOT NULL;

ALTER TABLE import_runs
    ADD COLUMN person_id bigint REFERENCES people(id);

CREATE INDEX transactions_person_id_idx ON transactions (person_id);
