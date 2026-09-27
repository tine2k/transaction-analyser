# Design

## Context

See proposal.md — Why for motivation. The state that shapes this design:

- The repository contains OpenSpec scaffolding, two SQL migrations, and nothing else. There is no application source, no package manifest, no chosen language, no test runner, and no lint configuration. This change is the one that picks a language, and every later application change will inherit that pick — which is the main structural fact here.
- The two existing capabilities are constraints to conform to, not to change. `transaction-domain-model` holds a `Transaction` as seven data elements with a required purpose line, a required counterparty name, an optional counterparty account, two day-precise dates, a signed EUR amount, and an optional category that is never a placeholder. `transaction-postgres-schema` fixes the columns those map to, including `CHECK (amount <> 0)`, five `NOT NULL` columns, a nullable `category_id` foreign key, and a rule that the schema carries no business validation. Nothing this importer does requires a migration, and the absence of one is a deliberate finding rather than a gap.
- `db/migrations/0001_transactions.sql` and `0002_transaction_categories.sql` are plain numbered SQL files with a header comment and a one-line rollback, applied by whatever the user runs, and nothing in the repository applies them. There is no migration tool, so the importer connects with a DSN it is given and does not own the schema.
- The source file is semicolon-delimited with a nine-column header, a German `DD.MM.YYYY` date form, a comma decimal separator, an optional thousands period, and free text that already contains commas and backslashes. The free text is the reason a real CSV reader is needed rather than a split on `;` — the domain model guarantees the purpose line has no structure, so it will eventually contain the delimiter.
- The available runtime is Node 26.10, which executes TypeScript by stripping types with no build step. `pg` is not installed and neither is any CSV library; `psql` 17 is present but no PostgreSQL server is running.
- The prior change's design (D7) set the convention that a migration file is not edited after it is written, and (D4, D8) deliberately left the schema without a natural key and without secondary indexes. Both precedents are load-bearing here and are extended rather than revisited (D7, D9 below).
- Four user decisions shape the work: the importer is written in TypeScript, the counterparty name is the `Name` column verbatim, the `Account` column becomes the counterparty account while `Bank` is ignored, and a run validates every row and writes none if any row is invalid.

## Goals / Non-Goals

**Goals:**

- Land the mapping from the file's nine columns to the aggregate's seven elements as a stated contract, so the later change that applies category patterns and every report built on it read the same data.
- Keep the import indivisible: a run either writes every row of the file or leaves the table byte-for-byte as it was.
- Reach the database without ever passing the amount through a binary floating-point value, so `-33,61` stores as exactly -33.61 and not as -33.609999999999999.
- Introduce the least project machinery that still gets the parsing right: no framework, no ORM, no bundler, no transpiler, and no second runtime.
- Keep the user's financial data out of the repository, both by never requiring the file to be there and by making an accidental copy impossible to commit.

**Non-Goals:**

- Any application, service, endpoint, or UI around the import. This is a script someone runs by hand, once, from a terminal.
- A package manifest shaped for a future application. `package.json` exists because one file needs two dependencies, and it is not a foundation to build on without a change of mind recorded here.
- Categorisation. No pattern is evaluated, no `categories` row is created, and the bank's own `Category` column is discarded (D6).
- Re-run detection, deduplication, or an "is this file already imported" check. The schema has no natural key to check against (D9), and inventing one is the categorisation change's business, not this one's.
- A migration of any kind, a change to either existing spec, or any validation of the counterparty account's format, which the schema spec explicitly leaves to the writing code and which this importer therefore declines to add.
- Importing from stdin, from a directory of files, or on a schedule. One path, one run.
- Reading an encoding other than UTF-8. Recorded as O2 rather than implemented, because guessing wrong is worse than failing loudly.

## Decisions

### D1 — TypeScript on Node's native type stripping, executed directly

`tools/import-transactions.ts`, run as `node tools/import-transactions.ts <file>`, with no build step and no `tsc` in the loop.

