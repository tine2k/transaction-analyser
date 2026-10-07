# Proposal

## Why

The Transactions period filter interleaves each year's months with that year's own whole-year choice, so whole-year choices are buried between month blocks and the list is hard to scan once data spans several years. Grouping the choices into labelled Years and Months sections makes both kinds of period easier to find.

## What Changes

- Present the period filter as two `<optgroup>` sections: a `Years` group listing each represented calendar year newest first, labelled with the bare year (`2026`), and a `Months` group listing each represented month newest first, labelled with its month and year (`March 2026`).
- Keep `All periods` as the first option, outside both groups.
- **BREAKING** for the filter's option list: year choices lose the `(year)` suffix and no longer sit after that year's months; months for all years now follow the years group.
- Leave filtering, the `month=YYYY-MM` / `year=YYYY` query mapping, the all-periods default, and the unknown-value fallback unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `transaction-table`: the period filter's option ordering, grouping, and year-choice label change; the rest of the filter requirement and its scenarios stay as they are.

## Impact

- `app/pages/index.vue`: the `periods` computed and the period `<select>` template.
- `tests/components/transactions.test.ts`: assertions on option order and the year label.
- No API, dependency, or stored-data changes.
