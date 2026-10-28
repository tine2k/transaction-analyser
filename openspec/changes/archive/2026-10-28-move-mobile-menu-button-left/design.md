# Design

## Context

See proposal.md for motivation and `specs/frontend-shell/spec.md` for the requirement.

`app/layouts/default.vue` renders the masthead as an outer `flex-col` row that becomes `md:flex-row`. Its first child is an inner `flex items-center justify-between` row holding the brand group (logo mark + `Expenses` wordmark) and the mobile disclosure button; the second child is the `#screen-navigation` link list. The button is hidden from `md` up, where the brand sits at the leading edge and the five links follow directly.

The panel is the only masthead; the mobile disclosure contract (`data-testid="mobile-navigation-toggle"`, `aria-controls="screen-navigation"`, `aria-expanded`, `aria-label`, 44px square target, icon swap) is covered by existing component and browser tests.

## Goals / Non-Goals

**Goals:**

- Make the disclosure control the leading item of the narrow-viewport masthead.
- Keep logo mark and wordmark adjacent, in that order, directly after the control.
- Leave the wide-viewport masthead visually unchanged.

**Non-Goals:**

- Changing the disclosure control's icon, label, state, target size, or keyboard behavior.
- Changing the desktop navigation order, the route list, or any screen content.
- Turning the logo or wordmark into a link.

## Decisions

**D1: Reorder the markup instead of relying on CSS order utilities.** Place the disclosure button before the brand group in the inner row, and drop `justify-between` so the two children pack from the leading edge. With the button placed first in the DOM, keyboard and screen-reader order match the visual order, and no `order-*` or `flex-row-reverse` rules are needed that would desynchronise visual and focus order.

Alternative considered: `flex-row-reverse` on the mobile row, or `order-first` on the button. Both move the control visually while leaving the brand first in the DOM, so focus would move right-to-left across the masthead. Rejected.

Alternative considered: keep `justify-between` and reverse the row, leaving the wordmark at the trailing edge. Rejected because the existing design keeps the masthead's brand left-aligned, and the proposal keeps the mark and name as a leading pair.

**D2: Keep the control out of the wide-viewport flow.** The existing `md:hidden` stays, so the desktop masthead is unaffected by the markup order. With the button hidden, the brand group is the inner row's only visible child, and the outer row still places the brand before the navigation links.

**D3: Preserve the identity pair's adjacency.** The inner row's existing `gap-4` separates the control from the brand group; inside the brand group the existing `gap-2.5` still puts the mark immediately left of the wordmark, satisfying the `frontend-shell` requirement.

## Risks / Trade-offs

- **The wordmark shifts right on narrow screens** → Expected consequence of placing a control ahead of it; the mark stays adjacent and the touch target is unchanged, so the identity still reads correctly.
- **Layout regressions at the `md` breakpoint** → The button is hidden at `md`, so only the mobile flex justification changes; the existing desktop metrics test still asserts the brand and link positions.
- **Tests that assert the control's position do not exist yet** → Add a component assertion on DOM order and a browser assertion on horizontal placement at a phone width (see tasks).

## Migration Plan

Single frontend layout change; no data, API, or configuration migration. Reverting the commit restores the previous order with no follow-up steps.
