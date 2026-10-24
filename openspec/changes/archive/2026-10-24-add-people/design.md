# Design

## Context

See `proposal.md` for the motivation. The current state that shapes this design:

- `transactions` has no owner column. Every row implicitly belongs to the one Easybank Giro account, and the CSV import and the Easybank sync both write into that single undifferentiated set.
- `importRows` in `shared/transactions-import.ts` is the one write path for the CSV import, the nightly sync, the manual sync, and the screen-started sync. Its dedupe identity is six values and its insert does not name an owner.
- `GET /api/transactions` returns every row. The transactions table, the three analytics screens, and the monthly totals cells all fetch that one response and filter or aggregate in the browser.
- `GET /api/imports` returns the run log. Runs have a source and counts, but no owner.
- There is no authentication. A "person" is data, not a user, session, or privacy boundary.
- Migrations are plain SQL files applied at startup by `node-pg-migrate` inside its migration transaction.

## Goals / Non-Goals

**Goals:**

- Make the owner of every transaction an explicit, required, immutable reference.
- Let a second person's statement be imported without colliding with the first person's rows.
- Keep the existing single-request architecture for the transactions table and analytics.
- Make person visible and filterable where the user inspects transactions and spending.
- Keep the write surfaces small: create and rename a person; no delete, no reassignment.

**Non-Goals:**

- Multiple bank accounts per person, or multiple Easybank accounts in one sync.
- Authentication, authorisation, per-person privacy, or per-person access control.
- Deleting or merging people, or reassigning a transaction after import.
- Per-person categories, category rules, or category analytics beyond the person filter.
- Transfer detection or double-count avoidance between people.
- Storing a historical snapshot of a person's name on a transaction or import run.

## Decisions

### D1: Person is a required, immutable owner reference

A transaction carries `person_id` as a non-null foreign key to `people`. The person is the owner of
the transaction; the counterparty stays the inline name and optional account that the current model
already defines. A person is not a bank account, a login, or a counterparty.

The reference is set by the import that creates the row and is never changed through the app. This
keeps the write surface to person create/rename and avoids an audit model. The cost is that a wrong
import is corrected in SQL; that is accepted rather than hidden.

Alternatives considered:

- **Free-text `person` column on `transactions`**: no separate table, but renaming would rewrite every
  row, counts would require a `GROUP BY text`, and typos would fragment the data. Rejected.
- **Bank-account entity**: closer to the original "account" idea, but it does not answer whose
  expenses these are, and the Easybank sync still reads one account. Rejected for this change.
- **Per-person database or schema**: isolates data but multiplies operations and defeats the shared
  views. Rejected.

### D2: The name is the key, and it is case-insensitive

People are addressed by name at the command line and in `EASYBANK_PERSON`. The stored name is
trimmed, preserves the entered display case, and is unique ignoring case. The lookup also ignores
case. Renaming is allowed and immediately changes what every future import must name; it does not
change stored transaction references.

There is no delete. A person created by mistake remains, renamable but permanent. This is deliberate:
deletion would either orphan transactions or force a reassignment feature that contradicts D1.

Alternatives considered:

- **Stable slug or database id as the import key**: safer against renames, but adds a second
  human-facing identifier to a small screen. The loud failure on a renamed name was preferred.
- **Exact-case identity**: allows `Anna` and `anna` as different people. Rejected as an avoidable
  data-quality trap for human names.
- **Delete an empty person / merge people**: useful, but it expands the write surface and the
  recovery story. Deferred.

### D3: One migration creates the person dimension and backfills `Default`

`db/migrations/0010_people.sql`:

1. Create `people` with an identity primary key and a non-null `name`.
2. Create a unique index on `lower(name)` (no extension; `lower()` is sufficient).
3. Insert `Default` unconditionally, so a fresh database has a usable target.
4. Add nullable `transactions.person_id` referencing `people(id)`.
5. Set every existing transaction's `person_id` to `Default`.
6. Make `transactions.person_id` non-null.
7. Add nullable `import_runs.person_id` referencing `people(id)`.
8. Add an index on `transactions(person_id)` for counts, filters, and joins.

