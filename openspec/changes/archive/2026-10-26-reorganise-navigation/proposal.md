# Proposal

## Why

The shared menu bar gives seven destinations equal visual weight. Categories, People, and Imports are used rarely, so they compete with the daily Transactions screen and the three analysis screens. They are not the same kind of rare: Categories is needed when a payee has no matching rule, while People and Imports are occasional administration. Presenting all three as peer pills makes the bar the loudest part of every screen without earning it.

## What Changes

- The menu bar drops from seven pills to five: Transactions, Monthly, Yearly, Monthly average, and Manage.
- Categories leaves the bar. The Transactions screen carries a `Manage categories` link beside the Category filter, where the need to create or edit a matching rule arises.
- A new `/manage` hub carries People, Categories, and Imports as status rows. Each row shows a count or the latest import outcome and links to the existing screen.
- The existing `/categories`, `/people`, and `/imports` routes stay. No redirects and no broken URLs.
- Manage is marked as the current section on `/manage`, `/categories`, `/people`, and `/imports`; the three screens no longer need their own bar links.
- Route naming is separated from bar membership, so `/categories` keeps `Categories · Expenses` without appearing in the bar, and `/manage` is named `Manage · Expenses`.
- The hub reads the existing people, categories, and imports endpoints. No API, database, or configuration change.
- **BREAKING** for the navigation contract: all seven destinations are no longer peers in the menu bar. Categories, People, and Imports remain reachable, but not as bar links.

## Capabilities

### New Capabilities
- `manage-hub`: the `/manage` screen, its status rows, its links to the three management screens, and its loading, empty, and failure states.

### Modified Capabilities
- `frontend-shell`: route inventory (eight routes), menu destinations (five), document titles, and current-section marking.
- `responsive-frontend`: navigation says five, the Categories link and the hub remain usable at 320 CSS pixels, and the hub reflows.
- `category-management-screen`: the menu-bar requirement becomes a Transactions-screen link and a hub row; stale analytics and monthly-totals names are removed.
- `person-management-screen`: reached through the Manage hub rather than a dedicated bar link.
- `transaction-table`: the Transactions screen carries the category-management link beside the Category filter.

## Impact

- `app/layouts/default.vue`: navigation list, title map, current-section marking, and mobile drawer.
- `app/pages/index.vue`: the `Manage categories` link in the filter sheet.
- New `app/pages/manage.vue`: the hub screen.
- Tests: `tests/components/layout.test.ts`, `tests/browser/redesign-transactions-screen.spec.ts`, `tests/browser/responsive.spec.ts`, `tests/browser/document-title.spec.ts`, and new hub component and browser tests; the phone touch-size selector must include the in-page Categories link.
- Docs: the README's screen references may need a review.
- No changes to APIs, database schema, migrations, or deployment configuration.
