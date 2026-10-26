# Design

## Context

See `proposal.md` for motivation and `specs/` for the behaviour contract. `design/Palette.dc.html` defines 20 category colour families, each with a main, tint, and ink value. The application currently has a 9-entry `CATEGORY_COLOR_PALETTE` in `app/utils/category-spending.ts`, and `createCategoryColorMap` assigns a slot from the category's position in a sorted set of keys. The map is consumed by the Transactions pill (`app/pages/index.vue`), the Monthly bar, legend, table dots, and share bars (`app/pages/monthly.vue`), Yearly row dots (`app/pages/yearly.vue`), and Monthly average dots, trend bars, and share bars (`app/pages/monthly-average.vue`).

Production has 65 categories. With 20 families, five families are used four times and fifteen are used three times. A positional map also shifts colours when the set changes, and the Transactions screen's set differs from the analysis screens' set.

The existing unit and browser tests pin a 9-colour palette, 3:1 for chart marks, 4.5:1 for pill text, and the Monthly bar/table agreement. The change keeps those checks, updates the expected values, and adds the stable-identity and top-eight separation checks.

## Goals / Non-Goals

**Goals:**

- Adopt the design's 20 families as the single category palette, with main, tint, and ink roles.
- Make a stored category's home colour depend only on its persistent identity.
- Separate same-home top-eight categories in the Monthly bar when their amounts are close enough that the shared colour would be the main distinguishing cue.
- Keep every category mark at 3:1 and every pill label at 4.5:1.

**Non-Goals:**

- Giving all 65 categories distinct colours. Twenty families cannot do that, and a 65-colour palette would lose the design's separation.
- Storing a colour or palette slot on the category row. The change requires no database or API migration.
- Recolouring the 65-row Monthly table or the Yearly matrix to remove every duplicate. Only the Monthly top-eight bar is protected.
- Changing the `Other` aggregate's neutral treatment, amount colours, or any screen layout.

## Decisions

### D1: Adopt the design's twenty families and darken eight main values

`CATEGORY_COLOR_FAMILIES` holds the 20 rows in the mock's order. Each row keeps the mock's `tint` and `ink` verbatim; every ink-on-tint pair is at least 4.5:1 (the computed range is 6.2–11.0:1). The eight main values below the 3:1 indicator floor are darkened only as far as needed:

| Family | Design main | On white | Final main | Final contrast |
|---|---|---:|---|---:|
| Orange | `#FF8A3D` | 2.35 | `#DF7A3D` | 3.00 |
| Amber | `#E5B100` | 1.98 | `#B88F0E` | 3.01 |
| Coral | `#FF6B57` | 2.80 | `#F56856` | 3.00 |
| Cyan | `#00B8C4` | 2.43 | `#04A4B3` | 3.01 |
| Lime | `#8FC31F` | 2.10 | `#78A225` | 3.00 |
| Sky | `#1FA8E0` | 2.71 | `#1F9FD6` | 3.00 |
| Mint | `#2DC98A` | 2.14 | `#2BA87C` | 3.00 |
| Sand | `#C99A5B` | 2.54 | `#B88D58` | 3.00 |

The other twelve mains are the design values unchanged. If rounding leaves a final value under 3:1 in the test environment, darken that value by one more step rather than changing the test threshold.

`CATEGORY_COLOR_PALETTE` remains as a derived array of the 20 main values so existing imports and palette-level tests still have one exported list. The families are the source; the main list is a view of them.

Alternatives considered: keep the literal design mains and relax the 3:1 floor — rejected because the marks are meaningful graphics and the existing requirement and tests would have to be weakened; use the tints for the chart marks — rejected because all tints are only 1.14–1.35:1 against white; copy the design exactly and darken in CSS per use — rejected because the palette would then have two versions of the same colour.

### D2: Derive the home colour from the category identity

For a key `category:<id>`, the home family is:

```text
familyIndex = (BigInt(id) - 1n) % 20n
```

Category identities are `bigint` identity columns exposed as strings, so the conversion is exact. The map is built per key and never sorts the set. Adding a category, removing another, renaming a category, changing a filter, or opening a different screen does not change an existing category's family. A deleted category recreated with a new identity is a new category and may receive a different family.

`createCategoryColorMap` keeps its `Map<string, string>` shape, returning main colours, so the four consumers do not need a new map type. A sibling `getCategoryColorFamily(key)` exposes the tint and ink roles for the Transactions pill. `uncategorised` is not a stored category: in analysis views it uses `--color-muted` (`#5F5C78`, 6.39:1 on white) as a neutral mark, while its Transactions pill keeps the existing neutral surface/rule styling. `Other` keeps `--color-neutral-strong` (`#8A87A0`, 3.47:1), so the two neutral entries remain distinguishable.

Alternatives considered: store a slot on the category row — deferred because it adds a migration and API field for a mapping that an immutable identity already supplies, and it cannot make 65 categories unique with 20 families; sort keys and cycle — rejected because it is the current drift; hash the name — rejected because renaming would change the colour and different names can still collide.

### D3: Apply the narrow top-eight separation rule

The Monthly page resolves colours only for `breakdown.top` (at most eight entries). `Other` and `uncategorised` stay neutral and take no part in the resolver.

