# Design

## Context

See `proposal.md` for motivation and `specs/category-management-api/spec.md` for the behavior
contract.

Today `appendPattern` (`server/utils/categories.ts`) runs `RECOMPUTE_ASSIGNMENTS` — an
`UPDATE transactions` with no `WHERE`, whose `SET` expression is the shared
`matchingCategorySql()` — inside the append transaction, after taking the transaction-scoped
advisory lock that serializes every category mutation. The matching rule is a correlated subquery
per transaction that scans every category and every pattern with `~*` against both text columns,
plus a window tier. Cost is `transactions x categories x patterns`, and the statement rewrites every
row even when the value is unchanged.

Exploration benchmark (disposable PostgreSQL 18, synthetic fixture: 8,000 transactions, 400
categories x 1 pattern, 40 windows):

| Append path | Time |
| --- | --- |
| Current: append + global recompute | 19.5-27.5 s |
| Scoped, pattern matches 0 rows | ~8 ms |
| Scoped, 20 rows | ~6 ms |
| Scoped, 800 rows | ~18 ms |
| Scoped, 7,200 rows (worst case) | ~95 ms |
| No-op append (already stored) | 0.7 ms |
| Literal match-count preview | 5-7 ms |

Full-table category checksums after a scoped append were identical to a full global recompute for
patterns matching 0, 20, 800, and 7,200 rows.

## Goals / Non-Goals

**Goals:**

- Make an append's work proportional to the transactions the appended pattern can affect, instead
  of the whole table x the whole category set.
- Keep the resulting assignment state bit-for-bit identical to the global recompute.
- Keep the append one transaction under the existing advisory lock, and keep the one shared
  definition of the matching rule.

**Non-Goals:**

- Changing create, edit, or delete re-evaluation (the `category-assignment` requirement keeps its
  full-table recompute for those operations).
- Indexes (`pg_trgm`), denormalized match tables, or storage redesign — not needed at the current
  scale; revisit if the table grows by an order of magnitude.
- Batching or debouncing appends outside the append transaction; the spec requires the
  re-evaluation to be part of the same operation.
- Any API, response shape, schema, or frontend change.

## Decisions

### Scope the append's UPDATE by the appended pattern

Replace the append's `RECOMPUTE_ASSIGNMENTS` call with:

```sql
UPDATE transactions AS t
SET category_id = <matchingCategorySql()>
WHERE t.purpose ~* $1 OR t.counterparty_name ~* $1
```

with `$1` set to the same escaped literal pattern that is stored by the append.

Equivalence argument:

- Appending pattern `P` to category `X` changes the candidate set of a transaction only when the
  transaction matches `P` — it adds `X` to the categories whose expression matches.
- For a transaction that does not match `P`, every category's match outcome is unchanged, so the
  winner is unchanged; skipping it is correct.
- For a transaction that matches `P`, the statement runs the full `matchingCategorySql()` rule, so
  the winner — including the expression-before-window tier order and the smallest-identity
  tiebreak — is exactly the new winner.
- A no-op append (pattern already stored) updates no category row and runs no recompute at all.

The worst case is a pattern matching every transaction: the same per-row cost as today, never
worse.

Alternatives considered:

- **Keep the global recompute** — rejected: ~20 s per append at the reported scale.
- **Debounce or batch recomputes after a burst** — rejected: breaks the "same operation" atomicity
  the spec requires and complicates the refresh contract.
- **Incremental match tables updated per pattern** — rejected: large redesign, new invariants, and
  unnecessary at 8k transactions.

### No `IS DISTINCT FROM` filter on the scoped update

The benchmark showed adding `AND t.category_id IS DISTINCT FROM (<matching>)` evaluates the
matching rule twice and was slower where it matters (126 ms vs 95 ms for 7,200 matched rows), while
the plain scoped statement already restricts rewrites to matching rows. The plain statement is used.

### Keep the advisory lock and single transaction

The lock is still required: without serialization, a recompute that starts before another append
commits can assign a category that the later, smaller-identity pattern should win. Each scoped
recompute covers exactly the rows its own change can affect and reads all previously committed
changes, so serialized scoped recomputes converge to the same state as serialized global ones. The
lock is now held for milliseconds instead of seconds.

### No index changes

The scoped `WHERE` is a sequential scan with two `~*` evaluations per row (about 6-8 ms at 8k rows
including the advisory lock and append). A `pg_trgm` GIN index would help at a much larger scale but
adds an extension, migration, and write amplification now; it stays a future option.

## Risks / Trade-offs

- [The scoping predicate drifts from the matching rule's columns] → The predicate uses the same
  escaped pattern value that is stored, and the matching rule stays in
  `shared/category-assignment.ts`; an integration test asserts the scoped outcome equals the rule,
  and a code comment ties the two columns to the rule.
- [A pattern matching most transactions still pays close to the full cost] → Accepted: the worst
  case equals today's per-row behavior (~95 ms at 8k/400), and user-selected literals are normally
  narrow.
- [An append no longer repairs assignments that were already inconsistent] → Accepted: every
  system mutation maintains the invariant (create/edit/delete recompute globally, imports evaluate
  their own rows); no spec requires an append to repair unrelated rows.
- [Concurrent appends still serialize on the advisory lock] → Accepted: each now holds it for
  milliseconds, so queued appends drain quickly.

## Migration Plan

No schema or data migration. Deploy the code change; rollback is reverting the commit. The change is
internal to the append path, so no API versioning or client coordination is needed.