*Rationale:* TypeScript was chosen by the user over the Python and pure-SQL options, and this is the way to get it with the least machinery rather than the most. Node 26 executes `.ts` files by erasing the type annotations, so the source that is read is the source that runs and there is no output directory to keep out of version control. That matters more here than usual, because this repository's first build artefact would otherwise be a `dist/` full of the importer's compiled output, which is one more thing to gitignore and one more thing to get stale. The cost is real and is stated in R1: the type annotations are documentation rather than a checked contract, because nothing runs `tsc` to enforce them.

*Alternative considered:* `tsx` as a dev dependency, running the same source. Rejected — it buys type stripping that Node already does, and adds a dependency and a version to keep current. *Alternative considered:* `tsc` with an `outDir` and a `prestart` build. Rejected — the closest thing to conventional practice, and the reason the build artefact exists at all. *Alternative considered:* plain JavaScript with JSDoc types. Not rejected on merit; it was not chosen because the user asked for TypeScript, and it is the fallback if a Node without native stripping ever becomes the target. *Alternative considered:* Python 3 with the standard library's `csv` and `decimal` and a `psql` subprocess. This was the recommendation and it remains the lower-machinery option; it is recorded here rather than argued, and if the Node approach proves troublesome in the apply phase it is the plan to fall back to.

### D2 — Two runtime dependencies: `pg` and a CSV reader, nothing else

`pg` for the database and `csv-parse` for the file. No date library, no decimal library, no validation library, no test framework, no linter, no dotenv.

*Rationale:* each of the two earns its place by replacing code that would otherwise be hand-written and wrong. `csv-parse` handles RFC 4180 quoting, the BOM, and CRLF, which is exactly the case the domain model guarantees will eventually appear: a purpose line with no structure in it will one day contain a semicolon, and a `split(';')` writes that row as two broken ones with no error raised. `pg` handles the connection, parameter binding, and transaction control. Everything else the import needs is in the language already: `Date.UTC` and a days-in-month check for the date format, a regular expression and `String.replace` for the number format, and `Buffer` plus `TextDecoder` for the strict UTF-8 read. A hand-rolled CSV parser and a hand-rolled money type are the two places where "as simple as possible" stops being simple, and both are avoided by picking a library for the one that is hard.

*Alternative considered:* `pg`'s bulk `COPY` instead of a multi-row `INSERT`. Rejected — a personal statement is a few hundred to a few thousand rows, `INSERT` with a parameter array is comfortably fast at that size, and `COPY` would need a second statement to switch the session into copy mode, which is more moving parts than the speed saves. *Alternative considered:* `zod` or `ajv` for row validation. Rejected — the validation here is six format checks and a field count, each of which needs a bespoke error message naming the line, and a schema library would produce messages that do not. *Alternative considered:* `node:sqlite` or a file-based staging area. Rejected — the destination is PostgreSQL and nothing else.

### D3 — The amount stays a string all the way into PostgreSQL

The `Amount` field is normalised textually — a period used as a thousands separator is removed, the comma becomes a period, surrounding whitespace is stripped — and the resulting string is bound as a query parameter. It is never converted to a JavaScript `number`.

*Rationale:* `numeric` is exact and `double precision` is not, and every conversion to a JavaScript number puts the value through a binary float, where `-33,61` becomes `-33.609999999999999`. The `transaction-postgres-schema` spec requires that an amount of -42.75 read back as exactly -42.75, and a double would break that requirement at the boundary rather than in the database. PostgreSQL casts the parameter's text to `numeric` exactly, so the database does the one conversion and it is the conversion that matters. A JavaScript `number` never touches the value.

*Trade-off accepted:* the normalisation is a string operation, so an amount in a format this importer does not recognise becomes an unparseable string rather than a `NaN`, which is the better failure — the row is reported with its line number instead of silently importing as `NaN`. The check that the result is a number is therefore a regular expression on the normalised text, not an `isNaN` test.

