# Design

## Context

See `proposal.md` - Why. A `Category` is currently a name plus one `pattern text` column on the
`categories` table (`db/migrations/0002_transaction_categories.sql`). All category logic lives in
`server/utils/categories.ts`: it shapes the `Category` object, validates the pattern by probing
Postgres `~*`, and runs the assignment subqueries that match `t.purpose ~* c.pattern`. The
management surface (`server/api/categories/`) and the screen (`app/pages/categories.vue`) are the
only consumers of the `pattern` field. The transactions read path does not expose it.

The change must keep one row per category, keep matching in Postgres (the browser never evaluates
an expression), and keep the existing precedence rule (smallest identity among matching
categories).

## Goals / Non-Goals

**Goals:**

- A category holds one or more regular expressions; it matches when any one matches.
- Preserve the existing per-category matching, precedence, validation, and delete/reassign
  behaviour.
- Migrate existing single-expression categories without losing their expression.
- Keep the change additive to the database and confined to the four capabilities in the proposal.

**Non-Goals:**

- No change to how a transaction references its category, or to `GET /api/transactions`.
- No per-expression precedence or ordering within a category; expressions are an unordered set of
  alternatives (the stored array order is preserved only so the UI can show it back).
- No schema-level validation of expressions; the schema still expresses structure only.

## Decisions

### Store the expressions in a single `patterns text[]` column

A category stays exactly one row. `categories.pattern text` becomes `categories.patterns text[]`.
A single `text[]` column is preferred over a child table because the schema capability already
guarantees one row per category and no second table, and a child table would rewrite that
guarantee and add a join for no behavioural gain. It is preferred over a joined string because
expressions may contain any character (including a plausible delimiter), so any separator would
need escaping; a native array avoids the encoding problem entirely. The schema still carries no
constraint on the array's contents, matching "the schema carries no business validation".

### Match with `EXISTS (unnest(patterns))`, not a join

The assignment subqueries change from `WHERE t.purpose ~* c.pattern` to a correlated existence
test:

```sql
WHERE EXISTS (
  SELECT 1 FROM unnest(c.patterns) AS expression
  WHERE t.purpose ~* expression
)
```

`ORDER BY c.id LIMIT 1` is unchanged, so the smallest matching category still wins. `EXISTS`
keeps the subquery scalar and avoids a join that would multiply transaction rows and require
`DISTINCT`. Because matching is `~*` (case-insensitive, unanchored) per expression, a category
holding an empty-string expression still matches everything, as before.

### Validate every expression, and reject an empty list

`readCategoryInput` accepts `patterns` as an array of strings. It rejects a value that is not an
array, an empty array, and any element that is not a string, with a 400. Each element is then
probed with the existing `COMPILE_PATTERN` (`SELECT '' ~* $1`), so the engine that validates is
the engine that evaluates. An empty-string element is accepted; an empty array is not, because a
category with no expression defines no membership.

### Replace `pattern` with `patterns` in JSON and the UI

The category object becomes `{ id, name, patterns: string[] }`. The POST/PUT bodies carry
`patterns`. This is a deliberate breaking change to the management surface's own contract; the
transactions read path is untouched. The screen keeps a list of expression inputs with add/remove
controls, and renders all expressions in the listing.

### Migrate additively with a column swap

Migration `0003_category_patterns.sql` adds `patterns text[]`, backfills each row with
`ARRAY[pattern]`, sets the column `NOT NULL`, then drops `pattern`. The backfill preserves every
existing expression as a one-element array. Assignment is not re-run by the migration, matching
the rule that a schema change does not re-evaluate transactions.

## Risks / Trade-offs

- [Dropping the `pattern` column is irreversible in the migration's `up`] -> The `down` step
  reconstructs `pattern` from `patterns[1]` for every existing category, and the change carries a
  tested rollback; no transaction data lives in the dropped column.
- [`unnest` per candidate category is less index-friendly than a plain column match] -> At this
  data size the category set is small and the existing plan already scans categories per
  transaction; behaviour is unchanged. Revisit only if the category set grows large.
- [`text[]` ordering is not a semantic guarantee] -> Order is used only for display; matching is
  order-independent, so a reorder cannot change assignment.
- [A malformed `patterns` array reaches the database through a path other than the API] -> The
  column is `NOT NULL`, and only the management surface writes categories; this mirrors the
  existing situation and is out of scope.

## Migration Plan

1. Add `0003_category_patterns.sql`: `ADD COLUMN patterns text[]`, `UPDATE ... SET patterns =
   ARRAY[pattern]`, `ALTER COLUMN patterns SET NOT NULL`, `DROP COLUMN pattern`.
2. Deploy the code change in the same step: server utilities, endpoints, and the screen.
3. Rollback: re-add `pattern text`, backfill `pattern = patterns[1]`, drop `patterns`; redeploy
   the previous code. Because the array holds the original expression first, no expression is
   lost on rollback.