The migration runs inside the runner's transaction, so a failure leaves neither the new tables nor a
history entry. The backfill is an intentional exception to the earlier additive category pattern: a
required reference needs a value, and `Default` is that value. No other column or value on an
existing transaction changes.

Rollback is documented in the migration file: drop `import_runs.person_id`, drop
`transactions.person_id`, drop `people`. It loses all attribution and is only for restoring the prior
shape.

### D4: The shared import path resolves and carries the person

`shared/transactions-import.ts` gains a person resolution step and a person parameter on
`importRows`. The fingerprint and the stored-count query include the person, and the insert writes
`person_id`. The run record is created with the resolved person.

```
CSV command --person ─┐
Easybank sync EASYBANK_PERSON ─┼─> resolve existing person (trim, lower(name))
screen-started sync ─┘                 |
                                       v
                             importRows(rows, personId)
                                       |
                          dedupe scoped by person_id
                                       |
                          insert every row with person_id
```

- The CSV command requires `--person`; an absent or unknown person writes no row and records a failed
  run with no person.
- The sync defaults to `Default`; an unknown configured person fails the run loudly and records it.
- The person is never read from a CSV column. The `Account` column remains the counterparty account.
- A dry run resolves the person and classifies only that person's stored rows.

Alternatives considered: a separate import implementation per path (drift, rejected); auto-creating
on an unknown name (typos become people, rejected); leaving dedupe global (the same row for two
people would be silently skipped, rejected).

### D5: Filter options come from the transaction response, not `/api/people`

The transactions table and all three analytics screens derive their person choices from the
`GET /api/transactions` response they already fetch. This preserves the existing "one transaction
request" and "no second data source" requirements and avoids adding a second request to four pages.

Consequence: a person with zero transactions is not offered in those filters, because it has no row
to filter to. Empty people are shown on the People screen, which is the management surface. This is a
deliberate refinement of the earlier "list all people, including empty ones" default: the filter
lists only people it can actually show, while the management view lists everyone.

The People screen itself uses `GET /api/people`, which includes zero-count people and is the only
consumer of that list endpoint.

### D6: The transactions table gains one column, one filter, and a scoped search

- **Column**: `Person`, between `Counterparty account` and `Category`. It renders the current person
  name. It is a value column, so it sorts like the others, with equal values keeping endpoint order.
- **Filter**: `All people` plus each person represented in the response. It is reflected as
  `person=<id>`; an unknown or absent value means all people.
- **Scoping**: selecting a person scopes the category choices, period choices, period default,
  category default, and option counts to that person's rows. This avoids labels that describe the
  whole household while showing one person.
- **Search**: the field becomes "Search transactions" and searches purpose, counterparty name, and
  counterparty account within the selected person. Category and period are paused and disabled; the
  person filter remains active. Clearing the search restores the category and period values within
  the same person.
- **Query**: `person`, `category`, `month`/`year`, `sort`, `direction`, and `q` coexist. Applying a
  filter or sort preserves the others; changing the person clears the selection.
- **Sort/memo**: `person` joins `SORTABLE_COLUMNS`; the row memo and the refresh reconciliation
  compare `person.id` and `person.name`, so a rename re-presents the rows and a no-op refresh does
  not.

Alternative considered: leave the search global and let it override the person too. Rejected because
the screen would silently jump from one person's ledger to the household.

### D7: Analytics get a URL-backed, client-side person filter

Each of `/analytics`, `/monthly-totals`, and `/monthly-average` gains a person select defaulting to
`All people`, with options derived from the returned transactions. The selection is stored as
`?person=<id>` and filters the already-fetched transactions before the existing derivations. It is
independent of the expense-type control (and, on the average screen, the month-count window).

Every chart heading, pie slice, monthly totals cell, and year link carries `person` when one is
selected; with all people selected it carries none. The transaction screen therefore opens with the
same population that produced the clicked figure.

Alternative considered: local state like the expense type. Rejected because person is a scope of the
analysis, not a transient toggle, and the drill-down needs a stable round-trip.

### D8: The People API and screen follow the category management pattern

`GET /api/people` returns every person with `{ id, name, transactionCount }`, ordered by
`lower(name), id`. The count is `count(transactions)` across all time. `POST /api/people` creates and
returns 201. `PUT /api/people/<id>` renames and returns the person. There is no `DELETE` route.

