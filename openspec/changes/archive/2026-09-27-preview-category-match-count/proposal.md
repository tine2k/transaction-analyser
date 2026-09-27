# Proposal

## Why

When adding or editing category expressions, the current form provides no indication of how many stored transactions those expressions match. A count preview lets users assess the effect of their changes before saving, without changing the existing assignment rules or saving behavior.

## What Changes

- Add a live match-count label to the shared category create/edit form, reflecting the expressions currently entered before submission.
- Add a server-side preview endpoint that evaluates candidate expressions against stored transaction purpose lines using the existing matching semantics.
- Keep matching out of the browser and leave category creation, editing, and transaction assignment behavior unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `category-management-screen`: show the number of stored transactions matching the current expressions before a category is saved, with a clear unavailable state when a valid count cannot be produced.
- `category-management-api`: expose a read-only way to count transactions matching unsaved candidate expressions.

## Impact

- `app/pages/categories.vue` gains the preview label and requests a count as form expressions change.
- `server/api/categories/` and `server/utils/categories.ts` gain a server-side preview operation; the existing `POST`, `PUT`, and `DELETE` behavior remains unchanged.
- The preview evaluates expressions against `transactions.purpose` and does not update category assignments or transaction data.
