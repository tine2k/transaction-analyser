# Design

## Context

The monthly totals page (`app/pages/monthly-totals.vue`) already builds a category-by-month matrix and renders one `<td>` per month and category, showing an empty string for exact-zero totals. The index route (`app/pages/index.vue`) already resolves `category` and `month` query values into its filter controls, and the analytics page (`app/pages/analytics.vue`) already emits those query values from its month headings, category totals, and pie slices through `categoryFilterValue(key)` and `transactionLocation(month, key)`. See `proposal.md` for motivation and the spec delta for the behavior contract.

## Goals / Non-Goals

**Goals:**

- Make populated cells navigate to the transactions screen with the cell's month and category pre-selected.
- Reuse the existing query contract and link shape rather than inventing a second navigation convention.
- Keep blank cells non-interactive and visually unchanged.
- Preserve the table's single data request and all existing totals behavior.

**Non-Goals:**

- Reworking the table markup, the matrix helper, or the index filter logic.
- Adding per-transaction deep links, server-side filtering, or new endpoints.
- Changing the analytics page or the shared navigation.

## Decisions

- **Emit the existing filter query contract.** Each populated cell links to `{ path: '/', query: { month: month.key, category: categoryFilterValue(category.key) } }`, where the category key `category:<id>` maps to `<id>` and `uncategorised` maps to `uncategorised`. This matches the analytics page and the index route's documented `month`/`category` handling, so no new contract is introduced. Reusing the analytics helper logic (a small local function mirroring `categoryFilterValue`) avoids coupling two pages through a shared module for one line; extracting a shared helper is an acceptable alternative but not required.
- **Use a real `NuxtLink` (`<a>`) per populated cell.** A link, not a click handler on the `<td>`, gives native keyboard activation, middle-click/open-in-new-tab, and link semantics. The anchor wraps the cell's displayed amount only, so the blank cells remain plain `<td>` elements. The cell (`<td>`) keeps its existing test id and data attributes.
- **Apply the hover affordance with Tailwind utilities on the link.** A background tint plus a short color transition (for example `hover:bg-slate-200` with `transition-colors`), consistent with the project's existing Tailwind usage. Blank cells get no such classes and no pointer affordance.
- **Decide interactivity from the displayed amount.** The same condition that decides whether a cell shows an amount (`displayTotal(...) !== ''`) decides whether it renders a link; this keeps the value and the affordance from drifting apart.

## Risks / Trade-offs

- [Wrapping the amount in a link could change the cell's existing text assertions or accessibility reading] → Keep the link's text equal to the formatted amount and keep the `<td>` structure, test id, and data attributes unchanged; assert the link target in component tests.
- [A stale or invalid cell value could link to a filter the index route rejects] → The index route already validates and falls back for invalid `month`/`category` query values, so the link degrades to a sensible default rather than an error.
- [Hover-only affordance is inaccessible to keyboard users] → Use a real focusable link; the transaction screen's filter initialization is the observable outcome on activation, so keyboard and pointer paths are equivalent.

## Migration Plan

No data migration or API rollout. Deploy the client-side change with the existing application; rollback is a code revert. Existing `/monthly-totals` and index links continue to behave as before.
