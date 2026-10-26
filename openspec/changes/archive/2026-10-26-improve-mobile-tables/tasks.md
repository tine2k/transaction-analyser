# Tasks

## 1. Shared scroll affordance and Monthly table

- [x] 1.1 Add `app/utils/table-overflow.ts` to set `data-overflow-start` / `data-overflow-end` on a scroll wrapper using a passive scroll listener and a `ResizeObserver`, and add the wrapper gradient/shadow classes and `overscroll-behavior-x: contain` to `app/assets/css/main.css`. Verify with a browser assertion in `tests/browser/responsive.spec.ts` that the Monthly wrapper flips both attributes at the scroll ends and that `window.scrollX` stays `0` during a sideways drag.
- [x] 1.2 In `app/pages/monthly.vue`, render the phone column order Category, Amount, Share, Transactions and pin the Category header and row header with an opaque background and seam shadow, restoring the desktop order from `sm` up. Verify with a browser test at 390px that Category and Amount are both visible at `scrollLeft = 0`, the Category cell's left edge stays at the region's edge after scrolling, and the row link targets and row order are unchanged.
- [x] 1.3 Compact the Monthly share column and cell padding below `sm`, keep `min-w` only as needed, and keep every category, amount, share, and transaction count reachable at 320px. Update the Monthly assertions in `tests/browser/responsive.spec.ts`; verify `tests/browser/monthly.spec.ts` and the updated responsive checks pass with `pnpm run build && pnpm run test:browser -- tests/browser/monthly.spec.ts tests/browser/responsive.spec.ts`.

## 2. Yearly matrix

- [x] 2.1 In `app/pages/yearly.vue`, pin the Category header and row header, use three-letter month headings with an `sr-only` full month name, and apply compact phone cell metrics that reduce the matrix's natural width. Verify at 320px and 390px that Category stays pinned at the scroll end, December and Total are reachable, and each heading exposes `January`…`December` to assistive technology.
- [x] 2.2 Verify the compact matrix changes no values, tints, not-yet-elapsed markers, or link targets, and update the Yearly assertions in `tests/browser/responsive.spec.ts` while confirming the table gap and hint checks in `tests/browser/table-spacing.spec.ts` still hold. Run `pnpm run build && pnpm run test:browser -- tests/browser/yearly.spec.ts tests/browser/table-spacing.spec.ts tests/browser/responsive.spec.ts` and confirm they pass.
- [x] 2.3 Confirm the Yearly matrix still produces no page-level horizontal overflow at 320px after the width change; verify with the existing overflow evaluation in `tests/browser/responsive.spec.ts`.

## 3. Category table

- [x] 3.1 In `app/pages/categories.vue`, pin the Name header and cell at the leading edge and the Actions header and cell at the trailing edge, with opaque backgrounds and seam shadows. Cap the phone Name cell at 7rem with `break-words` so a long category name wraps instead of consuming the viewport. Verify at 320px and 390px that Name and Actions stay pinned after scrolling and the full name remains present.
- [x] 3.2 Make each row's Edit and Delete controls icon-only below `sm`, 44x44, with accessible names containing the category name, and restore the visible text labels from `sm` up. Verify with a browser test that the names identify the action and category, both hit areas are at least 44px, editing loads the right category, and deleting still asks for confirmation.
- [x] 3.3 Update the category assertions in `tests/browser/responsive.spec.ts` and run `pnpm run build && pnpm run test:browser -- tests/browser/categories.spec.ts tests/browser/responsive.spec.ts`; confirm every column, value, and row action remains reachable and the page has no horizontal overflow.

## 4. Monthly average cards

- [x] 4.1 In `app/pages/monthly-average.vue`, add the `(max-width: 639.98px)` `matchMedia` flag with a table fallback and render exactly one tree: category cards below `sm`, the semantic table from `sm` up. Each card shows the name and palette mark, a labelled trend over the applied months, a labelled exact `<N>-month total`, a labelled exact `Avg / month`, and the relative average bar, with the trend and bar `aria-hidden`. Verify with a component test that every exact value is text, the trend is hidden from assistive technology, and no table and card duplicate the same category in one rendering.
- [x] 4.2 Add a visible sort statement beside the phone sort controls naming the active column and direction, updating when either control changes, and keep the table header sort state from `sm` up. Verify with a component or browser test that the statement updates after a column change and a direction change.
- [x] 4.3 Add browser tests at 390px for cards and at 768px for the table, and update the Monthly average assertions in `tests/browser/responsive.spec.ts` so the scroll-region check applies only where the table is rendered. Run `pnpm run build && pnpm run test:browser -- tests/browser/monthly-average.spec.ts tests/browser/responsive.spec.ts` and confirm they pass.
- [x] 4.4 Confirm the existing sorting, window, person, and expense-type behaviour is unchanged by running `pnpm run test:components` and `pnpm run build && pnpm run test:browser -- tests/browser/monthly-average.spec.ts`; both suites must pass.

## 5. Import log

- [x] 5.1 In `app/pages/imports.vue`, add a phone viewport flag and render priority columns (Started, Source, Outcome, Written) plus a disclosure cell below `sm`, and the existing ten columns from `sm` up. Verify with a browser test at 390px that the priority columns are visible before expansion and at 768px that all ten columns are present with no disclosure cell.
- [x] 5.2 Add the in-row detail `<tr>` containing Person, Mode, Read, Already stored, Categorised, and Reason, with a 44px disclosure whose accessible name names the run, exposes `aria-expanded`, and points at the detail row through `aria-controls`. Expanding must make no `/api/easybank/sync` request, and a refresh that removes the run must clear the expanded state. Verify with browser assertions for the fields, the state, the request count, and the touch target.
- [x] 5.3 Update the import log assertions in `tests/browser/responsive.spec.ts` if needed and run `pnpm run build && pnpm run test:browser -- tests/browser/imports-sync.spec.ts tests/browser/responsive.spec.ts`; confirm the desktop log, sync controls, empty state, and failure state still pass.

## 6. Integration verification

- [x] 6.1 Run `pnpm run test:unit`, `pnpm run test:components`, and `pnpm run test:integration`; confirm all pass with a disposable test database and no inherited `DATABASE_URL`.
- [x] 6.2 Build and run the full browser suite with `pnpm run build && pnpm run test:browser`; confirm every route at 320, 390, 768, and 1280 CSS pixels has no page-level horizontal overflow, every table value remains reachable, and every phone control keeps a 44px hit area.
- [x] 6.3 Confirm the Transactions cards, People table, and shared frame are unchanged by running `pnpm run test:browser -- tests/browser/mobile-transaction-cards.spec.ts tests/browser/people.spec.ts tests/browser/responsive.spec.ts`; confirm their assertions pass without edits.

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied.
- Verify the archived result and the updated main specs.
