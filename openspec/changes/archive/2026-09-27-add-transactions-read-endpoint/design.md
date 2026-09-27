# Design

## Context

See proposal.md — Why for motivation. The state that shapes this design:

- `server/api/health.get.ts` is the only endpoint, built with `defineEventHandler`. Nuxt answers a file named `<name>.<method>.ts` under `server/api/` at `/api/<name>` for that method, so the endpoint's path and method follow from its filename rather than from routing code.
- `server/utils/db.ts` holds one lazily-built `pg.Pool` per process, obtained through `useDatabase()`, and `server/plugins/database.ts` closes it on shutdown. The pool opens no connection until a statement runs, which is what lets the server start with no database reachable.
- The `transactions` table has `id bigint GENERATED ALWAYS AS IDENTITY`, `booking_date date`, `value_date date`, `amount numeric`, `purpose text`, `counterparty_name text`, `counterparty_account text` (nullable), and `category_id bigint` (nullable, referencing `categories`). `categories` has `id`, `name`, `pattern`. The endpoint must read the category's name by following the reference, not from a copy.
- The `backend-shell` capability currently states the API is a single health endpoint and forbids an endpoint that reads `transactions` or `categories`. It also states the pool "exists and is left unused". Both sentences describe a shell with no consumers, and this change gives the pool its first consumer.
- The `frontend-shell` capability states the index route renders no stored data and offers no control that reads it. That stays true: this change adds the server endpoint but no page calls it.

## Goals / Non-Goals

**Goals:**

- Add exactly the read path the request asks for: every stored transaction, no filtering, no paging, no writes.
- Keep the response a faithful projection of the domain model, so the browser receives the seven data elements rather than the storage row, and the one reference (category) is resolved rather than exposed as a raw foreign key.
- Give the first consumer of the shared pool without turning the shell's lazy-open and shutdown guarantees into a lie.
- Stay additive: one new handler file, one new capability spec, and the minimum the existing `backend-shell` spec must say to remain true.

**Non-Goals:**

- A page, component, or client fetch that calls the endpoint. `frontend-shell` is unchanged (D9).
- Pagination, filtering, sorting parameters, search, or aggregation. The current dataset is a personal statement; see D7 and O2.
- Writing, importing, categorising, or evaluating any category's regular expression. See D10.
- A migration, an index, or any schema change. See D4 and O1.

## Decisions

### D1 — A new `transaction-read-api` capability, with `backend-shell` amended

The response contract lives in a new capability, `transaction-read-api`; `backend-shell` keeps only the API-surface boundary (which paths exist, what may write) and is amended to permit the one read endpoint.

*Rationale:* the two capabilities have different reasons to change. `backend-shell` is about the server's shape — one origin, one pool, credentials, no writes — and it should change only when that shape changes. The response fields, ordering, and representation of an uncategorised transaction are a contract about transactions, and a later change that adds filtering or a `GET /api/transactions/:id` should not have to edit the shell to do it. The archived categorisation change made the same split argument in reverse (its D10): a capability should not restate a field another capability owns. Here the shell must say which paths exist, so it names the endpoint and points at `transaction-read-api` for its behaviour instead of restating the shape.

*Alternative considered:* put the whole endpoint contract into `backend-shell`. Rejected — it turns the shell into a growing API index, and the next read change edits the file whose subject is really "how the process is assembled". *Alternative considered:* no `backend-shell` change at all, leaving the endpoint beside a requirement that forbids it. Rejected outright: the spec would contradict the code, which is exactly the state this project's delta discipline exists to prevent.

### D2 — The contradicted `backend-shell` requirement is REMOVED and replaced by an ADDED one, not MODIFIED in place

The delta removes `The API is a single health endpoint and reaches no stored data` with a stated reason and migration, and adds `The API is a health endpoint and a read-only transactions endpoint`.

