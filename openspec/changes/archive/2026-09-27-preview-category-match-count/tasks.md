# Tasks

## 1. Server-side match-count preview

- [x] 1.1 Add a read-only category preview operation that validates candidate patterns with PostgreSQL and counts matching transaction rows once using the existing case-insensitive substring semantics; verify automated database-backed cases cover multiple patterns, overlapping stored categories, and no data changes.
- [x] 1.2 Expose the operation as `POST /api/categories/match-count` with `{ patterns }` input and `{ count }` success output, mapping invalid input and database failures to the existing category API error behavior; verify endpoint tests cover malformed lists, uncompilable expressions, and database failure.

## 2. Category form preview

- [x] 2.1 Update the shared create/edit form to request counts for current non-empty patterns, show explicit loading, empty-input, zero-count, and unavailable states, debounce requests, and ignore stale responses; verify UI tests exercise create and edit values, errors, and out-of-order responses.
- [x] 2.2 Keep preview independent from category submission and assignment; verify a failed preview does not block create/edit submission and no write request occurs merely from previewing.

## 3. Integration verification

- [x] 3.1 Run `npm run build` and verify the category screen in headless Chromium against seeded transaction data, confirming the displayed count is visible before save and reflects the latest expressions for both create and edit.
