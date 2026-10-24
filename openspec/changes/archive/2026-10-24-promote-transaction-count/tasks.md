# Tasks

## 1. Promote the count in the transactions summary

- [x] 1.1 In `app/pages/index.vue`, restructure the summary at `data-testid="visible-total"` so the count is the first and visually dominant figure: render `data-testid="visible-count"` first with the display type face, `text-2xl sm:text-3xl`, `font-semibold`, `tabular-nums`, and `text-ink`, keeping the existing singular/plural wording. Render the existing "Sum of displayed transactions" label and `formatEuroAmount(visibleTotal)` beneath it with `mt-1 text-sm text-muted` and `tabular-nums`, so the count's type size exceeds the sum's and the sum uses the muted colour. Keep both figures inside the loaded-transactions branch and preserve the existing test hooks and exact displayed values. Verify against the component fixture that `visible-count` still reads `4 transactions` and `visible-total` still contains the formatted sum.
- [x] 1.2 Extend `tests/components/transactions.test.ts` to cover the hierarchy without changing the existing value assertions: assert that the `visible-count` text appears before the formatted sum in the `visible-total` text, and that the count keeps its singular, plural, and zero wording after the restructure. Verify with `npm run test:components`.

## 2. Verify the rendered emphasis in headless Chromium

- [x] 2.1 Add `tests/browser/transaction-summary-emphasis.spec.ts`, intercepting the transaction and category APIs with the existing fixture pattern, and assert in headless Chromium that the rendered `visible-count` element has a larger computed font size than the element containing the formatted sum, that `visible-count` uses the primary ink colour while the sum uses the muted colour, and that the count occurs before the sum in document order. Verify with `npm run test:browser`.
- [x] 2.2 Confirm the existing zero-match browser behavior still holds: with a search that matches no transaction, `visible-count` reads `0 transactions` and the summary still shows the locale-formatted euro zero. Verify with `npm run test:browser`.

## 3. Confirm the change fits the project

- [x] 3.1 Run `npm test` (unit, components, and build plus PostgreSQL-backed integration) and confirm every suite passes, proving the summary restructure did not change data requests, filters, sorting, search, selection, or table rendering.
- [x] 3.2 Re-read `openspec/changes/promote-transaction-count/specs/transaction-table/spec.md` against the rendered result and confirm both modified requirements and every scenario are satisfied, including the secondary sum placement and the count's primary emphasis.

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied.
- Verify the archived result.