*Rationale:* OpenSpec refuses to archive a `MODIFIED` block that drops or renames a scenario, and the removed requirement's second scenario is literally named `No endpoint reaches stored data` — a name this change makes false. Keeping that header to satisfy the tool would leave a scenario whose name asserts the opposite of its body. Removing and re-adding states the new surface in full, keeps scenario names truthful, and forces the reader to see that a guarantee was withdrawn rather than quietly edited. The prohibition that still holds — no endpoint writes — is restated word for word in the replacement so the withdrawal is bounded.

*Alternative considered:* `MODIFIED` with the original scenario names retained and their bodies rewritten. Rejected — it produces `No endpoint reaches stored data` as a heading over text describing an endpoint that reaches stored data. *Alternative considered:* leaving the scenario out and accepting a validation error. Rejected — validation is how the archive stays lossless.

### D3 — The endpoint is `server/api/transactions.get.ts`, answered at `GET /api/transactions`

The file name sets both the path and the method, matching how `health.get.ts` is wired.

*Rationale:* Nuxt's file-based server routing is the established convention in this repository; a route registered imperatively would be the first of its kind. The `.get.` segment makes the method part of the address rather than a check inside the handler, so a writing method is not routed here at all and the "no request can alter stored data" guarantee is structural. A plural, collection-shaped path (`/api/transactions`) is chosen over a verb (`/api/list-transactions`) because the path names the resource, and a future per-transaction read appends an id naturally.

*Alternative considered:* a catch-all handler under `server/api/transactions/index.ts` checking `event.method`. Rejected — more code for no gain, and it would answer methods the spec says are not answered. *Alternative considered:* keeping the resource in `backend-shell` under an existing path. Rejected — there is no existing path; the API is only the health endpoint today.

### D4 — One `SELECT` with a left join to `categories`

The handler runs a single statement through the shared pool:

```sql
SELECT t.id, t.booking_date, t.value_date, t.amount, t.purpose,
       t.counterparty_name, t.counterparty_account,
       c.id AS category_id, c.name AS category_name
FROM transactions AS t
LEFT JOIN categories AS c ON c.id = t.category_id
ORDER BY t.booking_date DESC, t.id DESC
```

*Rationale:* one round trip returns every transaction with its category resolved, and the left join is what makes an uncategorised transaction survive with null category columns instead of disappearing — an inner join would silently drop uncategorised rows, which are the majority today. The join reads only `categories.id` and `categories.name`; the `pattern` is deliberately never selected, matching the read capability's "no regular expression is returned" (D6). The statement is a `SELECT` alone, so "the endpoint reads and never writes" is true by construction.

*Alternative considered:* read `transactions` alone and issue a second query per distinct category (or per transaction). Rejected — N+1 round trips for a value the join already returns, and it would open the door to a row's category being read at a different instant than the row. *Alternative considered:* select `category_id` only and let the browser resolve names. Rejected — it pushes a second request and a `categories` read into the frontend, which the request did not ask for and `frontend-shell` does not want. *Dependency note:* the join requires the `categories` table, so the database must have `0002_transaction_categories.sql` applied; a database stopped at `0001` cannot serve this endpoint. That is the migrated schema this project already expects (O1).

### D5 — JSON field names are camelCase, and both identities are strings

A returned object is:

```json
{
  "id": "12",
  "bookingDate": "2026-09-25",
  "valueDate": "2026-09-25",
  "amount": "-33.61",
  "purpose": "2360 D002 …",
  "counterpartyName": "Bezahlung Karte MC/…",
  "counterpartyAccount": null,
  "category": { "id": "3", "name": "Groceries" }
}
```

*Rationale:* camelCase is the JavaScript-side convention and keeps the wire shape clearly distinct from the snake_case storage columns, so nobody mistakes the response for the row. The two `bigint` identities are rendered as strings because that is already how `node-postgres` returns `int8` — it does so precisely because a 64-bit integer does not survive a JavaScript number — so keeping strings is both lossless and the path of least surprise for the driver. The `amount` is a string for the same reason the schema chose `numeric`: a binary float would not round-trip `-42.75` reliably, and the domain's exactness guarantee outranks the convenience of a JSON number.

