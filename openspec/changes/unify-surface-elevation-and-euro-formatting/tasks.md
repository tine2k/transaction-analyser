# Tasks

Apply this change on the final code of `replace-monthly-totals-with-yearly-screen` (or after it is archived), because `app/pages/yearly.vue` is introduced there.

## 1. Euro symbol gap

- [x] 1.1 Update `formatEuroAmount` in `app/utils/category-spending.ts` to insert one non-breaking space (`\u00A0`) after the currency part only when the locale places the symbol before the amount and no literal already follows it; leave symbol-after and existing-separator locales untouched. Verify with unit tests for `en-US`, `de-DE`, and `nl-NL`.
- [x] 1.2 Replace the locale-dependent formatter expectations in `tests/unit/category-spending.test.ts` with explicit locales: `en-US` `€\u00A016.50`, `en-US` negative `-€\u00A00.01`, `en-US` zero `€\u00A00`, large exact `de-DE` unchanged, and `nl-NL` `€\u00A01.234,50`. Run `pnpm run test:unit` and confirm every case passes.
- [ ] 1.3 Update the hardcoded euro text in `tests/browser/expense-type-filter.spec.ts` and `tests/browser/yearly.spec.ts` to the spaced form, and confirm the existing `\s*` regex in `tests/browser/transaction-summary-emphasis.spec.ts` still matches. Run those three specs with `pnpm run test:browser` and confirm they pass.

## 2. Analysis table top gap

- [ ] 2.1 In `app/pages/monthly.vue`, wrap the scroll hint and the category table scroll region in one block with `mt-4`, remove `mt-5` from the hint while keeping `mb-2`, and leave the empty-state paragraph unchanged. Verify the computed `marginTop` of the new wrapper is 16px in the browser.
- [ ] 2.2 Apply the same wrapper and margin move to the Yearly matrix in `app/pages/yearly.vue`. Verify the computed `marginTop` of the new wrapper is 16px in the browser.
- [ ] 2.3 Add a browser assertion covering both analysis routes: at a desktop width the hint is hidden while the table is visible and the wrapper is 16px below the preceding surface; at a phone width the hint remains visible inside the same 16px wrapper. Verify the assertion passes.

## 3. Transactions surfaces

- [ ] 3.1 In `app/pages/index.vue`, change the filter sheet, the table sheet, and the three empty-state sheets from `shadow-none sm:shadow-sheet` to `shadow-sheet` at every width, and add `shadow-sheet` to the phone transaction card. Keep the fixed action bars' stronger upward shadow. Verify with computed-style browser checks at phone and desktop widths.
- [ ] 3.2 Update `tests/browser/redesign-transactions-screen.spec.ts` and `tests/browser/mobile-transaction-cards.spec.ts`: the phone card and phone empty sheet now carry `rgba(40, 30, 120, 0.08)`, and the desktop sheet expectations stay unchanged. Run both specs and confirm they pass.

## 4. Remaining content surfaces

- [ ] 4.1 Add `shadow-sheet` to the create/edit form sheet and the table scroll region in `app/pages/categories.vue` and `app/pages/people.vue`, keeping their existing borders. Add component assertions that each rendered surface carries the shadow class and verify with `pnpm run test:components`.
- [ ] 4.2 Add `shadow-sheet` to the import-log table region in `app/pages/imports.vue` and the category-average list in `app/pages/monthly-average.vue`. Add component assertions for both surfaces and verify with `pnpm run test:components`.
- [ ] 4.3 Add `shadow-sheet` to the Monthly filter panel, both summary cards, the bar panel, and the table region in `app/pages/monthly.vue`, and to the Yearly filter panel, both summary cards, and the matrix region in `app/pages/yearly.vue`. Add component assertions for every surface and verify with `pnpm run test:components`.

## 5. Integration checks

- [ ] 5.1 Add a browser check that visits each of the seven routes and confirms one representative surface computes to the resting shadow at both a phone and a desktop width, without changing the existing layout or overflow assertions. Verify with `pnpm run test:browser`.
- [ ] 5.2 Run `pnpm run test:unit` and `pnpm run test:components` and confirm every suite passes.
- [ ] 5.3 Run `pnpm run test:integration` and `pnpm run build` and confirm both succeed with no new dependency.
- [ ] 5.4 Run `openspec validate "unify-surface-elevation-and-euro-formatting" --strict` and confirm the change is valid.
- [ ] 5.5 Inspect `git diff --name-only` and confirm the change touches only the application surfaces, formatter, change artifacts, and tests named above; no API route, database migration, or package manifest is modified.

## Workflow follow-up

- Archive this change after the project's review requirements are satisfied.
