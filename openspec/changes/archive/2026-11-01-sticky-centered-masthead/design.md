# Design

## Context

See `proposal.md` — Why. The relevant current state:

- `app/layouts/default.vue` renders one `<header class="brand-bar">` whose inner `<div>` holds a mobile row (disclosure button, then logo mark + `Expenses` wordmark) and a `<nav id="screen-navigation">` that is a column below `md` and a row at `md` and up.
- `.brand-bar` in `app/assets/css/main.css` paints the brand gradient and adds the phone's top safe-area inset as `padding-top`.
- `html, body` currently set `overflow-x: hidden`, which is the project's guard against page-level horizontal overflow.
- The transactions screen's fixed action bars use `z-20`; table pin cells use `z-index: 3`. Nothing else in the shell establishes a stacking layer.
- Tests that constrain this area: `tests/components/layout.test.ts` (DOM order, brand group), `tests/browser/responsive.spec.ts` (phone toggle geometry, wide leading alignment), and `tests/browser/mobile-safe-areas.spec.ts` (safe-area painting).

## Goals / Non-Goals

**Goals:**

- The masthead stays at the top at every supported width while the page scrolls, with no layout jump and no duplicated top offset.
- The narrow-viewport brand group is centred against the full masthead width, without moving the burger from the leading edge.
- The bar wins the stacking contest against tables, pinned cells, and the transactions bottom bars.
- The existing DOM contract the component tests rely on survives: the disclosure button is still the first child of the brand row, followed by the brand group.

**Non-Goals:**

- Moving, hiding, or restyling the burger; the conflicting `move-mobile-menu-button-right` change is superseded and not implemented.
- Changing desktop navigation order, the five destinations, or route behaviour.
- Scroll-linked hiding/showing, shrinking, or shadow-on-scroll behaviour. The bar stays put.
- Replacing `position: sticky` with a JavaScript-driven fixed header.

## Decisions

### D1 — `position: sticky` on the existing `<header>`

Add `sticky top-0 z-40` to the `<header class="brand-bar">` element. Sticky keeps the bar in normal flow, so its height — including the expanded mobile navigation — is already accounted for; no measured offset or `ResizeObserver` is needed. A fixed bar would require copying its height into the page's top padding and updating that whenever the disclosure opens.

Sticky also keeps the existing safe-area padding effective: `.brand-bar` continues to paint through `--safe-area-top`, and nothing needs to move.

### D2 — `overflow-x: clip` replaces `overflow-x: hidden` on the scrolling root

A sticky element does not stick relative to the viewport when an ancestor establishes a scroll container. `overflow-x: hidden` on `body` (and `html`) does exactly that, so the bar would scroll away. Change the shared rule in `main.css` to `overflow-x: clip`, which clips without creating a scroll container.

Alternative: keep `hidden` and wrap the page in an inner scroller. Rejected — it changes the scroll root for every screen and breaks the existing `window.scrollTo` and `scrollWidth` assumptions in the browser tests.

Verification is explicit in `tasks.md`: scroll a long screen in headless Chromium and assert the header's top edge stays at `0`.

### D3 — Stack the masthead above all page layers

Use `z-40`, above the transactions fixed bars (`z-20`) and the table pins (`z-3`). Since the header spans the full width and is opaque, no extra `isolation` or `overflow` change is needed on the page container. The bottom bars sit at the bottom edge and do not overlap the header in normal use, but the ordering keeps the header above them if a short viewport ever brings them close.

### D4 — Centre the narrow brand group with a symmetric three-column grid

Below `md`, turn the brand row into `grid grid-cols-[44px_minmax(0,1fr)_44px]` with one column gap. The button occupies column 1, the brand group column 2 (`justify-self-center`), and an `aria-hidden` spacer column 3. Equal outer columns and equal gaps make the middle column's centre exactly the row's centre, so the brand midpoint meets the masthead content midpoint regardless of the button.

At `md` and up, revert to the current flex row (`md:flex`), hide the spacer (`md:hidden`), and keep the button `md:hidden`, so the brand group is the first visible item and stays leading-aligned.

Alternatives considered:

- Absolute centring (`absolute left-1/2 -translate-x-1/2`): fewer elements, but at 320px the brand group would be free to run under the burger; a grid column makes the collision impossible while the group fits.
- Flex spacers either side: requires a second 44px spacer and keeping two widths in sync with the button.
- Three-column grid with `auto` outer columns: not symmetric when the button is 44px and the spacer is empty; the `1fr` centre would not be the row centre.

At 320px the content width is 288px; after 44px + 44px columns and two 16px gaps the middle column is 168px, which fits the 30px mark, 10px gap, and the 20px/800 `Expenses` wordmark. The browser test asserts the centre line rather than assuming it.

### D5 — `scroll-padding-top` keeps focus clear of the bar

Because the bar now overlays nothing in flow but can still sit over content that is scrolled into view (for example, a tabbed-to control near the top), add `scroll-padding-top: calc(5rem + var(--safe-area-top, env(safe-area-inset-top, 0px)))` to the scrolling root. 5rem clears the collapsed bar at both breakpoints; the expanded panel is inside the header, so its own links are not affected.

### D6 — Cap the expanded panel's height only when the viewport is short

The expanded navigation stays inside the sticky header. To keep the last destinations reachable on short viewports (a landscape phone), give the panel a maximum height below `md` and let it scroll internally: `max-h-[calc(100dvh-7rem)] overflow-y-auto`, reset to none at `md`. On portrait phones the panel fits, so nothing scrolls; on a short viewport the header itself never grows taller than the viewport.

### D7 — Supersede the right-hand placement change

The unstarted `move-mobile-menu-button-right` change conflicts with this request. This change keeps the current leading-edge placement and records the conflict in `proposal.md`; it does not edit or archive that change. Leaving it in place is a planning debt the user resolves separately.

## Risks / Trade-offs

- **Sticky silently fails because of an overflow ancestor** → Replace both root `overflow-x: hidden` declarations with `clip`, then prove it with a headless Chromium scroll assertion before touching tests.
- **`overflow-x: clip` support** → Baseline in Chromium, Firefox, and Safari versions the project already targets; verify no horizontal overflow at 320px in the browser suite.
- **Brand group collides with the burger at 320px** → The 44px side columns plus `minmax(0,1fr)` bound the centre column; the browser test asserts the midpoint and that the burger's right edge stays left of the mark.
- **Short landscape viewport** → Internal panel scrolling from D6; verify at a 640×320 viewport with the panel open.
- **Sticky header covering focused content** → `scroll-padding-top` from D5; a keyboard-tab assertion in the browser suite covers it.
- **Safe-area regression** → `.brand-bar` keeps its existing padding, and `mobile-safe-areas.spec.ts` must keep passing unchanged.

## Migration Plan

No data or API migration. Ship with the frontend build; roll back by reverting the layout/CSS change. No feature flag is needed because the bar is always visible.

## Open Questions

None.