*Alternative considered:* parse to a JavaScript `number` and insert. Rejected — this is the specific bug the exact-decimal requirement exists to prevent, and `pg` would serialise the double's shortest round-trip representation, so the damage is invisible at the call site. *Alternative considered:* a `decimal.js` or `big.js` dependency. Rejected — a dependency to avoid a conversion that does not need to happen.

### D4 — Two passes over the file: validate everything, then write everything in one transaction

The file is read and every row is parsed and checked into an in-memory list. Only if that list has no invalid row does the importer open a transaction, write the rows, and commit.

*Rationale:* this is the direct expression of the all-or-nothing requirement, and it gets the "report every invalid row" requirement for free, because reporting is a function of the completed parse rather than of the order rows happen to arrive in. It also means a file with an error never opens a connection at all, which is the behaviour a user wants from a dry run of a statement they are not sure about. The cost is that the whole file is held in memory; at a few thousand rows of free text that is a few megabytes, and the alternative — writing optimistically and rolling back on the first failure — is exactly the shape that produces a partially imported statement nobody notices.

*Alternative considered:* write inside one transaction and roll back on the first rejected row. Rejected — it satisfies atomicity but not "report every invalid row", since a rollback ends the pass at the first failure. *Alternative considered:* write in batches of N. Rejected — a partial-import window with no benefit at this scale.

### D5 — One `INSERT` statement per row, parameters bound, never string-concatenated

Each row is written by its own parameterised `INSERT INTO transactions (booking_date, value_date, amount, purpose, counterparty_name, counterparty_account) VALUES ($1, $2, $3, $4, $5, $6)`, inside the single transaction from D4.

*Rationale:* binding the six values as parameters means a purpose line containing a quote, a semicolon, or a backslash cannot change the statement's meaning, and a free-text field the domain model promises has no structure is precisely the field most likely to contain one. One statement per row rather than a multi-row `INSERT` because the row count is unknown until the parse completes and a generated statement with N placeholder groups is more code than the loop it replaces.

*Trade-off accepted:* N round trips for N rows. A few thousand rows over a local or near-local connection is a second or two, and the run happens once.

*Alternative considered:* building one multi-row `INSERT` from the parsed list. Rejected — the placeholder bookkeeping is not free and the gain is invisible at this scale. *Alternative considered:* `COPY`. Rejected in D2.

### D6 — `category_id` is never written, and the bank's `Category` column is discarded

The insert names six columns and never names `category_id`, so every row is written with no category. The `Category` column is read by the CSV parser and then dropped.

*Rationale:* not naming the column is stronger than naming it as null, because it cannot be changed later without editing this decision, and the reason for the omission is the one the domain model gives. The file's `Category` holds the bank's own classification — `Gastro`, `Überweisung` — which is not a `Category` of this system, whose defining element is a regular expression. Storing it would either need a `categories` row per bank label, inventing categories the user never configured, or would need the label denormalised onto the transaction, which the schema spec forbids in as many words. The domain model also states that configuring a pattern assigns nothing, and applying patterns is a change that has not been made; an import is not that change.

*Alternative considered:* map the bank's `Category` onto a `categories` row created on the fly. Rejected — it fabricates the category set, gives every transaction a category, and makes the later pattern-applying change fight rows it did not create. *Alternative considered:* store the bank label in the purpose line or a new column. Rejected — a schema change to carry a field the domain model has no place for.

### D7 — `Account` maps to the counterparty account, `Bank` is discarded, and the account is not validated

The `Account` field is written to `counterparty_account` as given, trimmed; an empty `Account` is written as SQL null; `Bank` is dropped.

*Rationale:* this was the user's explicit decision and it is a legitimate reading of the column, but it carries a real risk that is recorded in R3 rather than argued away: in this export `Account` and `Bank` appear side by side, which is the shape of "which of my accounts, at which bank", so the value may be the account holder's own account rather than the counterparty's. The schema permits either — the column is optional and unvalidated — so the mapping cannot be wrong in a way the database objects to; it can only be wrong in a way a reader notices later. Deciding it now by inspection rather than by argument is the right order: the first import is the cheapest possible moment to see whether the `Account` column is ever populated, and O1 records that check.

