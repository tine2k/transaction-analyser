# Tasks

## 1. Palette And Stable Identity

- [x] 1.1 Replace the nine-entry `CATEGORY_COLOR_PALETTE` in `app/utils/category-spending.ts` with the design's twenty main/tint/ink families, derive the exported main list from the families, and apply the eight darkened mains from design D1; update `tests/unit/category-spending.test.ts` to assert twenty unique mains, 3:1 for every main against white, and 4.5:1 for every ink-on-tint pair; run `pnpm run test:unit` and verify the palette tests pass.
- [x] 1.2 Replace the sorted-index assignment in `createCategoryColorMap` with the identity formula from design D2, add the family lookup used by the pill, and give `uncategorised` its neutral analysis colour; add unit tests for `category:1` and `category:21`, a category added or removed beside another, reversed input order, and the neutral entry; run `pnpm run test:unit` and verify the stable-colour tests pass.
- [x] 1.3 Switch the Monthly, Yearly, and Monthly average colour helpers to the stable map and keep each screen's existing `categoryColor(key)` call shape; update the Monthly, Yearly, and Monthly average component assertions that pin palette values, and add a component check that a category keeps the same mark when another category is absent; run `pnpm run test:components` and verify the three screen specs pass.
- [x] 1.4 Change the Transactions category pill to the family's tint ground and ink text, keep `Uncategorised` on its neutral surface pill, and add or update the browser assertion for 4.5:1 pill text and the visible category name; run the Transactions browser spec and verify it passes.

## 2. Monthly Top-Eight Separation

- [x] 2.1 Add an exact-decimal helper that reports whether two category amounts differ by no more than 10% of the larger amount, without floating-point conversion; add unit tests at 9.9%, exactly 10%, and 10.1%; run `pnpm run test:unit` and verify the boundary tests pass.
- [x] 2.2 Add the top-eight resolver from design D3: group by home family, keep the lowest category identity on the home colour, move every later category whose amount is within the threshold of a keeper, and choose replacements from unused home families by maximum minimum ΔE with a deterministic tie-break; add unit tests for one pair, a three-category group, a clearly different pair that keeps the shared colour, and a repeated call that returns the same map; run `pnpm run test:unit` and verify the resolver tests pass.
- [x] 2.3 Wire the resolver into `app/pages/monthly.vue` so the bar segments, legend swatches, and matching table rows all read the resolved colour while rows outside the top eight and the `Other` and `Uncategorised` entries keep their existing treatments; add component and browser tests for a separated pair, the legend/table agreement, and the home colour remaining on a category outside the top eight; run the Monthly component and browser specs and verify they pass.
- [x] 2.4 Confirm the stable home map remains in use on the Yearly, Monthly average, and Transactions screens when the Monthly resolver separates a pair, and add an assertion that the same category still uses its home family outside the Monthly top-eight exception; run the relevant component or browser spec and verify it passes.

## 3. Integration Verification

- [x] 3.1 Extend the browser contrast and palette assertions across the Transactions, Monthly, Yearly, and Monthly average screens so every rendered category mark is checked at 3:1 against its actual surface and every pill text at 4.5:1; run those browser specs and verify the computed-style checks pass.
- [x] 3.2 Run `pnpm run test` and the full browser suite with the disposable test database; verify unit, component, integration, and browser tests all pass.
- [x] 3.3 Inspect the Transactions, Monthly, Yearly, and Monthly average screens in headless Chromium at 1360px and 390px widths; verify the twenty-family palette, darkened mains, tint/ink pills, neutral `Uncategorised` and `Other`, the top-eight separation, and no page-level horizontal overflow.

## Workflow Follow-up

- Archive the change after the project's review requirements are satisfied.
- Verify the archived result and the updated main specs.