*Alternative considered:* snake_case keys mirroring the columns. Rejected — it couples the wire contract to the storage layout, which is the coupling the domain/schema split already avoids. *Alternative considered:* numeric `id`s and a numeric `amount`. Rejected — silent precision loss on both, with no compensating benefit at this scale. *Trade-off accepted:* a browser must parse `amount` to do arithmetic rather than summing JSON numbers; that is the correct place for that decision, and how money is formatted is a frontend concern this change does not take up (D9).

### D6 — The category is a nested object or null, resolved from the reference

`category` is `null` when `category_id` is null, and otherwise `{ "id": <string>, "name": <string> }` read from the joined `categories` row.

*Rationale:* the domain model says a transaction's category is optional and that uncategorised is a state of its own, not a placeholder category; `null` is the one representation of that state, and it matches the schema's null foreign key (the categorisation change's D3). Nesting the id and name together states that they describe one category, so a consumer cannot pair a name with the wrong id. Reading the name from the join, never from a copy on the transaction, is what makes a rename visible on the next call.

*Alternative considered:* flatten to `categoryId` and `categoryName` top-level fields. Rejected — nothing ties them together, and an uncategorised row would carry two nulls that read as two independent absent values. *Alternative considered:* include the `pattern`. Rejected — no consumer asked for it, and the request is to read transactions, not to expose the categorisation rule.

### D7 — Every row in one response, newest booking date first

The statement orders by `booking_date DESC, id DESC` and returns all rows; there is no `LIMIT`, `OFFSET`, or cursor.

*Rationale:* the request says "all transactions", and a personal statement is small enough that the whole set fits one response. Ordering newest-first is the order a statement is normally read, and `id DESC` makes equal dates a total order so two calls cannot disagree — which matters the moment a page caches or compares responses. Ordering in SQL rather than the handler keeps the database responsible for the one thing it is unambiguously better at.

*Alternative considered:* no `ORDER BY`, leaving order to the planner. Rejected — PostgreSQL gives no ordering guarantee without one, so the response order would be undefined and could change between calls. *Alternative considered:* pagination now. Rejected as premature and as a contract this change was not asked to define; adding `LIMIT`/`OFFSET` later is a compatible extension of the path, recorded as O2.

### D8 — A database failure is a 500 with a sanitised message, never an empty list

The handler lets `useDatabase()` throw when `DATABASE_URL` is missing, catches a query failure, logs the driver's error code (never its message), and responds with an error status and a fixed message that names no address or credential.

*Rationale:* an empty array is a valid, truthful answer meaning "the table is empty"; a database that cannot be reached is not that, and conflating them would let a page render "no transactions" when the truth is "the database is down". The importer already treats a connection failure as an error rather than a successful import of nothing, and the same reasoning applies here. The address must not reach the response, which carries the shell's credential rule into the first endpoint that can fail on the database.

*Alternative considered:* respond `200 []` on failure. Rejected — it hides an outage behind a plausible-looking empty result, the one failure mode that is hard to notice. *Alternative considered:* log the driver's message after stripping the credential, as the importer's `redact()` does. Rejected on implementation: a `pg` connection error such as `connect ECONNREFUSED 127.0.0.1:5999` carries the host and port, which are themselves parts of the connection string, and `backend-shell` forbids any part of a connection string in a log line — not only the credential. The error code alone (`ECONNREFUSED`, a SQLSTATE such as `42P01`) names no host, port, user, or password, so only it is logged.

### D9 — No frontend change, and `frontend-shell` is left alone

The endpoint is added and nothing calls it yet.

*Rationale:* the request is for a backend endpoint. `frontend-shell` requires the index route to render no stored data and offer no control that reads it, and it stays correct because no page is touched. Writing a client fetch now would require changing a capability the request did not name, and would put UI decisions (formatting, layout, loading states) into a change about a read path. Consuming the endpoint is the natural next change, which is where those decisions belong.

*Alternative considered:* add the fetch to `index.vue` while the endpoint exists. Rejected — it contradicts `frontend-shell` and expands scope beyond what was asked.

### D10 — Read-only by construction: no pattern evaluation, no writes, no schema change

The handler runs one `SELECT`; it contains no `INSERT`, `UPDATE`, `DELETE`, and no regular-expression code.

*Rationale:* the categorisation capability deliberately deferred applying patterns to a later change (its O1), and nothing here reopens that. Returning a transaction's current `category_id` reports what is stored; it does not decide membership. Keeping the statement to a `SELECT` also means calling the endpoint can never be the thing that mutates the table a reader is looking at.

*Alternative considered:* derive the category on read by matching patterns. Rejected — it overturns a deferred decision in a change that only asked to read, and would make the same transaction categorised differently depending on when it was read.

## Risks / Trade-offs

- **R1 — The response grows without bound as the import runs.** No `LIMIT` means a large table produces a large response and a slow serialisation. → Mitigation: deliberate at the current scale (D7); pagination is additive to the path and recorded as O2, and the ordering is stable so a future cursor is well-defined.
- **R2 — A database error message could disclose the connection string.** → Mitigation: the response carries a fixed message and only the driver's error code is logged, because a `pg` message can carry the host and port and `backend-shell` forbids any part of a connection string in a log line (D8).
- **R3 — String `id`s and a string `amount` surprise a consumer expecting numbers.** → Mitigation: a recorded, reasoned choice (D5) with exactness behind it; the response shape is stated in the spec, so the surprise is at most one read away, and no precision is ever lost.
- **R4 — The join requires `categories` to exist, so a database stopped at `0001` fails the endpoint.** → Mitigation: the project's migrated schema is `0001` + `0002`; the failure is a clear SQL error surfaced as a 500, and the task list includes running against the full migrated schema rather than an ad-hoc table.
- **R5 — `backend-shell` withdraws a guarantee a consumer may rely on.** → Mitigation: the removal has an explicit Reason and Migration, the replacement restates the unchanged no-writes prohibition, and the proposal's Impact names the change. This is the only withdrawal in the change.
- **R6 — Nothing in the repository exercises the endpoint automatically, and no page calls it.** → Mitigation: the tasks require a live `GET` against a migrated database holding both categorised and uncategorised rows, and against an empty table and an unreachable database, rather than trusting the handler by inspection. The project has no test framework (its prior changes verified against a live database), so the verification is a recorded manual run, not an invented test harness.
- **R7 — Ordering by `booking_date` is a sequential sort with no index.** → Mitigation: correct and cheap at personal-statement scale; an index on `(booking_date, id)` is an additive `0003_*.sql` if it ever matters (O3).

## Migration Plan

There is no data migration. The change adds one handler file and changes no schema, no row, and no dependency. Deployment is the next server start: Nuxt discovers `server/api/transactions.get.ts` and answers `GET /api/transactions`. A server that previously answered only `/api/health` now also answers the new path; every other path under `/api` behaves as before.

Rollback is deleting the handler file, which returns the API to the health endpoint alone. The `backend-shell` and `transaction-read-api` specs must be reverted with it, because a spec that describes an endpoint the code no longer has is the same contradiction in reverse. No database state is involved in either direction.

## Open Questions

Each of these can be answered later without changing the specs written here, the chosen approach, or the task breakdown.

- **O1 — Databases stopped at `0001`.** Whether the endpoint should detect a missing `categories` table and report a clearer error, or whether the project simply assumes the fully migrated schema. D4 assumes the latter; a clearer error is a small later change if it proves useful.
- **O2 — Pagination and filtering.** When the table grows or a page wants a date range, whether to add `LIMIT`/`OFFSET`, a cursor on `(booking_date, id)`, or filter parameters. D7 deliberately stops at returning everything; the stable order makes any of these additive.
- **O3 — Indexes.** Whether the `ORDER BY` warrants an index on `(booking_date, id)`, alongside the deferred index on `category_id` the categorisation change left open.
- **O4 — A per-transaction read.** Whether `GET /api/transactions/:id` is needed, which the collection-shaped path already accommodates.
- **O5 — Frontend consumption.** Which page calls the endpoint and how amounts and dates are formatted for display — UI decisions this change deliberately leaves to the frontend change.
- **O6 — Caching and response size.** Whether a `Cache-Control` header or streaming large result sets is worth adding once a consumer exists.