1. Group the top-eight stored categories by home family index.
2. Sort each group by numeric category identity ascending.
3. Walk the groups. For each category, compare its exact amount with every category still on the home colour in its group. If any comparison is within 10% of the larger amount, the lower identity is already on the home colour, so this category moves. Otherwise it keeps the home colour and becomes another keeper.
4. Choose a replacement from the families not used as a home colour by any top-eight category. This guarantees a replacement cannot displace a later category. Among those candidates, choose the one whose minimum perceptual distance (CIE76 ΔE over the 20 mains) to the already resolved colours is greatest; break ties by palette order.
5. Return a map of key to resolved main colour for the top eight. The bar, legend, and matching table rows read this map; rows outside the top eight read the home map.

The 10% comparison uses exact decimal arithmetic: align the two decimal strings, compare the absolute difference, and test `difference * 100 <= larger * 10`. It does not convert to a floating-point number.

Why lowest identity keeps the home colour: it is deterministic, it favours the older category whose colour users are more likely to have learned, and it makes the newer category the one that yields. Why candidates come from unused home families: with at most eight top-eight categories and twenty families, at least twelve families are free, so no replacement needs to steal a later category's home colour. Why max-min ΔE: the palette has near-family pairs (for example Pink/Raspberry and Blue/Indigo), so "unused" is not enough; the replacement should be as far as practical from what is already on screen.

Alternatives considered: separate every duplicate top-eight colour regardless of amount (the stricter B2 policy) — rejected for this change because with 65 categories it would move colours much more often; use per-chart rank colours — rejected because it breaks identity; expand the palette to 65 colours — rejected because the additional colours would be much closer together and the design's 20-family palette is the chosen visual system.

### D4: Use the tint and ink roles for the pill and clarify the contrast contract

`categoryPillStyle` returns the family's `tint` as the ground and `ink` as the text. A hairline border may use a low ink/tint mix; it is decorative and is not the identity carrier. `uncategorised` keeps the existing neutral surface pill.

The contrast contract is:

- 3:1 for category marks: dots, bar segments, legend swatches, and share bars, measured against the surface behind them.
- 4.5:1 for pill text, measured against the pill's ground.
- The pastel pill ground is background. It is not required to meet 3:1 because the visible label carries the category name; this is the only way the design's tint values can be used.

Alternatives considered: derive the tint and text from the main colour with `color-mix` — rejected because the design supplies a tested tint/ink pair per family; darken the tints to 3:1 — rejected because they would no longer be pastel and the label already carries the identity.

### D5: Verify with computed values and a deterministic resolver

Unit tests cover: the 20-family count and unique mains; 3:1 for every main; 4.5:1 for every ink/tint pair; the identity formula including `category:1` and `category:21`; independence from set order, additions, and removals; the neutral treatment; and the resolver at, just below, and just above the 10% threshold, including a three-category group and a deterministic repeat. Browser tests cover the computed 3:1 marks, the 4.5:1 pill text, the top-eight separation, the legend/table agreement, and the home colour on another screen. The Monthly, Monthly average, Yearly, and Transactions screens are inspected in headless Chromium at 1360px and 390px.

## Risks / Trade-offs

- **A category can change colour on the Monthly page when a similar-sized sibling appears** → The rule is limited to the top eight and to the 10% band; outside that case the home colour is used. The design and spec name the exception rather than hiding it.
- **A shifted Monthly colour can differ from the same category's colour on Yearly, Monthly average, or Transactions** → This is the cost of keeping the 20-family palette and a clean top-eight bar. The top-eight resolution is documented as page-local; the other screens keep home colours.
- **The 65-row Monthly table and Yearly matrix still contain repeated colours** → They are text-labelled lists, not the stacked bar; making them unique would require at least 65 perceptually distinct colours. This is explicitly out of scope.
- **Two different families can still look similar** → Replacements maximise minimum ΔE, and every mark is accompanied by a name or legend label; colour is never the only carrier.
- **Eight mains no longer match the mock exactly** → The darkening is the minimum needed for 3:1, the tint and ink values stay exact, and the final values are recorded in D1.
- **The 10% threshold may feel too aggressive or too loose against real months** → It is a single named parameter with exact-decimal tests; tune it after inspecting the production months without changing the identity model.
- **`Uncategorised` and `Other` are both neutral** → They use distinct neutrals (`--color-muted` and `--color-neutral-strong`), both at or above 3:1, and both carry labels.

## Migration Plan

1. Replace the palette constant with the 20 families and the derived main list; add the family lookup and stable map.
2. Update the Transactions pill, Monthly colour helpers, Yearly, and Monthly average to read the stable map.
3. Add the top-eight resolver and use its result for the Monthly bar, legend, and table rows.
4. Update the unit, component, and browser assertions; run the full test and browser suites.
5. Inspect the four category-bearing screens headlessly at desktop and phone widths.

There is no stored colour, schema, API, or route migration. Rollback is a revert of the code and test changes; the categories' identities are unchanged.

## Open Questions

None. The 10% threshold and the exact darkened main values are tuning parameters, not unresolved approach decisions; if visual review changes them, the algorithm and specs stay the same.