*Alternative considered:* ignore `Account` and leave every counterparty account absent. Rejected — it discards data the user asked to keep, and for a credit transfer the `Account` column is the only structured place the counterparty's IBAN can come from, since the domain model forbids parsing it out of the purpose line. *Alternative considered:* validate it as an IBAN. Rejected — the schema spec explicitly declines that constraint and leaves it to the writing code, but adding it here would be the importer inventing a business rule the project has not decided, and a rejected row would be worse than a stored string that a report can normalise later.

### D8 — Strict UTF-8, a checked header, and a line number for every report

The file is read as bytes and decoded with a decoder that fails on invalid UTF-8 rather than substituting a replacement character. The first line is compared against the expected nine column names, and a mismatch aborts before any row is parsed. Every error the run reports carries a line number that counts the header as line 1 and counts every line break, so the number locates the row in the user's editor.

*Rationale:* the loose default in most runtimes — read the file as a string and let undecodable bytes become `U+FFFD` — is the one that silently stores corrupted text in a financial record, and a purpose line with a mangled umlaut is a bug that surfaces months later with no way to find its cause. Failing the run instead costs one conversion instruction. The header check matters for the same reason: a bank that changes its export layout, or a file that is not a statement at all, must not be half-imported by positional guessing. Line numbers matter because the requirement is to report *every* bad row, and "row 47" is only actionable if it means a line the user can open.

*Trade-off accepted:* a strict decode rejects a genuinely readable ISO-8859-1 export outright rather than importing it with a substituted character. That is the intended behaviour and the error message says so; O2 records what happens if the user's real file is in that encoding.

*Alternative considered:* trusting the header loosely, accepting any nine-column file and mapping by position. Rejected — a reordered or renamed column would fill `counterparty_name` with a bank code and raise no error at all, which is the worst failure this importer could have. *Alternative considered:* default lossy decoding with a warning. Rejected — a warning is not a control, and the data is financial.

### D9 — No re-run guard, no deduplication, and the written count is reported

The importer checks nothing about what the table already holds, and writes every data row the file holds, including rows that are byte-identical to each other. It reports how many rows it read and how many it wrote.

*Rationale:* this is a consequence of the existing schema, not a fresh choice. The `transaction-postgres-schema` spec states that the domain elements SHALL NOT be required to be unique and that no natural-key unique constraint SHALL be added over them, with the reasoning that free text makes a poor key. A guard would therefore have to compare whole rows to decide "already imported", and a comparison of six free-text and date fields produces false positives and false negatives with equal ease: one whitespace difference or one re-typed cent means the statement is re-imported in full. A wrong guard is worse than no guard, because a guard that fires refuses a legitimate import, while a guard that stays silent only misleads someone who ignores the count. The reported count is the honest control, and the requirement to match it against the file's row count makes the check a one-glance comparison.

*Alternative considered:* refuse to run when `transactions` is non-empty. Rejected — a user importing a second statement legitimately hits this, and the failure would be a refusal with no way forward. *Alternative considered:* record a hash of the file in a new table. Rejected — a schema change, a new table, and a lifecycle, for a script that runs once. *Alternative considered:* offer `--skip-duplicates` comparing against existing rows. Rejected — same false-positive problem, and it makes the script's contract depend on a comparison the project has already decided against.

### D10 — A `.gitignore` that excludes CSV files, and no other change to the data's location

A `.gitignore` is added that ignores `*.csv` (and the usual local noise) at the repository root. The importer does not copy, move, or write the source file anywhere.

*Rationale:* the user asked for the imported data not to be part of the repository. Not copying the file is the primary answer, but a statement that a user drops into the project directory to try the command is a realistic accident, and one commit of a bank statement is not a mistake that can be cleanly undone. Ignoring the file extension is broader than needed and costs nothing, since this repository will never contain a CSV it wants to track — the migrations are `.sql` and the specs are `.md`.

*Trade-off accepted:* `.gitignore` cannot protect a file that is already tracked, and a user who runs `git add -f` overrides it. Neither is preventable from here.

