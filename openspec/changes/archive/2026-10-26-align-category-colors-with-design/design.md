# Design

## Context

See `proposal.md` for motivation. The category palette currently lives in `app/utils/category-spending.ts` as ten muted euro-ink values. It is consumed by the Transactions category pills, the Monthly stacked bar, legend, table dots, and share bars, and the Yearly row dots. `app/pages/index.vue` derives each pill from the base colour with `color-mix`: 16% colour for the ground, 32% for the border, and 72% colour mixed with ink for the text. The Monthly `Other` segment uses `--color-rule-strong` (`#D5D2E3`), which is a very light neutral.

The design mock uses a vivid eight-hue palette plus a lavender `Other`, and a separate hand-picked pastel/dark pair table for pills. The recent design-alignment changes explicitly left colours out of scope, so the current application is a hybrid: the design's type, radii, elevation, and masthead with the older ledger palette.

## Goals / Non-Goals

**Goals:**

- Adopt the design's vivid category character while keeping every category indicator at or above the 3:1 contrast floor.
- Keep the category palette a single exported source and derive pills from it, rather than introducing a second hand-picked palette.
- Keep the Monthly `Other` segment neutral, distinct from category colours, and visible against the surface.
- Preserve existing category assignment, data, routes, and amount colours.

**Non-Goals:**

- Adopting the design's coloured summary cards. Those are decorative content accents and remain forbidden by the palette and amount rules.
- Copying the design's literal palette, including the two below-contrast hues and the near-duplicate violets.
- Changing category colour assignment order or making it stable when categories are added. That is a separate behaviour change.
- Guaranteeing a unique colour for every category. The palette cycles, and names and legends remain the identifying carriers.
- Editing the design mock.

## Decisions

### D1: Use a tuned nine-hue palette derived from the design

The replacement palette keeps the design's violet, teal, magenta, blue, and green, darkens the orange and yellow to reach 3:1, drops the second violet because it is nearly indistinguishable from the first, and adds red and deep cyan to keep nine distinct hues for a 35-category dataset.

| Source | Final | Contrast on white | Change |
| --- | --- | --- | --- |
| `#6D3CF2` | `#6D3CF2` | 5.87:1 | Keep the design's signature violet |
| `#FF8A3D` | `#D96A1F` | 3.48:1 | Darken the orange; the design value is 2.35:1 |
| `#12A594` | `#12A594` | 3.07:1 | Keep the teal; it clears the floor |
| `#E0409A` | `#E0409A` | 3.91:1 | Keep the magenta |
| `#2F7BFF` | `#2F7BFF` | 3.89:1 | Keep the blue |
| `#E5B100` | `#A87F00` | 3.68:1 | Darken the yellow; the design value is 1.98:1 |
| `#8A3FFC` | — | — | Drop the near-duplicate violet; it is only ΔE 7 from `#6D3CF2` |
| `#1E9E4A` | `#1E9E4A` | 3.47:1 | Keep the green |
| — | `#B42318` | 6.57:1 | Add a red with a clear separation from orange |
| — | `#0E7490` | 5.36:1 | Add a deep cyan with a clear separation from teal |

The palette order is `#6D3CF2`, `#D96A1F`, `#12A594`, `#E0409A`, `#2F7BFF`, `#A87F00`, `#B42318`, `#0E7490`, `#1E9E4A`, so red and green are not adjacent and blue and violet are not adjacent. The closest pair is orange and red at ΔE 28.2; the closest value to the brand role (`#2E3FC1`) is the design blue at ΔE 25.2.

Alternatives considered: copy the design values exactly — rejected because two indicators fall below 3:1 and two hues are nearly indistinguishable; keep the current muted palette — rejected because it is the visual holdout from the design; add a tenth hue — rejected because the remaining distinct hue families are too close to the nine chosen and the design itself uses eight.

### D2: Keep one palette and darken the pill text

The pill ground and border stay at 16% and 32% colour over white. The text changes from 72% colour + 28% ink to 50% colour + 50% ink. With the new palette, the 72% mix bottoms out at 4.07:1 for the teal and 4.44:1 for the green; the 50% mix ranges from 5.94:1 to 8.61:1. The darker text keeps the pill's hue while clearing the 4.5:1 body-text threshold for its 12px bold label.

