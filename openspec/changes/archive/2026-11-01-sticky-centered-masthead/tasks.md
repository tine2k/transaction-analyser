# Tasks

## 1. Pin the masthead

- [x] 1.1 In `app/layouts/default.vue`, add `sticky top-0 z-40` to the `<header class="brand-bar">` element; in `app/assets/css/main.css`, replace the `html, body` rule's `overflow-x: hidden` with `overflow-x: clip` so the root does not become a scroll container. Verify with `pnpm run build` and `pnpm exec vitest run tests/components/layout.test.ts`.
- [x] 1.2 Add `tests/browser/masthead.spec.ts` with headless Chromium checks at 390×844 and 1280×800: after scrolling a long route, the header's top edge is 0, its wordmark and destinations are visible, page content has moved beneath it, and `document.documentElement.scrollWidth` does not exceed the viewport width. Verify with `pnpm run build && bash tests/run-with-test-database.sh pnpm exec playwright test tests/browser/masthead.spec.ts`.
- [x] 1.3 In the same spec, add stacking checks: on `/categories` a table region scrolled under the bar never paints over it, and on `/` at a phone width the fixed bottom action bars stay below the header. Verify with `pnpm run build && bash tests/run-with-test-database.sh pnpm exec playwright test tests/browser/masthead.spec.ts`.
- [x] 1.4 Give the expanded narrow-viewport panel `max-h-[calc(100dvh-7rem)] overflow-y-auto` below `md`, reset at `md`, and add a 640×320 check that all five links remain reachable by scrolling the panel while the header stays pinned. Verify with `pnpm run build && bash tests/run-with-test-database.sh pnpm exec playwright test tests/browser/masthead.spec.ts`.
- [x] 1.5 Add `scroll-padding-top: calc(5rem + var(--safe-area-top, env(safe-area-inset-top, 0px)))` to the scrolling root in `main.css`, then add a keyboard check that a focused control near the top of scrolled content sits below the header's bottom edge. Verify with `pnpm run build && bash tests/run-with-test-database.sh pnpm exec playwright test tests/browser/masthead.spec.ts`.

## 2. Centre the brand group on narrow viewports

- [x] 2.1 In `app/layouts/default.vue`, change the brand row to `grid grid-cols-[44px_minmax(0,1fr)_44px]` with one gap below `md`, place the brand group in the centre column with `justify-self-center`, add an `aria-hidden` trailing spacer, and restore the current flex row with `md:flex` while hiding the spacer at `md`. Keep the disclosure button as the row's first child and the brand group as its second. Verify with `pnpm run build` and `pnpm exec vitest run tests/components/layout.test.ts`.
- [x] 2.2 Update `tests/components/layout.test.ts` to assert the narrow row's grid columns, the button-first and brand-second order, and the trailing spacer's `aria-hidden` and `md:hidden` classes. Verify with `pnpm exec vitest run tests/components/layout.test.ts`.
- [x] 2.3 Update the phone geometry assertion in `tests/browser/responsive.spec.ts` to measure the brand group's horizontal midpoint against the masthead inner content's midpoint at 320 and 390 CSS pixels, with the navigation collapsed and expanded, while the toggle's left edge stays at the content's left edge; keep the wide-viewport check that the mark is leading-aligned. Verify with `pnpm run build && bash tests/run-with-test-database.sh pnpm exec playwright test tests/browser/responsive.spec.ts`.
- [x] 2.4 Confirm the safe-area behaviour is unchanged by the sticky and grid changes and verify `pnpm run build && bash tests/run-with-test-database.sh pnpm exec playwright test tests/browser/mobile-safe-areas.spec.ts` passes.

## 3. Integration check

- [x] 3.1 Run `pnpm run test:components` and verify the whole component suite passes.
- [x] 3.2 Run `pnpm run build && pnpm run test:browser` and verify the whole browser suite, including the new masthead checks and the existing responsive and safe-area specs, passes.

## Workflow follow-up

- Resolve the superseded `move-mobile-menu-button-right` change by discarding it rather than implementing its trailing-edge placement.
- Archive this change after review.
