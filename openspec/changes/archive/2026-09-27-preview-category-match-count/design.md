# Design

## Context

See proposal.md for motivation and the spec deltas for observable behavior. The category page already shares one form between create and edit and sends all pattern matching to the server. Category writes validate PostgreSQL regular expressions and re-evaluate transaction assignments; the preview must remain read-only and use the same PostgreSQL matching semantics.

## Goals / Non-Goals

**Goals:**

- Provide the same preview experience for both create and edit using the current form values.
- Keep matching and validation in PostgreSQL, and avoid changing category or transaction records.
- Ensure the displayed count belongs to the latest pattern values, even when requests overlap.

**Non-Goals:**

- Previewing which category ultimately wins assignment, or changing assignment precedence.
- Persisting preview results, adding transaction filters, or changing the existing category CRUD contract.
- Recomputing assignments as a side effect of preview.

## Decisions

- **Add `POST /api/categories/match-count` for previews.** It accepts `{ patterns: string[] }` and returns `{ count: number }`. A dedicated read-only operation keeps the existing category list and mutation endpoints focused, while POST carries the expression list without putting it in a URL. The alternative of calling create/edit to obtain a count is rejected because it would persist data and trigger reassignment; matching in the browser is rejected because it would duplicate PostgreSQL regex behavior.
- **Use one database query to count matching transactions.** Validate every candidate expression with the same PostgreSQL operator used by category writes, then count transaction rows for which at least one candidate expression matches `purpose` with `~*`. Use an existence test over the expressions so a transaction matching multiple expressions contributes once. Do not join against stored categories or filter by `category_id`: the preview measures direct matches across all stored transactions, irrespective of assignment precedence or whether they are currently categorised.
- **Drive the preview from the shared form's entered patterns.** Request a preview when at least one non-empty expression is present, with a short debounce to avoid a request on every keystroke. Show a non-count state when there are no expressions, while loading, or on error. Associate each response with its requested pattern set (or request generation) and ignore results that no longer represent the current form, preventing a delayed response from replacing a newer count. Preview failures do not disable the existing submit path.
- **Treat invalid candidate expressions as preview errors.** The server returns a client error using the category surface's existing pattern-validation behavior. The form presents an unavailable state rather than a count for invalid input; save remains governed by its existing validation.
- **Use existing Node test support for database integration and Playwright for browser behavior.** The repository has no test framework; the PostgreSQL integration suite uses Node's built-in test runner, while a test-only Playwright dependency exercises the form in headless Chromium. Run browser tests in the matching Playwright Docker image, keeping browser binaries and the test database out of the host installation.

## Risks / Trade-offs

- [Risk] A preview evaluates regular expressions across the transaction table on each settled expression change → Debounce requests and keep each evaluation to a single count query; avoid polling or recomputation unrelated to form edits.
- [Risk] A transaction can be imported or otherwise change between preview and save → Treat the count as a point-in-time estimate and do not imply that it is reserved or guaranteed to equal the post-save assignment result.
- [Risk] PostgreSQL counts are wider than JavaScript's safe integer range in extreme datasets → Keep the response as a JSON integer for the specified contract and verify conversion does not silently produce an invalid count; if this bound becomes reachable, revisit the response representation as a separate compatibility decision.

## Migration Plan

No database migration or stored-data backfill is required. Deploy the read-only endpoint and category page update together. Rollback consists of removing the preview UI and endpoint; no persisted preview state needs cleanup.

## Open Questions

None.
