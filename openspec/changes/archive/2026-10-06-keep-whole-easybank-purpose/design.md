# Design

## Context

See proposal.md — Why. The state that shapes this design:

- `mapBookingText` in `shared/easybank.ts` is the only mapping for the sync's rows. Its IBAN branch sets the purpose to `lines.slice(0, ibanIndex)` and falls back to the whole text only when nothing precedes the IBAN.
- The purpose is required by `shared/transactions-import.ts`, is part of the dedupe fingerprint (booking date, value date, amount, purpose, counterparty name, counterparty account), and is the field stored category expressions are matched against (`shared/category-assignment.ts`).
- The sync's value-date floor keeps it from re-reading rows on or before 2026-09-20, so only rows above the floor can be affected by a mapping change.
- The no-IBAN branch (first line as name, later lines as purpose) is not part of this change.

## Goals / Non-Goals

**Goals:**

- An IBAN row's purpose is the complete booking text, exactly as the bank presents it, so nothing after the IBAN is lost.
- Counterparty name and account detection stay as they are, and rows without an IBAN keep their mapping.

**Non-Goals:**

- No change to the dedupe rule, category matching, the value-date floor, the schema, or the API.
- No backfill or rewrite of purposes already stored under the old mapping.

## Decisions

### D1 — The purpose is the whole booking text whenever an IBAN is present

In the IBAN branch the purpose becomes the already-computed `whole` (`lines.join('\n').trim()`) unconditionally, instead of the lines before the IBAN. The account and name logic is untouched; the fallback that makes the name the whole text when nothing follows the IBAN stays.

*Rationale:* the user asked that detecting the name and IBAN must not cut anything off the purpose. The whole text is the simplest rule that loses nothing, it needs no reconstruction of the text around the IBAN, and it keeps the purpose non-empty by construction.

*Alternative considered:* the whole text with the IBAN token removed — keeps the name but still cuts the IBAN out; rejected because the request was to keep the whole text. *Alternative considered:* keep the current before-the-IBAN purpose — the problem being fixed.

### D2 — Name/account detection and the no-IBAN mapping stay unchanged

The name remains the text after the IBAN on that line plus later lines (whole text when nothing follows), and rows without an IBAN keep the first-line-as-name, later-lines-as-purpose mapping.

*Rationale:* only the purpose was reported as truncated; changing anything else would alter more stored data and more spec scenarios without addressing the request. The no-IBAN mapping is what the bank's own export follows for card rows and already keeps the whole text in the purpose.

*Alternative considered:* apply the whole text to every row — rejected by the user's answer to keep the no-IBAN mapping. *Alternative considered:* map the name from the lines before the IBAN — changes the counterparty for every transfer, out of scope.

### D3 — Existing purposes are not migrated; a non-writing run surfaces any mismatch

No data migration is added. If the sync has already written IBAN rows above the value-date floor, the new purpose changes their fingerprint, so a later run sees them as new. A non-writing run makes that visible as a lower "already stored" count before writes happen; duplicates that do get written are removed by hand.

*Rationale:* the old whole text cannot be reconstructed exactly from the stored fields — the later lines were joined with spaces and the line breaks around the IBAN are gone — so a SQL rewrite could only produce a third, still-mismatching value. The value-date floor bounds the affected set to rows written since 2026-09-21.

*Alternative considered:* a one-time `UPDATE` deriving the purpose from `purpose`, `counterparty_name`, and `counterparty_account` — lossy and could create new mismatches. *Alternative considered:* a temporary dual-fingerprint dedupe — a dedupe rule change disproportionate to the fix.

## Risks / Trade-offs

- **R1 — Rows written by the sync under the old mapping can be re-imported as duplicates.** → Run the manual command non-writing first to compare "already stored" against the expectation; remove any duplicate that a writing run does create. The value-date floor bounds the affected rows.
- **R2 — The purpose now repeats the IBAN and the counterparty name.** → Accepted: that is what "the whole booking text" means; the table and the API show a longer purpose, and category matching (`~*`) still finds the same substrings unless an expression is anchored to the old truncated text.
- **R3 — The unit tests and the client end-to-end expectation encode the old purpose.** → Update them with the mapping; the spec delta's scenarios define the new values.

## Migration Plan

1. Deploy the code; no schema, environment, or configuration change.
2. Run `npm run sync` (or the imports screen control) without writing enabled and check that IBAN rows above the floor are not reported as new because of the mapping change; if they are and writing is already on, delete the old row before or the duplicate after.
3. Rollback is a code rollback; no stored data is altered by the change itself.
