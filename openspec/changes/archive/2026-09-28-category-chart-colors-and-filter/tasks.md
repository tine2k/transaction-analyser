# Tasks

## 1. Stable Category Colors

- [x] 1.1 Add a deterministic color mapping keyed by category identity, with a distinct key for uncategorised, and add unit coverage proving colors do not vary with category ordering; verify with `npm run test:unit`.
- [x] 1.2 Apply the mapped color to each pie slice and its monthly total indicator; extend analytics component tests to verify matching colors across months with differing category sets; verify with `npm run test:components`.

## 2. Uncategorised Visibility Control

- [x] 2.1 Add an accessible page-wide control that shows uncategorised by default and filters uncategorised from both pie data and visible totals when selected; extend component tests to verify default, hide/show behavior, unchanged named totals, and empty visible months while retaining all twelve panels.
- [x] 2.2 Verify toggling makes no additional transaction request and changes no stored data; cover the single existing read request in the component tests and verify with `npm run test:components`.

## 3. Integration Verification

- [x] 3.1 Run `npm run test:unit`, `npm run test:components`, and `npm run build`; verify all pass with the existing twelve-month chart behavior preserved.
