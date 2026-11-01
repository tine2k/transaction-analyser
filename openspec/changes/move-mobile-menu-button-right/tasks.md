# Tasks

## 1. Move the disclosure control to the trailing edge

- [ ] 1.1 In `app/layouts/default.vue`, put the brand group (logo mark + `Expenses` wordmark) first and the `mobile-navigation-toggle` button after it inside the masthead's inner row, and justify the row between its children so the control reaches the trailing content edge; verify in headless Chromium at 390 CSS pixels that the toggle's right edge meets the masthead's content right edge, the toggle starts after the wordmark, and the mark remains immediately left of the wordmark.
- [ ] 1.2 Update `tests/components/layout.test.ts` so the masthead assertions expect the brand group as the row's first child, the toggle as its last child, and the logo mark as the wordmark's immediately preceding sibling; verify with `pnpm exec vitest run tests/components/layout.test.ts`.
- [ ] 1.3 Update the phone position assertion in `tests/browser/responsive.spec.ts` to measure the trailing content edge from the header inner's computed right padding, assert the toggle's right edge meets it, assert the toggle follows the wordmark, and keep the 10px mark-to-wordmark gap; verify with `bash tests/run-with-test-database.sh pnpm exec playwright test tests/browser/responsive.spec.ts`.
- [ ] 1.4 Confirm the toggle keeps its `data-testid`, `aria-controls`, `aria-expanded`, `aria-label`, 44px square target, and icon swap in both states, and that the wide-viewport masthead still hides it with the brand at the leading edge and the five links directly visible; verify the existing toggle and wide-navigation tests in `tests/browser/responsive.spec.ts` pass.
- [ ] 1.5 Confirm no page-level horizontal overflow is introduced at 320px and 390px; verify the overflow assertions in `tests/browser/responsive.spec.ts` and `tests/browser/redesign-transactions-screen.spec.ts` pass.

## 2. Integration check

- [ ] 2.1 Run `pnpm run test:components` and `pnpm run test:browser` and verify both suites pass.

## Workflow follow-up

- Archive the change after review.
