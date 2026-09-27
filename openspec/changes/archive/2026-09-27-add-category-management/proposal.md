# Proposal

## Why

The domain model and the database already describe a `Category` as a name plus a regular
expression over the transaction purpose line, but nothing in the application can create,
change, or delete one, and no purpose line is ever matched against a category's expression.
Every transaction is therefore permanently uncategorised. This change makes categories
manageable and makes the stored `transactions.category_id` reflect the current expressions.

## What Changes

- Add a **category management HTTP surface**: list, create, edit, and delete categories,
  each carrying a name and a regular expression.
- Add a **second browser screen** for managing categories, and a **menu bar** in the shared
  layout that links between the transactions screen and the category management screen.
- Add **category assignment**: on every category create, edit, or delete, every transaction's
  purpose line is matched against every category's regular expression and the transaction is
  assigned the winning category, or left uncategorised when none matches. This is the change
  that finally decides the matching rules the domain model deliberately left open.
- Settle the deferred matching decisions: case-insensitive substring matching, and, where
  several categories match one purpose line, the matching category with the **smallest id**
  wins.
- **BREAKING (spec-level)**: relax the `backend-shell` "exactly two endpoints, no endpoint
  that alters data" rule to admit the category write endpoints; relax the `frontend-shell`
  "only route is the index route" and "a control never creates, alters, or deletes" rules to
  admit the second route and the management controls.
- No schema change: `categories` and `transactions.category_id` already hold everything
  required; assignment is computed in application code and persisted to the existing column.

## Capabilities

### New Capabilities

- `category-management-api`: the read-and-write HTTP surface for categories — listing them,
  creating one, editing its name or expression, and deleting it — including validation and
  how a delete reconciles transactions that referenced it.
- `category-management-screen`: the second route and its form-based controls for listing,
  creating, editing, and deleting categories, together with the menu bar link that reaches it.
- `category-assignment`: the matching rules and the evaluation trigger — how a purpose line is
  matched, how overlaps are resolved, when evaluation runs, and how transactions are
  reconciled when a category changes or disappears.

### Modified Capabilities

- `transaction-domain-model`: the requirement that leaves the outcome of overlapping patterns
  undecided is replaced by the decided matching and precedence rules.
- `backend-shell`: the endpoint inventory changes from a fixed two read-only endpoints to also
  include the category management endpoints, which write.
- `frontend-shell`: the shell gains a second route and a menu bar, and one screen may now
  create, alter, and delete stored categories.

## Impact

- `server/api/`: new category endpoints beside `health.get.ts` and `transactions.get.ts`.
- `server/utils/`: the category matching and assignment logic, beside `db.ts`.
- `app/layouts/default.vue`: the shared menu bar.
- `app/pages/`: a new category management page beside `index.vue`.
- Existing read path is unchanged: `GET /api/transactions` still returns the referenced
  category, which now changes as expressions are edited.
- No database migration; `db/migrations/` is untouched.
- The command-line importer is unaffected and still writes uncategorised transactions until
  the next category evaluation.