*Alternative considered:* place the file outside the tree by convention and document it. Rejected as insufficient on its own; the convention is unverifiable, which is why it is paired with the ignore rule rather than replacing it. *Alternative considered:* read the file from stdin and never accept a path inside the tree. Rejected as a usability regression for a one-shot script, and it would not stop the user from `cp`-ing the file in anyway.

### D11 — The importer is a new capability, and neither existing spec is modified

`transaction-csv-import` is a new capability. Neither `transaction-domain-model` nor `transaction-postgres-schema` gets a delta.

*Rationale:* the prior change's design (D10) had to amend four requirements because a category contradicted them outright. Nothing here does. Every value the import writes is already representable and already permitted: a null `category_id` is the state the schema spec calls uncategorised, an absent `counterparty_account` is explicitly allowed, an exact `numeric` amount is exactly what the column is for, and the purpose line is stored as given, which is what the domain model already requires of it. The one place where this change is *stricter* than the stored row — rejecting a row whose purpose or name is empty, which the database would accept — is a rule about the shape of an input file, not about what a stored transaction may be, and a capability about reading a file is the right place for it. A separate capability also keeps the two concerns separable: the import's mapping can be amended, for instance if a later change decides to parse the merchant out of the purpose line, without touching either the domain model or the schema.

*Alternative considered:* fold the mapping into `transaction-domain-model` as import requirements. Rejected — that capability defines what a `Transaction` *is*, and a `DD.MM.YYYY` date form is not part of that; the moment a bank changes its export the domain model would need editing. *Alternative considered:* no spec at all, on the grounds that this is a script. Rejected — the column mapping is exactly the kind of externally observable, downstream-binding decision the specs exist to record, and three later changes will depend on it.

## Risks / Trade-offs

- **R1 — Type annotations are not enforced, because nothing runs `tsc`.** D1 strips types rather than checking them, so a wrong type in this file is caught by Node only if it is also a runtime error. → Mitigation: the file is small and mostly `string` handling, which is where a type error is least likely to be silent; the annotations still serve the editor and the reader; and adding `typescript` as a dev dependency plus a `typecheck` script is a two-line change that does not affect any requirement, so it is deliberately left out of this change rather than ruled out. Stated here so the omission reads as a decision.
- **R2 — The file is held in memory in full.** D4 needs the complete parse before the first write. → Mitigation: a statement is free text of a few hundred characters per row; a decade of statements is thousands of rows, so the peak is a few megabytes. A file large enough to matter would be many bank-years, and the honest fix would be a staging table and a set-based insert, which is a different tool.
- **R3 — `Account` may be the account holder's own account, not the counterparty's.** D7 takes the user's decision; the column's pairing with `Bank` in the same row is the reason for doubt. → Mitigation: the column is nullable and unvalidated in the schema, so a wrong value is a data-quality problem rather than a failed import; the first import should include a task that looks at whether `Account` is ever populated and what it holds, and O1 records the decision point. This is the single most likely thing to be wrong in the whole change.
- **R4 — A real export may be ISO-8859-1 or CP1252, and this importer refuses it.** D8 fails the run rather than corrupting text. → Mitigation: the error message names the encoding as the reason and the run writes nothing, so the fix is a conversion, not a repair; O2 records the question. The cost is one manual step in the one case where it is needed.
- **R5 — Running the import twice duplicates the statement.** D9 is a consequence of the schema's deliberate lack of a natural key. → Mitigation: the written count is reported and the spec requires it to equal the file's data-row count, and the requirement that a second run adds a second copy is stated in the spec rather than left for someone to discover. The real fix, if it is ever needed, is a natural key or an import ledger, and both are schema changes that belong in their own change.
- **R6 — The importer depends on Node's native TypeScript support, which is a moving target across Node versions.** D1. → Mitigation: it is the default on Node 24 and later and the file is a script rather than a service, so the version in use is a one-line `engines` field away; if a target without it appears, the fallback is a `tsx` dev dependency on the same unchanged source, which is a manifest change and not a code change.
- **R7 — Nothing verifies the importer against a live database, because no PostgreSQL server is running in this environment.** → Mitigation: the apply tasks require starting or provisioning a scratch database, applying `0001` and `0002`, and importing the sample row end to end, and require that a missing server be reported as a blocker rather than marked complete — the same rule the prior change's tasks set for its own migration work.
- **R8 — This change introduces the repository's first language, manifest, and dependencies, and every later change inherits them.** → Mitigation: bounded and stated — two runtime dependencies, no build output, no generated directory, and nothing that has to be kept in sync. D1's JavaScript-with-JSDoc fallback exists if TypeScript proves to be the wrong pick, and choosing a different stack later is a change of this capability, not a rewrite of the project, because no other code exists yet.
- **R9 — A file with one more column than the header is rejected per row rather than being mapped by name.** D8 matches by position, so an inserted column shifts every field and produces a wall of per-row errors rather than one clear diagnosis. → Mitigation: the header check catches a *changed header*, and the field-count check names the row's actual count; the resulting error message points at the header line, which is where the reader needs to look. Matching by column name instead would break on the two headers that differ only by a trailing space, which the whitespace rule already tolerates.
- **R10 — The importer can connect to any database it is handed, and a mistyped DSN can write a statement into the wrong instance.** → Mitigation: the DSN comes from the run's arguments or the environment and is never printed, and the non-writing mode lets a user confirm the file before anything is sent. Deleting rows again is not in scope, so the exposure is a write to an unintended but structurally identical schema.

