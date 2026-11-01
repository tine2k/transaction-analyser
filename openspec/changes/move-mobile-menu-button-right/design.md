# Design

## Context

See `proposal.md` for motivation and `specs/frontend-shell/spec.md` for the requirement.

`app/layouts/default.vue` renders the masthead as an outer `flex-col` row that becomes `md:flex-row`. Its first child is an inner `flex items-center gap-4` row that currently holds the mobile disclosure button first and the brand group (logo mark + `Expenses` wordmark) second, so on narrow viewports the control leads and the identity follows. The second child is the `#screen-navigation` link list. The button is hidden from `md` up, where the brand sits at the leading edge and the five links follow directly.

The masthead's horizontal insets come from `.frame-safe-inline` (at least 16px, or 40px from `sm` up) compounded with the safe-area environment; the existing browser checks measure the padding from computed style rather than assuming 16px.

The disclosure contract (`data-testid="mobile-navigation-toggle"`, `aria-controls="screen-navigation"`, `aria-expanded`, `aria-label`, 44px square target, icon swap) and the identity pair's 10px mark-to-wordmark gap are covered by existing component and browser tests.

## Goals / Non-Goals

**Goals:**

- Make the disclosure control the trailing item of the narrow-viewport masthead.
- Keep the logo mark and wordmark as the leading pair, in that order.
- Leave the wide-viewport masthead visually unchanged.

**Non-Goals:**

- Changing the disclosure control's icon, label, state, target size, or keyboard behavior.
- Changing the desktop navigation order, the route list, or any screen content.
- Turning the logo or wordmark into a link.
- Changing where the expanded navigation links appear.

## Decisions

**D1: Reorder the markup instead of relying on CSS order utilities.** Put the brand group first and the disclosure button after it in the inner row, and justify the row between its children so the brand stays at the leading edge and the button reaches the trailing edge. DOM order then matches visual order left to right, and keyboard and screen-reader order follow the same sequence, with no `order-*` or `flex-row-reverse` rules needed.

Alternative considered: leave the button first in the DOM and use `ml-auto` to push it right. It would look correct but focus and reading order would still start on the trailing control, opposite the visual flow. Rejected.

Alternative considered: `flex-row-reverse` on the narrow row. It would also reverse focus order and would move the brand group to the trailing side. Rejected.

**D2: Preserve the identity pair's adjacency.** Keep the brand group's `gap-2.5` so the mark stays immediately left of the wordmark, and keep the row's `gap-4` as the minimum separation between the pair and the control. The row's `justify-between` provides the trailing placement, so the group does not need new margins.

**D3: Keep the control out of the wide-viewport flow.** The existing `md:hidden` stays. At `md` up the inner row holds only the brand group, so `justify-between` has no second item to place and the outer row still puts the brand before the navigation links. Brand-first DOM order also matches the desktop reading order.

**D4: Update position tests to measure the trailing edge.** The component test asserts the brand group is the row's first child, the toggle is its last child, and the mark remains the wordmark's previous sibling. The browser test at phone widths computes the masthead's content right edge as the header inner's right edge minus its computed right padding, then asserts the toggle's right edge meets that edge, the toggle starts after the wordmark, and the wordmark's left gap from the mark is still 10px. The wide-viewport assertions stay as they are.

## Risks / Trade-offs

- **Safe-area or breakpoint padding makes a fixed-pixel expectation wrong** → Keep measuring computed padding in the browser test rather than hard-coding 16px or 40px.
- **DOM order change breaks the existing component assertions** → The test currently expects the toggle to be the parent's first child and the brand its next sibling; update both expectations in the same change.
- **Narrow widths crowd the wordmark and control** → The pair and the 44px control fit within the 288px content width at 320px with the existing 10px and 16px gaps; keep the existing overflow assertions at 320px and 390px.

## Migration Plan

Single frontend layout change; no data, API, or configuration migration. Reverting the commit restores the leading-edge placement with no follow-up steps.
