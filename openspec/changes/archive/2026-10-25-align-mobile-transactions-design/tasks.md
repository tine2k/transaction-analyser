# Tasks

## 1. Full-width shared frame

- [x] 1.1 In `app/layouts/default.vue`, remove `mx-auto` and `max-w-[1280px]` from the masthead's inner `div` and from `<main>`, keep `w-full min-w-0` and the current desktop/phone padding, and update the layout comments to state that the frame spans the viewport. Verify with `pnpm run test:components` that the existing layout navigation tests pass and with a browser evaluation at 1720px that the header inner and `main` widths equal the viewport, `max-width` computes to `none`, and the 40px horizontal padding remains.
- [x] 1.2 Update the browser assertions that pin the 1280px frame in `tests/browser/redesign-transactions-screen.spec.ts` to expect the full viewport at 1720px, and add a check on a second route such as `/people` proving the frame is full-width there too. Verify the spec passes headlessly with `pnpm run test:browser:run -- tests/browser/redesign-transactions-screen.spec.ts`.

## 2. Phone card presentation

- [x] 2.1 In `app/pages/index.vue`, add a reactive phone-presentation flag driven by `window.matchMedia('(max-width: 639.98px)')`, initialise it during client setup, update it on the media query's `change` event, clean up the listener on unmount, and fall back to the table when `matchMedia` is unavailable. Render the card list and the table from `presentedTransactions` as one tree at a time so no transaction id, category select, or test id is duplicated. Verify at 390px that only cards exist and at 768px that only the table exists, using a new browser check.
- [x] 2.2 Build each phone card with the mock's composition and the existing controls: selection checkbox, purpose, ink-coloured amount, category pill/select with manual and update markers, `Booked` and `Value` dates, counterparty, counterparty account or explicit absence, and person. Apply the mock's 18px flat card, 16px padding, 10px internal gap, 15px/700 purpose, 15px/800 amount, 12px/700 pill, and 12px muted meta text, and mark each display region with `data-transaction-field`. Verify with computed-style checks at 390px and with a check that all eight values appear on a rendered card.
- [x] 2.3 Add focused card tests in `tests/browser/` for the phone presentation and update any component or browser assertion that assumes the table exists at 390px, including `tests/browser/responsive.spec.ts` and the phone half of `tests/browser/redesign-transactions-screen.spec.ts`. Verify with `pnpm run test:components` and the new or updated browser specs.

## 3. Card toolbar, sorting, and Load more

- [x] 3.1 Add the phone toolbar above the cards: a select-all checkbox using the existing all/some/none state and `select-all-visible` behavior, a labelled `Sort by` select offering `Default order` plus the eight value columns, and a direction button that is disabled with no sort and toggles ascending/descending otherwise. Route every change through the existing `sort`/`direction` query behavior and make `Default order` remove both query values. Verify that select-all covers the shown view, the sort column and direction update the cards and the query, and the active sort is exposed to assistive technology.
- [x] 3.2 Render the Load more button below the cards only while `hasMoreRows()`, hide the desktop sentinel at phone widths, make each activation append the next batch through the existing batching entry point, and re-arm or disconnect the intersection observer when the viewport crosses the breakpoint. Verify that Load more appends a batch, earlier cards keep their position, the button disappears when every matching card is presented, and desktop scroll batching still works.
- [x] 3.3 Extend the browser tests for the toolbar and batching, including 44px touch targets, the sort/direction round trip, the Load more append and disappearance, and the absence of the sentinel on phones. Verify with `pnpm run test:browser:run -- tests/browser/mobile-transaction-cards.spec.ts` or the equivalent updated spec.

## 4. Phone filter sheet

- [x] 4.1 Restyle the `filter-sheet` grid for phone widths: search field and Search action on one row, Clear below that row when present, Person and Period side by side, Category full width, with labels still available at 12px/700 and every control at 48px high and 12px corners. Preserve the current `md` two-column and `xl` four-column arrangements from `md` up. Verify with computed grid, width, height, radius, and accessible-name checks at 390px and 320px.
- [x] 4.2 Add or update browser checks for the phone filter sheet arrangement, including no page-level horizontal overflow at 320px and the Person, Period, and Category controls remaining operable. Verify with the mobile browser spec and `tests/browser/responsive.spec.ts`.

## 5. Pattern shortcut on cards

- [x] 5.1 Widen the selection helper in `app/pages/index.vue` from a single `td` to either a single `td` or a single `[data-transaction-field]`, find the transaction from the nearest `[data-transaction-id]`, and keep rejecting selections that span two fields or lie outside the active list. Verify that a selection inside one card field raises the action bar with the card's transaction and that a selection across two fields does not.
- [x] 5.2 Update the pattern-shortcut browser and component tests for the card field case and the still-rejected multi-field case. Verify with `pnpm run test:components` and the pattern-shortcut browser spec.

## 6. Integration verification

- [x] 6.1 Run `pnpm run test` and verify unit, component, and PostgreSQL-backed integration tests pass using the project's disposable test database procedure.
- [x] 6.2 Run `pnpm run test:browser` and verify the full headless Chromium suite passes at 320, 390, 768, 1280, and 1720 widths, including the existing category, people, monthly totals, analytics, import, assignment, and pattern-shortcut checks.
- [x] 6.3 Use headless Chromium to inspect the Transactions route at 390×1500 and 320×640 against the `Transactions – Mobile` frame in `design/Finance Tracker Design.html`, and at 768×1024, 1280×800, and 1720×1200 for the table and full-width frame. Confirm the card hierarchy, filter-sheet arrangement, toolbar, Load more, flat card surfaces, ink amounts, and no page-level horizontal overflow.
- [x] 6.4 Run `openspec validate "align-mobile-transactions-design" --strict` and verify the change and all five deltas remain valid.

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied and the implementation is committed.
- When the archive command is invoked, commit all changes and push to the remote; report any commit or push failure.