Alternatives considered: use the design's separate pastel/dark pair arrays — rejected because it creates a second palette to maintain, contradicts the single-palette requirement, and is unnecessary once the text mix is corrected; use ink for all pill text — rejected because the hue-tinted label helps the pill read as one category mark.

### D3: Give Other a visible neutral companion

Add `--color-neutral-strong: #8A87A0` to the theme and use it for the Monthly `Other` segment and its legend swatch. It is a darker version of the design's lavender-grey companion, has 3.47:1 contrast against white, and is not a category colour. Its closest category neighbour is the deep cyan at ΔE 27.5, so it stays distinguishable.

Alternatives considered: keep `--color-rule-strong` — rejected because it is 1.48:1 and nearly disappears; use the design's `#B9B4D6` — rejected because it is 1.99:1 and reads closer to a violet category; use a pure grey — rejected because it breaks the theme's slightly violet neutral family.

### D4: Leave assignment order unchanged

`createCategoryColorMap` continues to sort category identity keys and assign palette slots. Changing it to be insertion-stable would alter the colours of existing categories and is outside this palette-alignment change. The existing sorted-string quirk (`category:10` before `category:2`) remains a known follow-up, not a regression introduced here.

Alternatives considered: switch to numeric ID modulo the palette length as part of this change — deferred because it changes colour identity beyond the design alignment and needs its own handling for `uncategorised`.

### D5: Verify with computed values, not screenshot baselines

Extend the unit test for the palette with a contrast calculation for every colour, and extend the browser tests to read the computed pill background and text colours and assert the 4.5:1 ratio. Assert the Monthly `Other` segment and legend use the same neutral token and the 3:1 ratio. Inspect the Transactions, Monthly, and Yearly screens headlessly at desktop and mobile widths against the design frames. This follows the project's existing computed-style testing convention and avoids pixel churn.

### D6: Give the Monthly share bar a white track with a rule outline

The share bar's fill sits inside a track, so the fill's immediate ground is the track, not the panel. Against `--color-rule-strong` the teal, orange, yellow, and green fills fall below 3:1. The track becomes `bg-surface` with a 1px `ring-rule`, making the fill's ground white while the outline still shows the unfilled portion. The palette's lowest value then clears the floor at 3.07:1.

Alternative considered: darken the four affected palette hues to clear 3:1 against the rule track — rejected because it would push the palette further from the design and lower the contrast of the share bar against the surrounding surface. Alternative: leave the track and treat the panel as the contrast ground — rejected because the fill is visually bounded by the track, so the track is the ground that matters.

## Risks / Trade-offs

- **Tuned hues no longer match the mock exactly** → The table records every source, final value, and rationale; the visual character stays vivid and the contrast floors become testable.
- **Nine colours still cycle across 35 categories** → Names, table rows, and legends carry identity; the palette is not required to be globally unique. This is already true of the current ten-colour palette.
- **The design blue is the closest category hue to the brand role** → It remains 25.2 ΔE from the brand value and is distinguishable in the interface; retain it for design fidelity. If review finds it too close, replace it with a deeper blue rather than weakening the brand role.
- **The 50% text mix makes labels less saturated** → Verify the computed contrast and inspect the pills at desktop and phone widths; the ground and border still carry the hue.
- **`#8A87A0` could be mistaken for a category colour** → It is a desaturated neutral, its closest category neighbour is 27.5 ΔE away, and the `Other` legend names it.
- **Existing tests pin the old palette length or values** → Update the unit test and any computed-style browser assertions in the same change; no API or data fixtures need to change.

## Migration Plan

1. Replace the palette constant and add the neutral token.
2. Change the pill text mix and the Monthly `Other` references.
3. Update the unit and browser assertions.
4. Run unit, component, and browser suites; inspect the three category-bearing screens headlessly at desktop and phone widths.
5. Roll back by reverting the change: no data, API, route, or dependency migration is involved.
