# Tasks

## 1. Category Palette

- [x] 1.1 Replace `CATEGORY_COLOR_PALETTE` in `app/utils/category-spending.ts` with the nine values and order from design D1, and add a unit test that computes the WCAG contrast of every value against white and asserts at least 3:1; run `pnpm run test:unit` and verify the palette test passes.
- [x] 1.2 Re-read the stable-colour unit test with the new palette and update it only if it pins the old values; run `pnpm run test:unit` and verify the sorted-identity mapping still matches the exported constant.

## 2. Pills And Other

- [x] 2.1 Change the category pill text mix in `app/pages/index.vue` from 72% colour and 28% ink to 50% colour and 50% ink, keeping the 16% ground and 32% border; add a browser assertion that a categorised pill's computed text contrast against its background is at least 4.5:1, and run the transactions browser spec.
- [x] 2.2 Add `--color-neutral-strong: #8A87A0` to `app/assets/css/main.css`, use it for the Monthly `Other` bar segment and legend swatch, and add a component or browser assertion that both resolve to the same neutral colour with at least 3:1 contrast against the surface; run the Monthly component spec.

## 3. Integration Verification

- [x] 3.1 Run `pnpm run test` and the browser suite, and verify the unit, component, integration, and browser tests all pass.
- [x] 3.2 Inspect the Transactions, Monthly, and Yearly screens in headless Chromium at 1360px and 390px widths against the design frames, and verify category marks stay visible, no pill text drops below 4.5:1, and no category indicator drops below 3:1.
- [x] 3.3 Give the Monthly share bar's empty track a surface ground with a rule outline so every category fill clears 3:1, and assert every share bar in the Monthly browser spec.

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied.
- Verify the archived result and the updated main specs.
