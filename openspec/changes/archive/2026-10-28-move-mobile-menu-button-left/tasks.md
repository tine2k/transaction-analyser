# Tasks

## 1. Reorder the narrow-viewport masthead

- [x] 1.1 In `app/layouts/default.vue`, move the `mobile-navigation-toggle` button before the brand group inside the masthead's inner row and remove `justify-between` so the row packs from the leading edge; verify the rendered header shows the button left of the logo mark and wordmark at a phone width and that the wordmark still follows the mark immediately.
- [x] 1.2 Extend `tests/components/layout.test.ts` to assert the toggle precedes the brand group in DOM order and that the logo mark remains the wordmark's immediately preceding sibling; verify with `pnpm exec vitest run tests/components/layout.test.ts`.
- [x] 1.3 Confirm the toggle keeps its `data-testid`, `aria-controls`, `aria-expanded`, `aria-label`, 44px square target, and icon swap at both states; verify the existing toggle test in `tests/components/layout.test.ts` passes unchanged.

## 2. Browser coverage for the control's position

- [x] 2.1 Add a browser assertion in `tests/browser/responsive.spec.ts` at a phone width that the toggle's left edge is the masthead's leading content edge and sits left of the wordmark, while the mark stays immediately left of the wordmark; verify with `bash tests/run-with-test-database.sh pnpm exec playwright test tests/browser/responsive.spec.ts`.
- [x] 2.2 Confirm the wide-viewport masthead is unchanged: the toggle is hidden, the brand is at the leading edge, and the five links are directly visible in `tests/browser/responsive.spec.ts`; verify that test passes.
- [x] 2.3 Confirm no page-level horizontal overflow is introduced at 320px, 390px, and desktop widths; verify the existing overflow assertions in `tests/browser/responsive.spec.ts` and `tests/browser/redesign-transactions-screen.spec.ts` pass.

## 3. Integration check

- [x] 3.1 Run `pnpm run test:components` and `pnpm run test:browser` and verify both suites pass.
