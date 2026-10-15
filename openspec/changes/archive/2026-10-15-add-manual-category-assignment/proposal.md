# Proposal

## Why

Some transactions are one-of-a-kind: no pattern can catch them without overreaching, no
date window fits, and a catch-all category would steal transactions it does not describe.
Today every category change re-derives **every** transaction's category, so there is no
place to record a deliberate, lasting choice for such a transaction. This change lets a
user pin a transaction's category by hand — individually or in bulk — and makes that
choice survive every rule-driven re-evaluation.

## What Changes

- The transactions table gains a per-row category select offering the stored categories and
  an `Uncategorised` choice.
- Choosing a category **pins** the transaction: the explicit choice survives category
  creates, edits, pattern appends, imports, and the re-categorisation operation. Choosing
  `Uncategorised` clears the pin, and that transaction is immediately re-evaluated by the
  existing assignment rule.
- A pinned row carries a marker that distinguishes the explicit choice from a rule-derived
  one.
- A selection column (checkbox per row, select-all in the header) adds bulk selection, and a
  fixed bulk bar assigns one category — or clears the pins by choosing `Uncategorised` —
  across every selected row. Changing either filter clears the selection.
- A new write operation sets or clears the pinned category of one or more transactions as a
  single all-or-nothing unit; the read endpoint reports whether a transaction's category is
  currently manual or rule-derived.
- Rule-driven re-evaluation is unchanged for unpinned transactions. Deleting a category
  clears the pins that reference it, then the existing retirement reassignment applies; the
  on-demand re-categorisation skips pinned transactions and reports only rule-driven
  changes.
- Non-goals: no hard unassign (permanently excluding a matched transaction from the rule),
  no category creation from the table, no change to the matching rule, no bulk pattern
  append.

## Capabilities

### New Capabilities
- `manual-category-assignment`: the pin lifecycle (assign, clear, immediate re-evaluation),
  the all-or-nothing write operation for one or many transactions, and the browser surfaces
  — per-row select, checkbox selection with select-all, bulk bar, provenance marker, and the
  refresh and failure behavior after an assignment.

### Modified Capabilities
- `category-assignment`: rule-driven re-evaluation triggered by a category change skips
  pinned transactions instead of overwriting them.
- `category-management-api`: deleting a category clears the pins that reference it before
  the remaining categories take over, so no pin outlives its category.
- `category-recategorisation`: the on-demand operation skips pinned transactions and counts
  only the rule-driven changes it actually makes.
- `transaction-domain-model`: manual assignment is an additional, explicit cause of a
  category change; a pinned transaction still holds at most one category.
- `transaction-read-api`: each returned transaction reports whether its category is
  currently manual or rule-derived.
- `transaction-table`: the category cell hosts the assignment control, a selection column
  is added, and the absence-display and no-data-control requirements are reconciled with
  the new controls.

## Impact

- New migration (`0009`) adding a per-transaction pin flag, defaulting to unpinned.
- `server/utils/categories.ts`: the global, scoped, and on-demand recompute statements gain
  pin exclusions; the delete path clears pins before reassignment.
- New write endpoint under `/api/transactions`; `GET /api/transactions` gains the
  manual/rule-derived provenance of each category.
- `app/pages/index.vue` gains the per-row select, selection state, and refresh handling; a
  new bulk-bar component sits beside the existing pattern shortcut bar.
- Tests: unit coverage for the pin semantics and validation, integration coverage for the
  write endpoint and the recompute/delete/re-categorise interplay, component coverage for
  the bulk bar, and browser coverage for the select, selection, and bulk flows.
- Import paths and the matching rule are untouched: imported rows are rule-assigned and
  start unpinned.
