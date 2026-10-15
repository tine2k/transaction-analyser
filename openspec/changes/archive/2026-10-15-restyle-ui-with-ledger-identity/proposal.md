# Proposal

## Why

The application has six real screens but no visual identity: every surface is default Tailwind slate, the only color in content is the generic Tableau 10 chart palette, and the screens have drifted apart in table striping, radii, and button treatments. The `frontend-shell` spec deferred design tokens and a theme "to the first change that renders real content" — that content now exists, so the deferral is due. The exploration chose a distinctive direction: a euro-ink palette on a ledger-book type system, grounded in the subject (a euro-denominated personal ledger fed by an Austrian bank export).

## What Changes

- Introduce the application's theme as design tokens in the one stylesheet: paper/ink/rule neutrals, a failure red, and a category ink palette derived from euro banknote hues, replacing the generic Tableau 10 palette in `app/utils/category-spending.ts`.
- Self-host three typefaces via npm font packages: Source Serif 4 (masthead and page titles), IBM Plex Sans (UI, tables, tabular numerals), IBM Plex Mono (machine strings: patterns, counterparty accounts, import timestamps).
- Present raw and derived amounts in tabular sans, ink-colored; the sign is never encoded as color, and red is reserved for failures and destructive actions.
- Make category color the only non-semantic color in content; interactive states use ink (underline, outline), not an accent hue.
- Restructure surfaces: rules over boxes, white sheets separated by rules on the paper ground, one 4px radius, shadows only on the two fixed action bars.
- Replace the tracked all-caps header eyebrow with a serif masthead and mark the current navigation link with a rule.
- Restyle all six routes and the failure page; no route, data, or behavior changes.
- Fix two copy/layout defects found during exploration: the stale failure-page text ("The application has one page so far") and the interleaved imports action row where status messages sit between unrelated buttons.
- Dark mode is deliberately deferred to a later change; the token system makes it a bounded follow-up.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `frontend-shell`: the "Styling arrives through one stylesheet" requirement's deferred-tokens clause is replaced by the defined theme; a new requirement defines the visual identity (palette roles, type roles, amounts not color-coded by sign, category color as the only content color, failure red reserved, surfaces separated by rules).

## Impact

- `app/assets/css/main.css` (theme tokens, font imports), `app/layouts/default.vue` (masthead, nav), all `app/pages/*` and `app/components/*` (restyle), `app/error.vue` (restyle and copy fix), `app/utils/category-spending.ts` (palette values).
- `package.json`: three self-hosted font packages (`@fontsource-variable/source-serif-4`, `@fontsource-variable/ibm-plex-sans`, `@fontsource/ibm-plex-mono`). No other dependencies.
- No API, database, route, or data changes. Existing tests pin semantics (test ids, table structure, labels), not styling; unit tests compare against the exported palette constant, so palette values are free to change.
- Verification uses headless Chromium screenshots per `AGENTS.md`, plus the existing unit, component, browser, and integration suites.
