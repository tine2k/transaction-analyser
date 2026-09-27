# Design

## Context

See `proposal.md` for motivation. The current state that shapes this approach:

- The database already has `categories(id, name, pattern)` and `transactions.category_id`, a
  nullable foreign key to it (`db/migrations/0002_transaction_categories.sql`). There is a
  unique constraint on `categories.name`, and the foreign key does not cascade a delete.
- `server/api/transactions.get.ts` already resolves a transaction's category by joining
  `categories`, and `server/utils/db.ts` already hands out one shared pool.
- The frontend is a Nuxt application with one layout (`app/layouts/default.vue`) and one route
  (`app/pages/index.vue`), styled by one Tailwind stylesheet.
- The only server routes are `health.get.ts` and `transactions.get.ts`. No route writes.
- The domain model already defines `Category` as a name plus a regular expression over the
  purpose line and deliberately left the matching rules open; this change closes them.

## Goals / Non-Goals

**Goals:**

- Manage categories (list, create, edit, delete) through a JSON surface and a browser screen.
- Keep `transactions.category_id` consistent with the current category set after every change,
  using the decided matching rules.
- Reach both screens through one menu bar in the existing layout.
- Reuse the existing schema and the existing shared pool; add no migration.

**Non-Goals:**

- No change to the transactions read endpoint, the transactions table, the importer, or the
  migration files.
- No per-transaction manual category editing; a transaction's category is always derived.
- No ordering, priority, or weight column; precedence is the storage identity alone.
- No authentication, pagination, search, or bulk import of categories.
- No assignment on transaction import; an imported transaction waits for the next category
  change.

## Decisions

### Evaluate and validate with the database's regular expression engine

Assignment uses PostgreSQL's case-insensitive match operator `~*`, which matches a part of the
string rather than anchoring, and which the database offers in the query itself. Validation
compiles a candidate pattern by probing `SELECT '' ~* $1`; the probe raises a SQL error for an
uncompilable pattern, which becomes a client error.

- **Why over a JavaScript `RegExp`:** the same engine then both validates and evaluates, so
  there is no dialect mismatch. It also accepts the domain model's own example
  `(?i)rewe|edeka`, which a JavaScript `RegExp` rejects; and the whole re-evaluation can be one
  `UPDATE`, so no purpose line leaves the database.
- **Alternative considered:** build `RegExp(pattern, 'i')` in Node and update rows one by one.
  Rejected: it loads every transaction into the process, needs two implementations of the
  matching rule (validate and evaluate), and rejects the documented example pattern.
- **Alternative considered:** persist a precomputed match. Rejected: unnecessary, and it would
  duplicate derived data.

### Re-evaluate with one statement, inside one database transaction

Each category mutation and the re-evaluation it triggers run in one `BEGIN`/`COMMIT` against the
shared pool, so the stored references are never observed mid-change.

- **Create / edit:** insert or update the category, then run one global recompute:

  ```sql
  UPDATE transactions AS t
  SET category_id = (
    SELECT c.id FROM categories AS c
    WHERE t.purpose ~* c.pattern
    ORDER BY c.id
    LIMIT 1
  )
  ```

  The scalar subquery is `NULL` when nothing matches, and `ORDER BY c.id LIMIT 1` selects the
  smallest identity. This is idempotent and re-evaluates every transaction as the specs require.

- **Delete:** the foreign key forbids deleting a referenced category, so first reassign only the
  transactions that referenced it, excluding the category being deleted from the candidate set:

  ```sql
  UPDATE transactions
  SET category_id = (
    SELECT c.id FROM categories AS c
    WHERE c.id <> $1 AND purpose ~* c.pattern
    ORDER BY c.id
    LIMIT 1
  )
  WHERE category_id = $1
  ```

  then `DELETE FROM categories WHERE id = $1`. No other transaction can be affected by the
  delete, since removing a category cannot change the winner for a transaction that did not
  reference it.

### The category surface is a small JSON CRUD API

`GET /api/categories` returns `[{ id, name, pattern }]` ordered by `id`. `POST /api/categories`
takes `{ name, pattern }` and returns the created category. `PUT /api/categories/:id` replaces
both fields. `DELETE /api/categories/:id` removes the category. The identity is rendered as a
string, matching how the transactions endpoint renders ids. The regular expression is returned
here, unlike the transactions endpoint, because the screen must show and edit it.

### Validation and error mapping

- Name must be present and non-blank; a duplicate name is caught from the unique constraint
  (SQLSTATE `23505`).
- Pattern must compile (the probe above).
- Unknown identity for edit or delete is a not-found error.
- Database failures return a fixed 500 body and log only an error code, matching
  `transactions.get.ts`; no connection string can reach a response or a log.
- Validation errors are client errors (`400`/`409`/`404`); the stored categories are untouched.

### Frontend: one new page and a menu bar in the existing layout

- A new route at `/categories` (`app/pages/categories.vue`) reads `GET /api/categories` with
  `useFetch` and performs mutations with `$fetch`, refreshing the list on success.
- The menu bar is added to `app/layouts/default.vue` as a `NuxtLink` to `/` and a `NuxtLink` to
  `/categories`, marking the active route. Styling uses the existing Tailwind utility classes;
  no component library is added.
- Deletion asks for confirmation before sending the request, and the confirmation states that
  transactions may be re-categorised.
- The browser evaluates no regular expression; all matching stays on the server.

## Risks / Trade-offs

- **ReDoS / slow patterns** → A pathological user pattern is evaluated inside the database. For a
  single-user local tool this is acceptable; the recompute is one statement and the dataset is
  small. If this grows, a statement timeout is the natural next step.
- **A loose pattern categorises everything** → An empty or permissive expression matches every
  purpose line, which is a faithful reading of "the expression defines membership". The delete
  confirmation and the visible expression make the effect observable.
- **Global recompute on every change** → One `UPDATE` over `transactions` per mutation. Fine at
  this scale; a later change can narrow the update using the old and new patterns if needed.
- **Server-side regex dialect differs from client expectations** → The pattern is not evaluated
  in the browser, and validation uses the same engine that evaluates, so what is stored is what
  can run.
- **Imported transactions stay uncategorised** → This is the chosen trigger (change-time only).
  It is a deliberate trade-off recorded in the `category-assignment` spec.

## Migration Plan

No database migration. The schema already supports the feature. Existing transactions keep a
null `category_id` and become categorised only when a category is created, edited, or deleted.
Rollback is removing the two server route files, the page, and the menu bar; any stored
categories remain but are inert, and no transaction needs to be restored.

## Open Questions

None.
