# Proposal

## Why

A category is currently defined by a single regular expression, so grouping several spellings
of the same merchant means either one cramped alternation (`rewe|rewe markt|rewe center`) that
is hard to read and edit, or several near-duplicate categories that collide on precedence. Real
statements describe one merchant many ways, so a category should be able to carry several
expressions and match a purpose line when any one of them matches.

## What Changes

- A **category carries a list of regular expressions** instead of a single one. It matches a
  purpose line when **at least one** of its expressions matches (union / OR), keeping the
  existing case-insensitive, unanchored substring behaviour for each expression.
- The **category management surface** returns `patterns` (an array of strings) in place of
  `pattern`, and create/edit requests carry `patterns`. **BREAKING** for the category JSON body
  and response shape.
- A create or edit **requires at least one expression**; every expression in the list must
  compile as a regular expression before anything is stored.
- The **category management screen** offers one or more expression fields per category and shows
  every expression a category holds.
- The **database shape** keeps one row per category: the single `pattern text` column becomes a
  `patterns text[]` column, so a category with several expressions is still one row and no new
  table is introduced.
- Existing rows migrate additively: each stored single `pattern` becomes a one-element
  `patterns` array, so no category loses its expression and no transaction is re-evaluated
  merely by the migration.
- Precedence between categories is unchanged: among the categories that match, the matching
  category with the **smallest identity** still wins. Multiple expressions within one category
  are alternatives, not separate competitors.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `transaction-domain-model`: the `Category` contract changes from a name plus a single regular
  expression to a name plus one or more regular expressions, whose union defines membership.
- `transaction-postgres-schema`: the `categories` row holds a list of expressions in one
  `text[]` column rather than a single text expression, while remaining one row per category.
- `category-assignment`: matching is redefined so a category matches when any one of its
  expressions matches the purpose line.
- `category-management-api`: the category JSON shape and the create/edit validation change from a
  single `pattern` to a `patterns` list.
- `category-management-screen`: the form and the listing handle a list of expressions per
  category instead of a single one.

## Impact

- `db/migrations/`: a new additive migration converting `categories.pattern` to
  `categories.patterns text[]`, preserving each existing expression as a one-element array.
- `server/utils/categories.ts`: input reading, validation, the matching subqueries, and the
  returned `Category` shape.
- `server/api/categories/`: the create, edit, and list handlers and their JSON bodies.
- `app/pages/categories.vue`: the create/edit form and the listing columns.
- `GET /api/transactions` and the transactions table are unaffected: a transaction still exposes
  a single referenced category, not the category's expressions.
- The importer is unaffected; it writes uncategorised transactions as before.
