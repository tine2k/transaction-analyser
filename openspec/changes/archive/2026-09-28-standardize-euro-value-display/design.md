# Design

## Context

See `proposal.md` — Why.

The application already has one exact-decimal locale formatter: `formatEuroAmount(amount: string, locale?: string)` in `app/utils/category-spending.ts`. It parses the decimal string into a BigInt coefficient and scale (`parseDecimal`), formats the integer and fraction parts with `Intl.NumberFormat`, and reassembles them using the locale's currency template — so it applies locale EUR conventions without ever passing the value through a JS `number`. It is already used by `analytics.vue`, `monthly-totals.vue`, and `monthly-average.vue`.

`app/pages/index.vue` computes the visible sum with `sumSignedAmountStrings(...)` (exact, string-preserving) but renders it directly, `{{ visibleTotal }}`, so the one derived euro value in the app is shown as a bare decimal. The `transaction-table` spec pins that bare rendering today, and `tests/components/transactions.test.ts` asserts substrings such as `-0.25`.

The raw amount column (`transaction.amount`) is deliberately left alone: the same spec requires it to be the exact returned string, and the new `euro-value-display` capability keeps that rule.

## Goals / Non-Goals

**Goals:**
- Present the Transactions page's visible sum as a locale-formatted EUR value, preserving exact decimal arithmetic.
- State the euro-display rule as an enforceable cross-cutting contract (`euro-value-display`).
- Keep a single implementation of the formatter so surfaces cannot diverge.

**Non-Goals:**
- Changing or reformatting the raw transaction amount column, the date columns, or any non-euro value.
- Changing the arithmetic that produces the sum, or introducing a second/independent sum.
- Moving or renaming `formatEuroAmount`'s module, or changing `formatEuroAmount`'s behaviour (including its exact-scale output).
- Adding a currency selector or any support for a currency other than EUR.

## Decisions

### D1 — Reuse `formatEuroAmount` for the visible sum

Call the existing `formatEuroAmount(visibleTotal)` when rendering the sum, instead of rendering the raw string. The helper already preserves exact digits and applies locale EUR conventions, which satisfies both the modified `transaction-table` requirement and the new `euro-value-display` requirement.

*Alternatives considered:* inline `new Intl.NumberFormat(...).format(Number(sum))` — rejected, it converts through a float and can round, contradicting the exact-decimal requirement; hard-coding a `€` prefix on the decimal string — rejected, it does not localize grouping, separator, or currency placement. Both would also create a second presentation for the same value, which the "same value, same presentation" requirement forbids.

### D2 — Keep the raw amount cell verbatim

Leave `{{ transaction.amount }}` unchanged. The row amount is a stored value whose sign is the direction, not a derived total; both `transaction-table` and `euro-value-display` require it exactly as returned.

*Alternatives considered:* formatting every amount column for visual consistency — rejected, it would lose the verbatim contract the read API and table spec deliberately preserve.

### D3 — Keep the formatter where it is

Do not extract a new module; only add the importer. `formatEuroAmount` is already exported and shared, so the "one formatter" contract holds. Extracting it to a dedicated euro module is a rename/refactor with no behavior change.

*Alternatives considered:* extracting `formatEuroAmount` and the decimal helpers into a dedicated `euro-amount` module — deferred; it adds churn across every importing page and test for no user-visible benefit, and the module boundary can move later without touching the specs.

### D4 — Use the browser's default locale

Call `formatEuroAmount(amount)` with no explicit locale, matching every other surface. The helper defaults to the runtime's active locale.

### D5 — Let the formatter handle zero and sign

The sum is passed through unchanged, including `0` and negatives. No special-casing: `formatEuroAmount` already renders signs and the locale's EUR zero. The formatter preserves the exact scale, so an exact `0` sum renders with the locale's zero form (which may omit cents) rather than an invented `.00`.

## Risks / Trade-offs

- **[Locale-dependent assertions]** Hard-coded expected strings (e.g. `-0.25`) break once the sum is localized. → Assert against `formatEuroAmount('-0.25')` etc., as the analytics and monthly-totals tests already do, so tests are locale-agnostic.
- **[Behavior change to an existing pinned requirement]** The `transaction-table` scenarios and tests currently name bare decimals. → Ship the spec delta and test updates in the same change; the requirement is intentionally modified, not silently broken.
- **[Zero renders without cents]** An exact `0` sum shows the locale EUR zero rather than `0.00`. → Accepted per D5 and the spec wording ("locale-formatted euro zero"); forcing two decimals would change every existing aggregate surface, so it is out of scope.
- **[Import coupling]** `index.vue` gains a dependency on the same formatter used by category pages. → Intended: one shared formatter is the contract; no new dependency edge in the build.

## Migration Plan

Presentation-only; stored data and the API are untouched, so no data migration or rollback work is required. If reverted, the page returns to the bare-decimal sum and the specs/tests revert with it.

## Open Questions

- Whether `formatEuroAmount` should eventually live in a dedicated euro-formatting module rather than `category-spending.ts`. Deferrable; does not affect the specs, approach, or tasks.
