# Design

## Context

The transactions screen already computes both figures from `visibleTransactions`: `visibleTransactions.length` and `visibleTotal`. Today they share one `visible-total` paragraph, with the sum at `text-xl font-semibold text-ink` and the count at body size in parentheses. The page's typographic system uses Source Serif 4 for display figures and IBM Plex Sans for interface text, with ink and muted text tokens. See `proposal.md` for motivation and the delta spec for the behavior contract.

## Goals / Non-Goals

**Goals:**

- Make the visible transaction count the first and most prominent figure in the summary.
- Keep the sum exact, locale-formatted, readable, and visibly secondary.
- Preserve the existing test hooks, wording, and value computations.

**Non-Goals:**

- No new summary component, card, icon, or accent colour.
- No change to filtering, sorting, search, selection, data requests, or table markup.
- No change to the sum's arithmetic or EUR formatting.

## Decisions

### D1: Reuse the existing summary container and flip its internal hierarchy

Keep `data-testid="visible-total"` as the summary container, but change it from a paragraph to a block wrapper holding two lines: the count first, the sum second. This keeps the figures grouped for assistive technology and preserves every existing assertion that reads the summary's text, while avoiding a second summary location that could drift.

Alternative considered: a separate count card above the table. Rejected because it adds a new visual element and surface area for a request that only asks to reorder emphasis.

### D2: Count uses display type at `text-2xl sm:text-3xl`; sum uses body-muted type

Render the count with `font-display text-2xl font-semibold tabular-nums text-ink sm:text-3xl`, and the sum line with `mt-1 text-sm text-muted` plus `tabular-nums` on the value. The display face and primary ink give the count the page's strongest typographic treatment; the smaller muted sum reads as supporting detail. The size step from 30px to 14px on wide screens is unambiguous without introducing a new colour or component.

Alternatives considered: a colour accent for the count (the theme has no accent token and the design is intentionally monochrome), and keeping both figures in one line (compact, but the count's prominence would depend on font weight alone and the pair would remain visually equal in structure).

### D3: Count precedes the sum in document order

Put the count element before the sum line in the DOM, so the visual hierarchy and the reading order agree for sighted and assistive-technology users. The count's existing singular/plural wording (`1 transaction`, `4 transactions`, `0 transactions`) is unchanged.

Alternative considered: relying on CSS order to move the count visually while keeping the old DOM order. Rejected because the reading order would then contradict the visual hierarchy.

### D4: Preserve the existing test hooks and add browser-level emphasis checks

Keep the count as the `visible-count` element with the exact existing text, and keep the formatted sum inside `visible-total`. Existing component and browser assertions then continue to cover the values. Add a headless Chromium check that compares computed font sizes and colours, because Tailwind utilities are not resolved in the happy-dom component environment and asserting class strings would couple the test to one styling implementation.

Alternative considered: assert the class list in the component test. Rejected as brittle and weaker evidence of the actual rendered hierarchy.

## Risks / Trade-offs

- **Count at page-title scale could compete with the `Transactions` heading** → The heading sits above the filters in its own region; the count is the strongest figure inside the summary but the page title remains the document's first heading. The hierarchy is intentionally strong because the count is now the summary's primary fact.
- **Moving the count out of parentheses changes the visible text from `Sum … (4 transactions)` to two lines** → Existing value assertions still pass because both figures retain their test hooks and text; the component and browser checks cover the new order and emphasis.
- **Colour-based secondary treatment could reduce readability** → The muted token is the application's existing body-muted colour and remains legible on the paper ground; only the emphasis changes, not the value's legibility.
