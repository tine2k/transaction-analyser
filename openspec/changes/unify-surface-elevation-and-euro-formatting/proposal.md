# Proposal

## Why

Three visual inconsistencies remain after the recent screen work. At `lg` and wider, the scroll hint above the Monthly and Yearly category tables is hidden and takes the table's top gap with it, so those tables sit flush against the preceding panel. Euro values in English-style locales render as `€1,234.50` with no gap between the symbol and the digits, while Dutch already has one and German and French place the symbol after the amount. And only the desktop Transactions sheets are elevated, so the same white surface reads as a card on one screen and as a flat block everywhere else.

The third point is not a missing style: `frontend-shell` explicitly forbids shadows on content panels and `transaction-table` requires flat mobile sheets and cards. This change deliberately reverses that rule so every surface shares one resting elevation.

## What Changes

- Give the Monthly and Yearly category tables a 16px top gap at every width, including when the scroll hint is hidden. The gap moves to the section wrapper so the hint no longer carries it.
- Format every derived euro value with a non-breaking space between the symbol and the digits when the active locale places the symbol first (`€ 1,234.50`). Locales that already separate the symbol (`1.234,50 €`, `€ 1.234,50`) are unchanged, the locale's minus placement is retained, and raw transaction amounts remain untouched.
- Apply the existing `--shadow-sheet` resting elevation to every content surface region at every viewport width: the Transactions filter and table sheets, the mobile transaction cards, the Categories and People form and table sheets, the Imports table sheet, the Monthly average list, and the Monthly and Yearly filter panels, summary cards, bar panel, and table regions.
- Remove the flat-mobile exception. The fixed action bars keep their stronger upward shadow.
- Leave layout, radius, borders, grouping, colours, and behaviour otherwise unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `euro-value-display`: a derived euro value separates the currency symbol from the digits with a non-breaking space when the locale places the symbol before the amount, without changing locale grouping, placement, or sign handling.
- `frontend-shell`: every content surface region carries the theme's resting shadow at every viewport width; the rule forbidding shadows on non-Transactions panels is removed.
- `transaction-table`: the Transactions filter and table sheets and the phone transaction cards carry the resting shadow at every width; the flat-mobile rule is removed.

The 16px table gap is a layout correction with no requirement to amend; it is covered by a browser assertion in `tasks.md`.

## Impact

- `app/utils/category-spending.ts`: `formatEuroAmount` builds the symbol gap.
- `app/pages/monthly.vue`, `app/pages/yearly.vue`: table section wrapper and surface classes.
- `app/pages/index.vue`: remove `shadow-none` and the desktop-only elevation condition.
- `app/pages/categories.vue`, `app/pages/people.vue`, `app/pages/imports.vue`, `app/pages/monthly-average.vue`: add the resting shadow to their surface regions.
- `app/assets/css/main.css`: the `--shadow-sheet` token is reused unchanged.
- Tests: unit expectations for `formatEuroAmount`, hardcoded euro text in browser specs, and the shadow assertions in the transactions and mobile-card browser specs.
- No API, database, dependency, or stored-data change. No new route.
