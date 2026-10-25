# Tasks

## 1. Typography and theme foundation

- [x] 1.1 Add `@fontsource-variable/plus-jakarta-sans` and remove `@fontsource-variable/ibm-plex-sans` in `package.json`; run `pnpm install` and verify the new latin and latin-ext `wght` font files exist, the darwin arm64 and linux arm64 native packages required by `pnpm-workspace.yaml` are still present, and no lockfile from another package manager was introduced.
- [x] 1.2 In `app/assets/css/main.css`, replace the IBM Plex Sans `@font-face` blocks with self-hosted Plus Jakarta Sans faces for weights 200–800, keep IBM Plex Mono, point `--font-sans` and `--font-display` at the new family, and add `--radius-panel`, `--radius-panel-mobile`, `--radius-control`, and `--shadow-sheet` tokens; verify `pnpm run build` succeeds and the built CSS contains Plus Jakarta Sans and the new tokens with no `IBM Plex Sans Variable` or external font URL.

## 2. Shared masthead and main frame

- [x] 2.1 In `app/layouts/default.vue`, set the wordmark to 20px/800 with desktop −0.02em tracking, desktop navigation to 14px/600 with 10px × 16px padding and a 6px gap, mobile navigation to 15px/600 with 12px corners and a 48px minimum height, add the mock's menu-bar padding and 1280px inner maximum width, and apply the 1280px bounded main frame with 32px/40px/64px desktop and 20px/16px/32px mobile padding; verify the layout component test still passes.
- [x] 2.2 Extend `tests/browser/redesign-transactions-screen.spec.ts` with computed-style checks for the wordmark, desktop and mobile navigation, menu-bar padding, and main-frame width/padding, then run the spec against a headless Chromium build and verify those assertions pass.

## 3. Transactions screen

- [x] 3.1 In `app/pages/index.vue`, set the root type base to 14px, the title to 28px/800 on mobile and 34px/800/−0.02em on desktop, the summary to 14px/15px, the section gaps to 14px/24px, filter labels to 12px/700, and the empty states to 14px, centred, with 40px vertical padding; verify the browser spec's title, summary, label, and empty-state assertions pass.
- [x] 3.2 Give the filter and table sheets `data-testid` hooks, then apply the 18px mobile / 20px desktop panel radius, 14px mobile / 20px × 24px desktop filter padding, 8px × 24px × 16px desktop table padding, and `shadow-none sm:shadow-sheet`; update the browser spec to query the sheets by test id and verify 18px/20px radii, flat mobile shadows, and the desktop `0 1px 3px rgba(40, 30, 120, 0.08)` shadow.
- [x] 3.3 Apply 48px mobile / 44px desktop heights, 12px corners, the mock's horizontal padding, mobile 15px search text, and 700-weight primary actions to the search field, filter selects, and page action buttons; verify the browser spec's desktop and mobile control height, radius, padding, and weight assertions pass and every filter control remains at least 44px high.
- [x] 3.4 Update the table to 12px/700/0.06em headers, 8px horizontal header padding, 13px × 8px body cells, 600-weight booking dates, 700-weight amounts, and the compact 12px/700/5px × 12px category pill inside a 44px hit area; verify the header row stays about 48px, body rows stay about 46px, the existing row and bulk assignment tests still pass, and the browser spec's table and pill assertions pass.
- [x] 3.5 Run `pnpm run test:components` and verify the layout, transactions, pattern-shortcut, and bulk-assignment component tests pass with the new classes and labels; fix any selector that depended on the old sheet/control markup.

## 4. Integration verification

- [x] 4.1 Run `pnpm run test` and verify unit, component, and PostgreSQL-backed integration tests all pass with a disposable test database.
- [x] 4.2 Run `pnpm run test:browser` and verify the full headless Chromium suite passes, including the existing 320/768/1280/1720 responsive checks and the 390px short-control check.
- [x] 4.3 Capture headless Chromium screenshots of the Transactions screen at 1360×1700 and 390×1500 and compare them against the `Transactions – Desktop` and `Transactions – Mobile` frames in `design/Finance Tracker Design.html`, confirming the type family, sizes, density, and desktop sheet shadow match and that the mobile sheets stay flat.
- [x] 4.4 Visit all seven routes in headless Chromium and verify they render in Plus Jakarta Sans, stay within the 1280px frame without page-level overflow at 320/768/1280/1720, and make no external font request.

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied and the implementation is committed.