## Migration Plan

Not applicable in the database sense: this change adds no migration and modifies no table. The deployment is the code and its manifest, and the rollback is deleting `tools/`, `package.json`, `tsconfig.json`, and `.gitignore` — the two existing SQL migrations are untouched and remain applicable with `psql -f` exactly as before.

Adoption is three steps for the user, in this order: provision a database and apply `db/migrations/0001_transactions.sql` then `0002_transaction_categories.sql`; install the dependencies; run the importer in its non-writing mode on the statement to confirm the header, the row count, and the absence of reported rows; then run it for real and compare the reported written count against the file's data-row count. The non-writing mode exists precisely so that the first contact with a real statement costs nothing.

If an import has already run and turned out to be wrong, there is no automated undo in this change. The honest recovery is `TRUNCATE transactions` on a database that holds nothing else, or a targeted `DELETE`, and the user decides — which is why the written count is reported and why the spec requires it to match the file.

## Open Questions

Each of these can be answered later without changing the specs written here, the approach, or the task breakdown.

- **O1 — What the `Account` column actually holds.** Whether it is the counterparty's IBAN or the account holder's own account, and therefore whether `counterparty_account` is right or whether it should be left absent. Answerable from the first real import, by looking at whether the column is ever populated and what it contains. If it is the holder's own account, this capability's mapping requirement is what changes, and it should be a follow-up change rather than a silent edit.
- **O2 — Other encodings.** Whether the importer should accept an encoding parameter, and which encodings. Currently a non-UTF-8 file is refused (R4), which is safe but may be inconvenient for a real German export.
- **O3 — Re-run protection.** Whether a later change should add an import ledger, a natural key, or a file-hash record so that a second run of the same statement is detected. R5 and D9 record why it is absent; the answer is a schema change.
- **O4 — The bank's `Category` column.** Whether it is worth keeping somewhere, for instance in a future report comparing the bank's classification with the project's categories. Discarding it is correct now because it is not a `Category` of this system, but the data is gone once the file is deleted.
- **O5 — Where a counterparty account should come from for card payments.** D7 stores the `Account` column, which is empty for card payments, so a card transaction has no counterparty account even though the merchant name is present in the purpose line. The domain model forbids parsing the purpose line, so closing this gap is a domain-model change, not an importer change.
- **O6 — Bulk loading.** Whether a very large statement justifies `COPY` or a staging table, given R2. Deferred because the answer is "no" at any plausible statement size.
