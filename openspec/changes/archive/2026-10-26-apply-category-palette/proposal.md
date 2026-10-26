# Proposal

## Why

The application's category colour has two problems. It still uses a nine-colour palette while the new `design/Palette.dc.html` defines twenty colour families with a main, soft tint, and dark ink role. Assignment is also positional: a category's colour is its index in the sorted set of categories visible on that screen, so adding or removing a category shifts later colours and the Transactions screen can disagree with the analysis screens. In production there are 65 categories, so every colour is reused several times and two categories with similar amounts can appear with the same colour in the Monthly top-eight bar, where the shared swatch makes them indistinguishable.

## What Changes

- Replace the nine-colour palette with the design's twenty colour families: a main colour for dots and bars, a tint for pill grounds, and an ink for pill text. Keep the exported flat main-colour list as a derived view of those families.
- Give every stored category a stable home colour derived from its persistent identity, independent of the visible set, the screen, filters, or the sort order. The `Uncategorised` entry keeps a neutral treatment in the analysis views and its existing neutral Transactions pill.
- Add a Monthly top-eight collision rule: when two bar segments share a home colour and their amounts are within 10% of the larger amount, the lower category identity keeps the home colour and the other uses a distinct unused palette colour. The resolved colour is shared by the bar, its legend, and the matching table rows on that page.
- Keep the collision rule deliberately narrow: duplicate home colours whose segment widths are clearly different remain duplicated. All 65 table rows and the Yearly matrix continue to reuse colours; the rule protects the Monthly bar, not the whole application.
- Darken the eight design main colours that fall below 3:1 on white just enough to clear the existing indicator floor. The design's tint and ink values remain unchanged.
- Clarify the contrast contract: 3:1 applies to category marks (dots, bar segments, legend swatches, and share bars); 4.5:1 applies to pill text. The pastel pill ground is background and is not required to clear 3:1 because the visible label carries the category name.
- Use the design's tint and ink roles for the Transactions category pill instead of deriving a tint and text mix from the main colour.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `frontend-shell`: defines the twenty-family category palette, makes each category's home colour stable across screens and data changes, and clarifies which category surfaces must meet 3:1 and which only need legible text.
- `category-spending-chart`: makes Monthly category colours identity-stable and adds the top-eight separation exception for similarly sized segments.
- `transaction-table`: makes the category pill use the category's tint ground and ink text while remaining a labelled, readable assignment control.

## Impact

- `app/utils/category-spending.ts` — palette data and the category colour map.
- `app/pages/index.vue` — category pill styling.
- `app/pages/monthly.vue` — top-eight colour resolution, bar, legend, and table dots.
- `app/pages/yearly.vue` and `app/pages/monthly-average.vue` — switch to the stable home colour map.
- `tests/unit/category-spending.test.ts`, the Monthly component and browser specs, the Transactions browser spec, and the Monthly average browser spec.
- No API, database, route, dependency, or stored-data changes.
