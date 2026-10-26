# Proposal

## Why

The Monthly and Yearly reports currently expose calendar months that have not happened yet: empty month pills, unused matrix columns, and future period choices. These entries add noise without showing meaningful history, so users have to scan past them to reach the months that actually have data. Hiding them makes every report and period filter end at the current month.

## What Changes

- Define a future month as any calendar month strictly after the month containing today, and a future year as any calendar year after the current year.
- **Monthly**: the year control offers only represented years up to the current year; the month controls offer January through the current month for the current year and all twelve months for a past year.
- **Yearly**: year pills offer only represented years up to the current year; the matrix shows only elapsed month columns (January through the current month for the current year, all twelve for a past year).
- **Transactions**: the period filter omits future months and future years from its choices. Future-dated rows remain visible under `All periods` and searches, and in report totals, as they do today.
- Future month and future year query values are not offered. A link carrying one falls back through the existing default selection rather than selecting an unavailable period.
- The Monthly average report already covers a trailing window ending with the current month and needs no behavior change.
- **BREAKING** for anyone relying on future month pills, future matrix columns, or future period-filter choices; these controls disappear rather than being disabled.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `category-spending-chart`: the Monthly year and month controls no longer offer future years or future months, and an explicit future month link falls back to the default month.
- `monthly-category-totals-table`: the Yearly year pills and month columns no longer offer future years or future months, a future year link falls back, and year totals still include transactions dated in hidden future months.
- `transaction-table`: the period filter no longer offers future months or future years; future-dated rows remain in all-period and search views.

## Impact

- Browser pages: `app/pages/monthly.vue`, `app/pages/yearly.vue`, `app/pages/index.vue`.
- Shared analysis helpers: `app/utils/category-spending.ts` (year options, month options, selected year/month resolution, matrix month construction, period option filtering).
- Tests: unit tests for the analysis helpers, component tests for Monthly and Yearly, Transactions page tests, and browser coverage for the three screens.
- No server endpoint, database schema, stored data, or API response changes.