Validation and errors follow `server/utils/categories.ts`: a non-empty trimmed string, `400` for an
invalid name, `409` for a case-insensitive duplicate, `404` for an unknown id, `500` with a fixed
message for anything else. Error responses and logs carry no database address or credential.

The screen at `/people` uses a shared create/edit form in the manner of the category screen: a name
field, a create control, and a per-row control that loads the row into the form for rename, with save
and cancel. It requests only `GET /api/people`; it does not fetch transactions. The count comes from
the endpoint.

### D9: Import runs record the person as a nullable reference

`import_runs.person_id` is nullable so every pre-extension run and every run that never resolved a
person can remain. New runs set the resolved person; a failed resolution records the failure with no
person. The imports API and screen expose `person: { id, name } | null` and render a null as "not
recorded".

The screen shows the person's *current* name, not a name snapshot. A rename therefore changes how old
runs read. This follows D1's reference model and avoids duplicating the name; a historical snapshot
would be a separate audit feature.

### D10: Naming

The table is `people`, the column is `person_id`, the API is `/api/people`, the screen is `/people`,
and the UI term is "Person". The table name follows the existing plural convention while keeping the
singular foreign key readable. The counterparty column keeps its existing "Account" label; the new
column is "Person", so the two roles are not confused.

### D11: Compatibility and tests

- Existing import commands break until they add `--person`. The README and CLI usage are updated.
- A fresh database gets `Default` with zero transactions; a fresh deployment can import immediately
  with `--person Default` or create and name a person first.
- Integration fixtures that insert transactions must insert a person first; the shared test database
  launcher and disposable database rules are unchanged.
- Browser verification uses headless Chromium as the project requires.
- Existing single-person analytics tests remain valid with all people selected; new tests cover
  person scoping, URL reload, and drill-down.

## Risks / Trade-offs

- **A rename breaks `EASYBANK_PERSON` and saved commands.** → The failure is loud (failed run or
  non-zero CLI exit); the README states the update rule; no silent fallback to another person.
- **A wrong import is SQL-only.** → The person column and filter expose the mistake, the import log
  names the person, and the recovery statement is documented. No delete or reassignment is added.
- **A mistyped person is permanent.** → Rename it to something harmless; deletion was explicitly
  rejected. The People screen's count makes an unused person obvious.
- **The migration rewrites `person_id` on every transaction and sets it non-null.** → The table is a
  self-hosted, single-household dataset; the migration runs once at startup. For an unexpectedly
  large table, take a backup and plan a maintenance window; the migration is one transaction.
- **Case-insensitive uniqueness depends on `lower()`.** → It is deterministic for the names in use
  and avoids a new extension. Unicode normalization differences are not merged; that is out of scope.
- **Person filters omit zero-count people.** → The People screen is the complete inventory; the
  filters only offer people with rows, which is what a filter can show.
- **The search is narrower than before.** → The label and paused-filter note state the scope; "All
  people" remains the global mode.
- **Analytics with `All people` are household totals.** → That is the intended combined view; the
  person filter provides the per-person view. Transfers between people are not detected and may be
  counted as spending; transfer handling is out of scope.
- **Old import runs show the current person name.** → Accepted with D9; a historical snapshot would
  be an audit feature.

## Migration Plan

1. Back up the database (`tools/backup-postgres.sh`).
2. Deploy the build; startup applies `0010_people.sql` before serving.
3. Verify: `people` has `Default`, every transaction has a non-null person, and the People screen
   shows `Default` with the expected count.
4. Rename `Default` to the first person's name in the People screen, then set `EASYBANK_PERSON` to
   that name before the next nightly run.
5. Update saved CSV import commands to add `--person <name>`.
6. Create any second person in the People screen before importing their statement.

Rollback: restore the pre-deploy backup, or apply the migration's documented rollback SQL. Both lose
the person attribution added after the deploy.

## Open Questions

None that change the specs or the approach. The deferrable items — delete/merge, historical person
names on runs, transfer detection, and multiple bank accounts per person — are listed as non-goals.
