# Design

## Context

See `proposal.md` for motivation and `specs/frontend-shell/spec.md` for the required behaviour. The application has one stylesheet, `app/assets/css/main.css`, which defines all theme tokens and the few custom classes. Surfaces are not componentised; each page repeats Tailwind classes such as `bg-surface`, `shadow-sheet`, and `rounded-panel` on its filter, chart, table, summary, and form regions. The Transactions screen additionally has a phone card list whose cards use the 18px phone radius.

## Goals / Non-Goals

**Goals:**

- Express the new page ground and card edge as theme tokens and apply them to every content surface on every route.
- Keep the existing resting shadow, white surface, and phone radius decisions intact.
- Keep the change presentation-only: no API, data, or behaviour change.

**Non-Goals:**

- Redesigning controls, table rows, typography, or the brand bar.
- Giving floating action bars the card border; they keep their stronger upward shadow.
- Changing category colours or the Yearly magnitude tint.

## Decisions

### D1: Add themed paper and card-border tokens

Change `--color-paper` to `#e9e7f5` and add `--color-card-border: #d3cfea` in the `@theme` block. Keep `--color-surface`, `--radius-panel`, `--radius-panel-mobile`, and `--shadow-sheet` as they are, because the requested card background, radius, and shadow already match those tokens.

Alternative considered: reuse `--color-rule-strong` (`#d5d2e3`) for the card edge. Rejected because that token is the control-rule colour and is visibly a different value from the requested `#d3cfea`; a separate token keeps the two roles independent.

### D2: Apply the border per surface rather than through a shared card class

Add `border border-card-border` to each surface's class list and replace `border-rule-strong` on the existing bordered panels. Keep the current `bg-surface`, radius, and `shadow-sheet` classes.

Alternative considered: introduce a `.card-surface` class or Tailwind `@utility` that bundles background, border, radius, and shadow. Rejected for this change because the pages already compose these utilities explicitly, several surfaces have different radius variants, and existing component tests assert `shadow-sheet` directly. A bundled class would change that pattern and those assertions without removing a real source of drift.

### D3: Standardise content-surface corners on the panel radius

The Categories and People form panels and table regions currently use the 14px sheet radius; they become 20px panel cards with the new border. Imports' table region does the same. Surfaces already using `rounded-panel` keep it. Surfaces using `rounded-panel-mobile` with an `sm:rounded-panel` step (Transactions filter sheet, table sheet, Manage sheet, phone transaction cards) keep their 18px phone radius and 20px wider radius.

The request states 20px for cards but does not mention the phone variant. Keeping the established 18px phone radius is a deliberate assumption: the existing design and its browser tests define 18px for phone surfaces, and changing it would be a separate phone-layout decision.

### D4: Align the install surface with the page ground

Set the document `theme-color` in `nuxt.config.ts` and the manifest's `theme_color` and `background_color` to `#e9e7f5`. The manifest currently carries the older `#F6F6F3` paper value, so this change brings the installed launch surface in line with the stylesheet's paper token.

### D5: Check contrast on the new ground

Ink on the new paper is 13.07:1 and muted text is 5.23:1, both above the 4.5:1 text floor. The new card edge is decorative, not the sole carrier of meaning: cards remain distinguishable by their white fill and resting shadow as well as the border. The `Other` chart colour stays on white cards, where its contrast is unchanged.

## Risks / Trade-offs

- **The darker ground reduces the white-card separation margin** → Keep the 1px edge and the existing shadow; both remain present together.
- **Repeated surface class strings can miss a region** → Inventory every `shadow-sheet` occurrence and add a per-route browser assertion for the card border, background, radius, and shadow.
- **Radius standardisation visibly changes the Categories, People, and Imports panels** → Intended by the request; record it in the change and cover the new radius with tests.
- **The 18px phone radius differs from the stated 20px** → Documented assumption in D3; leave the phone layout decision unchanged.
- **Adding a 1px border can affect tight layouts** → Tailwind's border-box sizing keeps padding and scroll widths stable; verify the Transactions table and filter controls at phone and desktop widths.

## Migration Plan

No data or API migration. Deploy the stylesheet, template class, manifest, and configuration changes together. Rollback is a revert of those presentation files; no stored state is touched.
