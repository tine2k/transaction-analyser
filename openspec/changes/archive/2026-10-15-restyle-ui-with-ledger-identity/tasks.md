# Tasks

## 1. Theme foundation

- [x] 1.1 Add `@fontsource-variable/source-serif-4`, `@fontsource-variable/ibm-plex-sans`, and `@fontsource/ibm-plex-mono` to `package.json`; verify `npm install` succeeds.
- [x] 1.2 Define the `@theme` tokens (paper, surface, ink, muted, rule, rule-strong, failure, type families, 4px radius) and import the font CSS (latin subsets, needed weights) in `app/assets/css/main.css`; verify `npm run build` succeeds and the built CSS contains the token values.
- [x] 1.3 Replace `CATEGORY_COLOR_PALETTE` in `app/utils/category-spending.ts` with the euro-ink order from design D2; verify `npm run test:unit` passes and each hue reaches at least 3:1 contrast on white, darkening any that fails.

## 2. Shell

- [x] 2.1 Restyle `app/layouts/default.vue`: paper ground, surface header above a `rule-strong` rule, serif masthead, sans navigation with the current link marked by an ink rule, restyled mobile disclosure; verify `npx vitest run tests/components/layout.test.ts` passes and `npm run build && npm run test:browser -- tests/browser/responsive.spec.ts` passes.

## 3. Transactions screen (representative)

- [x] 3.1 Restyle the filters, the sum line, and the table as a surface sheet with a strong header rule, row hairlines, no zebra, tabular ink amounts, and restyled row selects; verify `npx vitest run tests/components/transactions.test.ts` passes.
- [x] 3.2 Restyle the fixed action bars (`BulkAssignmentBar`, `PatternShortcutBar`): surface ground, top rule, ink solid primary action, outline secondary actions, shadow retained for the float; verify `npx vitest run tests/components/bulk-assignment-bar.test.ts tests/components/pattern-shortcut-bar.test.ts` passes.
- [x] 3.3 Verify the transactions screen in headless Chromium at desktop and 320px (screenshots per `AGENTS.md`): serif scale, contrast, density, focus states, bottom bars over the table; fix the top defects and re-check; verify `npm run build && npm run test:browser -- tests/browser/manual-category-assignment.spec.ts tests/browser/transaction-pattern-shortcut.spec.ts` passes.

## 4. Categories screen

- [x] 4.1 Restyle the category form: surface sheet, serif heading, mono pattern inputs, themed controls, solid-ink submit, failure-colored Delete; verify `npx vitest run tests/components/categories.test.ts` passes.
- [x] 4.2 Restyle the category table to the shared table treatment and verify in headless Chromium at desktop and 320px; verify `npm run build && npm run test:browser -- tests/browser/categories.spec.ts` passes.

## 5. Analytics

- [x] 5.1 Restyle the panels, view/expense controls, and totals lists, and set chart text to the theme's ink/muted values where the ECharts option allows; verify `npx vitest run tests/components/analytics.test.ts tests/components/category-pie-chart.test.ts` passes.
- [x] 5.2 Verify the analytics screen in headless Chromium at desktop and 320px: new palette on slices and indicators, sheet headings, label legibility; verify `npm run build && npm run test:browser -- tests/browser/expense-type-filter.spec.ts` passes.

## 6. Monthly totals and monthly average

- [x] 6.1 Restyle the monthly totals matrix to the shared table treatment; verify `npx vitest run tests/components/monthly-totals.test.ts` passes.
- [x] 6.2 Restyle the monthly average list and controls as a sheet; verify `npx vitest run tests/components/monthly-average.test.ts` passes.
- [x] 6.3 Verify both screens in headless Chromium at desktop and 320px; check row tracking in the wide matrix without zebra and strengthen hairlines if it suffers.

## 7. Imports

- [x] 7.1 Restyle the import table, outcome presentation, and primary Sync now button, and regroup the action row so each control keeps its status beside it; verify `npx vitest run tests/components/imports.test.ts` passes.
- [x] 7.2 Verify the imports screen in headless Chromium at desktop and 320px; verify `npm run build && npm run test:browser -- tests/browser/imports-sync.spec.ts` passes.

## 8. Failure page

- [x] 8.1 Restyle `app/error.vue` and replace the stale "one page so far" copy with text that names the situation and offers the way back; verify by loading an unknown path in the headless browser pass at desktop and 320px and checking the themed rendering and new copy.

## 9. Integration verification

- [x] 9.1 Run the full suite — `npm test` and `npm run test:browser` (installing the lockfile-matched Chromium first if absent) — and confirm every unit, component, browser, and integration test passes.
- [x] 9.2 Final visual sweep: screenshots of all six routes plus the failure page at desktop and 320px; check page-level overflow, visible focus, contrast, absence of stray accent colors, and amounts never colored by sign; record any residual issues honestly.

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied; per `AGENTS.md`, the archive step commits and pushes.
