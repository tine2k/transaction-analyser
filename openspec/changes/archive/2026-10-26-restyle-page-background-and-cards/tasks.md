# Tasks

## 1. Theme foundation

- [x] 1.1 In `app/assets/css/main.css`, set `--color-paper` to `#e9e7f5` and add `--color-card-border: #d3cfea`; verify `pnpm run build` succeeds and the built CSS carries both token values.
- [x] 1.2 Set the document `theme-color` in `nuxt.config.ts` and `theme_color`/`background_color` in `public/site.webmanifest` to `#e9e7f5`; verify the manifest still parses as JSON with the two new colour values.

## 2. Transactions screen

- [x] 2.1 Add `border border-card-border` to the filter sheet, the desktop table sheet, the three empty-state table sheets, and the phone transaction cards in `app/pages/index.vue`, keeping their existing radius and `shadow-sheet` classes; verify `pnpm run test:components` passes.
- [x] 2.2 Extend the surface assertions in `tests/browser/redesign-transactions-screen.spec.ts` and `tests/browser/mobile-transaction-cards.spec.ts` to expect a `1px solid rgb(211, 207, 234)` border; verify the focused browser checks pass.

## 3. Management screens

- [x] 3.1 On the Categories and People screens, change the form panels and table regions from `rounded-sheet` with `border-rule-strong` to `rounded-panel` with `border-card-border`; verify the existing component tests pass and their class assertions include the card border.
- [x] 3.2 On Imports and Manage, give the table region and the hub sheet the card border, and move the Imports table region to `rounded-panel`; verify the existing component tests pass and their class assertions include the card border.

## 4. Analysis screens

- [x] 4.1 Add `border border-card-border` to the Monthly filter panel, summary cards, chart panel, and table region, the Yearly filter panel, summary cards, and matrix region, and the Monthly average filter panel, summary card, and table region; verify `pnpm run test:components` passes.
- [x] 4.2 Extend the surface class assertions in the Monthly, Yearly, and Monthly average component tests to expect `border-card-border` alongside `shadow-sheet`; verify `pnpm run test:components` passes.

## 5. Verification

- [x] 5.1 Extend `tests/browser/surface-elevation.spec.ts` to assert the page ground, white background, `#d3cfea` border, resting shadow, and the expected 20px radius (18px on the phone Transactions surfaces) for each route at desktop and phone widths; verify the test passes against the new values and would fail against the old paper and border values.
- [x] 5.2 Add a contrast check for ink and muted text against the new paper ground, using the existing `tests/browser/contrast.ts` helper; verify both ratios are at least 4.5:1.
- [x] 5.3 Run `pnpm run test:unit`, `pnpm run test:components`, `pnpm run build`, and `pnpm run test:browser`; verify every suite passes.

## Workflow follow-up

- Archive the change after review, then commit and push the archived change as the project requires.
