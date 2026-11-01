# Tasks

## 1. Paint the status-bar cap

- [x] 1.1 Add `div.status-cap` as the first child of the layout root in `app/layouts/default.vue` with `aria-hidden="true"` and `data-testid="status-cap"`; verify the component test can select it and that no route or the failure page loses the layout.
- [x] 1.2 Add the `.status-cap` rule to `app/assets/css/main.css`: fixed at the top edge, full width, `height: var(--safe-area-top, env(safe-area-inset-top, 0px))`, `background-color: var(--color-brand-bar-from)`, `pointer-events: none`, and above the header in paint order; verify with the browser metrics that its height follows the simulated 47px inset and is zero without one.
- [x] 1.3 Keep the masthead's gradient, top safe-area padding, and content placement unchanged; verify the existing safe-area browser assertions for header padding, wordmark position, and no horizontal overflow still pass.

## 2. Tests

- [x] 2.1 In `tests/components/layout.test.ts`, assert the cap is the layout's first element, is `aria-hidden`, and carries no text; verify with `pnpm exec vitest run tests/components/layout.test.ts`.
- [x] 2.2 In `tests/browser/mobile-safe-areas.spec.ts`, extend the frame metrics with the cap's position, size, and background, assert it is fixed at the top, spans the viewport, is 47px high, and computes to `rgb(16, 27, 93)` when the inset is simulated, and assert a zero height in the no-inset case; verify with `bash tests/run-with-test-database.sh pnpm exec playwright test tests/browser/mobile-safe-areas.spec.ts`.
- [x] 2.3 Confirm the delivered document still carries exactly one `apple-mobile-web-app-status-bar-style` metadata value of `default` and that the theme colour is `#101B5D`; verify the existing integration assertions pass.

## 3. Full check

- [x] 3.1 Run `pnpm run test:components`, `pnpm run test:integration`, and `pnpm run test:browser` and verify all pass.

## Workflow follow-up

- Archive the change after review.
