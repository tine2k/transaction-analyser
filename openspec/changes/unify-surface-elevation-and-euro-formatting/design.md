# Design

## Context

See `proposal.md` — Why. The application has one stylesheet (`app/assets/css/main.css`) whose Tailwind theme already defines `--shadow-sheet: 0 1px 3px rgba(40, 30, 120, 0.08)` and therefore a `shadow-sheet` utility. Templates style each surface directly with utility classes; there is no shared card component. The euro formatter (`app/utils/category-spending.ts`, `formatEuroAmount`) already rebuilds Intl output part by part so exact large decimals survive, which gives a natural place to add the symbol gap.

`replace-monthly-totals-with-yearly-screen` is still in progress and introduces `app/pages/yearly.vue`. This change edits that page, so it is applied on the final code of that change (or after it is archived) rather than in parallel.

## Goals / Non-Goals

**Goals:**

- One resting elevation for every content surface, at every viewport width, using the existing token.
- A non-breaking gap between `€` and the digits when the active locale puts the symbol first, with no change elsewhere.
- A 16px gap above the Monthly and Yearly category tables at every width.
- Keep exact decimal arithmetic, locale grouping/placement, sign handling, and all current behaviour.

**Non-Goals:**

- Unifying radii, padding, or borders between surfaces. Bordered sheets keep their border; borderless panels stay borderless.
- Applying elevation to buttons, inputs, menu links, or the fixed action bars.
- Changing the palette, typography, layout, routes, API, database, or raw transaction amounts.
- Redesigning which content is grouped into a surface.

## Decisions

### D1: Reuse `--shadow-sheet` and the `shadow-sheet` utility

Every surface gets the existing class; no new token or component is introduced. The value is already the Transactions reference shadow, so the rest of the system matches the screen the user pointed at. Reusing the Tailwind theme utility keeps the source of truth in `main.css`, where the project already keeps its design tokens.

Alternative considered: a shared `.surface-card` CSS class. Rejected because templates already use token utilities directly; a second styling mechanism would split the source of truth and still require touching every template.

### D2: Elevate at every width

Drop `shadow-none` and the `sm:` condition from the Transactions sheets and transaction cards. The spec deltas remove the flat-mobile rule. The fixed action bars keep their stronger `shadow-[0_-2px_8px_...]`; they are floating elements, not content surfaces.

Alternative considered: desktop-only elevation, which would preserve the current mock's flat phones. Rejected by the confirmed decision that "all cards" means all widths.

### D3: Surface inventory

Add `shadow-sheet` to exactly these regions:

| Route | Regions |
|---|---|
| `/` | filter sheet, table sheet, the three empty-state sheets, each phone transaction card |
| `/categories` | create/edit form sheet, category table scroll region |
| `/people` | create/rename form sheet, people table scroll region |
| `/imports` | import-log table scroll region |
| `/monthly` | filter panel, two summary cards, bar panel, category table scroll region |
| `/yearly` | filter panel, two summary cards, matrix scroll region |
| `/monthly-average` | category-average list region |

The phone branch's outer wrapper on `/` (`phoneViewport` container) stays unstyled; elevation belongs to the cards it contains. The bordered sheets keep `border border-rule-strong`; the border defines the table/list edge while the shadow supplies elevation. Unifying those two card families is a separate visual decision.

### D4: Insert the euro gap from Intl parts

In `formatEuroAmount`, while walking `formatToParts`, detect whether the `currency` part is immediately followed by a numeric part (`minusSign`, `integer`, or `group`) with no `literal` between them. If so, push `\u00A0` after the currency part. This yields:

- `en-US`: `€\u00A01,234.50` and `-€\u00A01,234.50`
- `de-DE`: `1.234,50\u00A0€` — unchanged, symbol follows
- `nl-NL`: `€\u00A01.234,50` — unchanged, Intl already has the literal

No trailing separator is added when the symbol follows the amount, and the locale's minus placement is untouched. Raw transaction amounts never pass through this function and stay bare decimals.

Alternative considered: post-process the final string with a regex. Rejected because it is fragile across locales and risks doubling an existing literal; inspecting the parts is deterministic.

### D5: Let the table section own its 16px gap

Wrap the scroll hint and the table scroll region together in one block with `mt-4`, and remove `mt-5` from the hint while keeping `mb-2`. At `lg` and wider the hint is hidden and the wrapper still contributes 16px; on smaller widths the hint sits 16px below the preceding panel and 8px above the table. The empty-state paragraph keeps its own `mt-5`; it is not a table.

Alternative considered: add `lg:mt-4` only to the scroll region. Rejected because spacing would differ between widths and the hint would still own the mobile gap.

### D6: Verification

- Unit tests call `formatEuroAmount` with explicit `en-US`, `de-DE`, and `nl-NL` locales and assert the exact characters, including `\u00A0`, for positive, negative, zero, and a large exact value.
- Component tests already compare against `formatEuroAmount`, so they follow without hardcoded expectations.
- Browser specs that hardcode `€60.00` are updated; regexes that already allow `\s*` stay valid.
- The Transactions shadow assertions flip from "none" to the sheet shadow at phone widths. At least one surface on each of the other routes is asserted to carry the shadow at a phone and a desktop width, so the all-widths rule is covered rather than just the Transactions screen.
- A browser assertion reads the table wrapper's computed `marginTop` as 16px on both analysis screens; a desktop check confirms the hint is hidden while the table is visible.
- `pnpm run test:unit`, `pnpm run test:components`, `pnpm run test:browser`, `pnpm run test:integration`, `pnpm run build`, and `openspec validate --strict` close the change.

## Risks / Trade-offs

- **Elevating every surface reverses a deliberate "sheets on paper" identity** → the token is subtle (1px/3px at 8% opacity), borders remain as containment, and a browser review can confirm the result is not noisy.
- **Two card families remain** (bordered table sheets and borderless panels) → accepted; unifying borders and radii is out of scope and would be a separate change.
- **A forced non-breaking space can fail exact string assertions** → update every hardcoded euro expectation and assert `\u00A0` in the unit tests; browser text matchers already treat it as whitespace.
- **The part walk could double-space a locale that already has a literal** → the adjacency check only inserts when no literal follows the currency part; `nl-NL` and `de-DE` tests cover both symbol-first-with-literal and symbol-after cases.
- **Editing `yearly.vue` while its introducing change is open** → sequence this change after that one is complete, using its final table structure.
- **A shadow on a scroll region can look clipped if an ancestor hides overflow** → the scroll regions themselves set `overflow-x-auto`; their wrappers do not clip. Verify the four table regions in the browser.

## Migration Plan

1. Reuse the existing token; no data or schema migration.
2. Apply the template changes and formatter change, then update the specs' tests.
3. Rollback is a normal code revert: remove the added `shadow-sheet` classes, restore the `shadow-none`/`sm:` conditions, remove the wrapper and hint margin move, and revert `formatEuroAmount`. No stored state is affected.

## Open Questions

None. The surface scope, separator character, and table gap were confirmed before planning.
