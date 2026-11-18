# Tasks

## 1. Theme tokens

- [x] 1.1 Add `--color-amount-positive: #0b5132;` and `--color-amount-negative: #8a1428;` to the `@theme` block in `app/assets/css/main.css`, beside the existing ink, muted, failure, and brand tokens.
- [x] 1.2 Verify Tailwind generates the `text-amount-positive` and `text-amount-negative` utilities: run `pnpm run build` and grep the built stylesheet under `.output/public/_nuxt/` for both custom properties and both utility class names.

## 2. Direction binding on both presentations

- [x] 2.1 Add an `amountTone(amount: string)` helper in `app/pages/index.vue` that returns `negative` when the trimmed exact string starts with `-` and is not zero, `positive` otherwise, and `zero` when `isZeroAmountString` reports zero; it must not call `Number` or any numeric parse. Verify with the component tests from 2.2 and 2.3.
- [x] 2.2 Bind the desktop table's amount cell to `text-amount-negative`, `text-amount-positive`, or `text-ink` from `amountTone`, replacing the hardcoded `text-ink` and leaving the rendered text as `transaction.amount`. Extend `tests/components/transactions.test.ts` to assert the class and exact text for a negative (`-12.50`), positive (`250.00`), and zero (`0.00`) amount, and verify `pnpm run test:components` passes.
- [x] 2.3 Bind the phone card's `[data-transaction-field="amount"]` span to the same three classes. Extend the card test in `tests/components/transactions.test.ts` (stubbing `matchMedia` as the existing card tests do) to assert the class for a negative, positive, and zero amount with the card's ink colour used for zero, and verify `pnpm run test:components` passes.

## 3. Browser verification

- [x] 3.1 Update the `amountColor` expectation in `tests/browser/mobile-transaction-cards.spec.ts` from `rgb(32, 30, 62)` to the negative-amount colour for its `-12.50` fixture, and keep the existing text assertion that the minus sign is shown.
- [x] 3.2 Add `tests/browser/transaction-amount-colours.spec.ts` covering the table at a desktop width and the cards at a phone width: assert a negative amount computes to `rgb(138, 20, 40)`, a positive amount to `rgb(11, 81, 50)`, and a zero amount to `rgb(32, 30, 62)`; use `tests/browser/contrast.ts` to assert at least 4.5:1 against white for both directions and that the two colours differ; assert the amount text is unchanged. Verify with `pnpm run test:browser`.
- [x] 3.3 Confirm in the browser checks that the summary line's sum stays muted, the desktop table's other columns keep their ink colour, and no amount shows a currency symbol, grouping, or changed digits.

## 4. Full verification

- [x] 4.1 Run `pnpm run test:unit` and `pnpm run test:components`; both must pass.
- [x] 4.2 Run `pnpm run test:browser`; the full Playwright suite must pass, including the new colour spec.
- [x] 4.3 Run `pnpm run test:integration`; the build and integration suite must pass.

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied.
- Per `AGENTS.md`, commit all changes and push to the remote after archive; report any commit or push failure.
