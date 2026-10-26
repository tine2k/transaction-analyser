# Proposal

## Why

The application's category marks still use the muted ten-colour ledger palette while the rest of the interface has adopted the Finance Tracker design's type, surfaces, and masthead. The design's vivid category palette gives categories a much stronger identity, but its literal values are not ready to copy: two hues fall below 3:1 on white, and two of its violets are nearly indistinguishable. This change aligns category colour with the design while keeping category marks readable and visibly distinct from the brand role.

## What Changes

- Replace the muted ledger category palette with a tuned nine-hue vivid palette derived from the design, keeping the design's violet, teal, magenta, blue, and green and tuning the orange and yellow for contrast.
- Keep one exported palette. Category pills continue to use a tinted ground and border; their text becomes darker so it meets 4.5:1 against the tint.
- Keep the Monthly `Other` segment neutral, using a neutral grey that is not a category colour and remains visible against the surface.
- Add a frontend-shell requirement that category indicators meet 3:1 against the surface and pill text meets 4.5:1.
- Add a Monthly requirement that the `Other` segment and its legend swatch use the same visible neutral grey.
- Leave category assignment order, all APIs, stored data, and every amount's ink colour unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `frontend-shell`: adds the contrast floor for category indicators and category pill text.
- `category-spending-chart`: makes the neutral `Other` segment and its legend swatch visible against the surface.

## Impact

- `app/utils/category-spending.ts` — palette values.
- `app/pages/index.vue` — category pill tint text.
- `app/pages/monthly.vue` — neutral `Other` segment and legend.
- `app/assets/css/main.css` — neutral companion token.
- `tests/unit/category-spending.test.ts` and the browser/component specs that check category marks.
- No API, database, route, dependency, or stored-data changes.
