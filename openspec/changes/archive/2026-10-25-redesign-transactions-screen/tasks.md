# Tasks

## 1. Theme foundation

- [x] 1.1 Replace the theme tokens in `app/assets/css/main.css` with the paper, surface, ink, muted, rule, brand, brand-soft, gradient, sheet-radius, and pill-radius values from design.md D1; verify `npm run build` succeeds and the generated CSS carries the new tokens.
- [x] 1.2 Point the `font-display` token at IBM Plex Sans Variable with a heavy display weight, remove the Source Serif 4 `@font-face` blocks, and remove `@fontsource-variable/source-serif-4` from `package.json` and the lockfile; verify `npm run build` succeeds and `grep -r "Source Serif" app package.json` finds nothing.
- [x] 1.3 Replace the remaining hardcoded old ink values in `app/pages/analytics.vue` (chart text and label colours) and the action-bar shadows with the new ink-tinted values; verify `grep -rn "#20242B\|32,36,43" app` finds nothing and `npx vitest run tests/components/analytics.test.ts` passes.

## 2. Shared top bar

- [x] 2.1 Rework `app/layouts/default.vue` into the gradient brand bar: white `Expenses` wordmark, seven text-only pill links, a solid active pill keyed to `aria-current`, and the existing mobile disclosure with the same test id and ARIA attributes; verify the mobile toggle still opens and closes the seven links in `npx vitest run tests/components/layout.test.ts`.
- [x] 2.2 Update `tests/components/layout.test.ts` for the new brand selector, text-only links, active-pill distinction, and preserved disclosure behaviour; verify the test passes and asserts all seven labels and hrefs.
- [x] 2.3 Check the bar in headless Chromium at 320, 768, 1024, and 1720 widths with a temporary screenshot under `/tmp/opencode`: links wrap or collapse without page overflow, focus is visible on the gradient and inside white pills, the active pill is distinguishable without colour alone, and phone links are at least 44px high; do not commit the screenshot.

## 3. Page header, summary, and filter sheet

- [x] 3.1 Restructure the top of `app/pages/index.vue`: the `Transactions` heading, the one-line `visible-total` summary directly beneath it (count first, `·`, existing sum label), and a white rounded filter sheet holding the search form plus Person, Period, and Category; verify the page mounts and the filters still update the rows in `npx vitest run tests/components/transactions.test.ts`.
- [x] 3.2 Style the filter sheet and controls: small field labels, a brand Search button, neutral Clear and selects, one-column phone layout and a wide desktop search track; verify at 320px in headless Chromium that every control is at least 44px high and the page has no horizontal overflow.
- [x] 3.3 Rewrite `tests/browser/transaction-summary-emphasis.spec.ts` for the single-line summary: count before sum, both at the interface size, count ink and sum muted, summary beneath the title and above the filters, and both zero-state values; verify the spec passes against the built server.
- [x] 3.4 Update the transaction component tests that assert the old separate summary block, filter order, or summary markup; verify `npx vitest run tests/components/transactions.test.ts` passes.

## 4. Table and category pills

- [x] 4.1 Reorder `sortableColumns` and the row template to selection, booking date, value date, purpose, counterparty name, counterparty account, person, category, amount; render dates as `28 Oct 2026` while keeping `<time datetime>` raw; verify the header order, amount-last alignment, and sort behaviour in the component tests.
- [x] 4.2 Update the position-based component assertions and `tests/browser/transaction-pattern-shortcut.spec.ts` cell indices for the new column order; verify `npx vitest run tests/components/transactions.test.ts` passes and the shortcut spec still captures purpose and counterparty text.
- [x] 4.3 Add the `category:<id>` / `uncategorised` colour map and render the category select as a pastel pill with a decorative chevron, neutral Uncategorised styling, and the existing manual/update markers; verify component tests assert the pill style, the category name, the options list, and the disabled state.
- [x] 4.4 Style the table sheet: header row uppercase and letter-spaced, roomy rows with rule separators, hover ground, rounded sheet, and the existing scroll region; verify at 320px in headless Chromium that the table still scrolls inside its region, the header accessible names and `sort-*` test ids are unchanged, and the page does not scroll horizontally.

## 5. Action bars and remaining screens

- [x] 5.1 Update `app/components/BulkAssignmentBar.vue` and `app/components/PatternShortcutBar.vue` for the new sheet radius, surface, and brand primary action, keeping the bottom stack and elevation; verify `npx vitest run tests/components/bulk-assignment-bar.test.ts tests/components/pattern-shortcut-bar.test.ts` passes and the bars still clear the table at phone widths.
- [x] 5.2 Check the other six screens inherit the new tokens without layout regressions: titles now sans, no old serif or ink values, and no page overflow at phone, tablet, and desktop widths in headless Chromium; verify `npx vitest run tests/components` passes.

## 6. Browser verification

- [x] 6.1 Add `tests/browser/redesign-transactions-screen.spec.ts` covering the gradient top bar and active pill, the title-summary-sheets order, sheet radii, category pill presentation, amount as the last column, absence of Previous/Next pagination, and the preserved batch sentinel; verify `npm run build && npm run test:browser` passes.
- [x] 6.2 In the same spec, cover 320, 768, 1280, and 1720 widths: no page-level horizontal overflow, 44px touch targets on phones, seven reachable links, and the category pill still operable; verify the spec passes in headless Chromium.
- [x] 6.3 Run the full suite: `npm run test:unit`, `npm run test:components`, `npm run test:integration`, and `npm run test:browser`; verify every suite passes with no skipped new checks.
- [x] 6.4 Capture a 1720-wide headless screenshot of `/` and compare its structure and spacing against `design/Transactions – Desktop.pdf` (top bar, title, summary, filter sheet, table sheet, pills, amount last); keep the screenshot out of the commit.

## Workflow follow-up

- Archive the change after review and implementation are complete.
