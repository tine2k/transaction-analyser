# Proposal

## Why

Transactions can be imported and stored, but nothing can read them back: the API exposes only a health endpoint, and the shell renders placeholder text. The first thing the analyser must do is present what has been imported, and that requires a read path from the database to the browser. This change adds a single read-only endpoint that returns every stored transaction, so a later change has real data to render without inventing one.

## What Changes

- Add a read-only endpoint `GET /api/transactions` that returns every stored transaction as a JSON list.
- Each returned transaction carries the seven domain data elements — booking date, value date, amount, purpose line, counterparty name, counterparty account, and category — with the category expressed as an object holding its id and name when one is assigned, and as absent when the transaction is uncategorised.
- Return all rows in one response, ordered by booking date descending and then by id descending so equal dates have a stable order. No pagination, no filtering, no query parameters.
- Return the amount as a decimal string, not a floating-point number, so the exact stored value survives the trip to the browser.
- **BREAKING (spec-level)**: amend the `backend-shell` requirement `The API is a single health endpoint and reaches no stored data`. The API surface becomes the health endpoint plus this one read-only endpoint; the prohibition on endpoints that create, alter, or delete stored data stays exactly as it is.
- Add no write path, no schema change, no migration, and no frontend change. The endpoint is read-only and the browser does not yet call it.

## Capabilities

### New Capabilities

- `transaction-read-api`: the read-only HTTP surface that returns stored transactions, its response shape, its ordering, and how it represents an uncategorised transaction and the amount.

### Modified Capabilities

- `backend-shell`: the `The API is a single health endpoint and reaches no stored data` requirement changes, because the endpoint it currently forbids is the one this change adds. The replacement states that the API is a health endpoint plus exactly one read-only transactions endpoint, and restates the unchanged prohibition on any endpoint that writes.

## Impact

- **New file**: `server/api/transactions.get.ts`, a Nitro event handler alongside `server/api/health.get.ts`, using the shared pool from `server/utils/db.ts` and the same `defineEventHandler` convention.
- **No new dependency**: the endpoint uses the existing `pg` pool; nothing is installed.
- **Spec deltas**: `specs/transaction-read-api/spec.md` (new capability) and `specs/backend-shell/spec.md` (one `MODIFIED` requirement) in this change.
- **Database**: no migration, no schema change. The endpoint issues a single read statement (a `SELECT` with a left join to `categories`) and writes nothing.
- **Existing behaviour**: the health endpoint, the import command, the migrations, and the frontend shell are unchanged. The `frontend-shell` capability still says the page reads no stored data, and it is correct — this change adds the server-side endpoint but the browser does not call it.
- **Compatibility**: the API previously answered only `/api/health`; a request to `/api/transactions` used to be a 404 and now returns data. A consumer relying on "no endpoint reaches stored data" is affected, which is why the `backend-shell` requirement is amended in place rather than left beside a contradicting endpoint.
- **Deferred to later changes**: a frontend that calls the endpoint, pagination or filtering, and any aggregation over the returned rows. Recorded in design.md as open questions.
