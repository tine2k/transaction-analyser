# Proposal

## Why

Category patterns currently match only a transaction's purpose line, but the merchant often appears
only in the counterparty name, so patterns miss transactions the user plainly sees. Existing
transactions also only gain a new category when the category set changes; there is no way to
re-apply the current categories to everything already stored and see the effect. The imports
screen is where new rows arrive, so it is the natural place to offer that refresh.

## What Changes

- A category's regular expressions match a transaction when they match its purpose line **or** its
  counterparty name, case-insensitively and on any part of the text. The change applies everywhere
  the shared matching rule is used: assignment at import, re-evaluation after a category change,
  and the read-only previews (expression match count, literal match count, and the window-claim
  exclusion).
- A new management operation re-evaluates **every** stored transaction against the stored
  categories and updates each transaction's category to the one the matching rule selects, or
  leaves it uncategorised. It answers with the number of transactions whose category changed and
  writes nothing else.
- The imports screen gains a control that triggers the operation. The control is disabled while the
  request is in flight, and the screen shows the returned changed count as a transient message.
- The report is non-persistent: no import run is recorded, no count is stored, and reloading the
  screen clears the message.
- No database schema change; `transactions.counterparty_name` already exists.

## Capabilities

### New Capabilities

- `category-recategorisation`: the on-demand re-evaluation of every stored transaction against the
  current categories — the operation, the number of changed transactions it reports, the imports
  screen control that triggers it, the control's disabled-while-running state, and the transient
  presentation of the report.

### Modified Capabilities

- `category-assignment`: a category's expressions match the counterparty name as well as the
  purpose line, in every assignment, re-evaluation, and preview that follows the matching rule.
- `transaction-domain-model`: a category's regular expressions are defined over the purpose line
  and the counterparty name, not the purpose line alone.
- `category-management-api`: the read-only previews (expression match count, literal match count,
  and the window-claim exclusion) match the counterparty name as well as the purpose line, so they
  mirror the assignment rule.
- `category-management-screen`: the expression-match and window-claim preview labels count matches
  against the purpose line or the counterparty name.
- `backend-shell`: the API inventory gains the re-categorisation operation on the category
  management surface, and the rule that only the sync-start endpoint may change stored transactions
  gains that exception.

## Impact

- `shared/category-assignment.ts`: the matching SQL tests `purpose OR counterparty_name`; every
  consumer (imports, category mutations, previews) follows without a second rule.
- `server/utils/categories.ts`: the preview statements gain the counterparty test; a new
  `recategoriseTransactions()` operation runs the global recompute and counts the changed rows
  under the existing category-mutation serialization.
- New route `server/api/categories/recategorise.post.ts`.
- `app/pages/imports.vue`: the control, its disabled state, and the transient report.
- Tests: unit tests for the matching SQL, integration tests for the new endpoint and the changed
  previews, component tests for the imports screen, and a browser check of the control.
- No migration: the schema already holds `counterparty_name`.
