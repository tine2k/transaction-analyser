# Tasks

## 1. Mapping and Tests

- [x] 1.1 In `shared/easybank.ts`, make the IBAN branch of `mapBookingText` return the whole booking text as the purpose and drop the lines-before-the-IBAN computation; update the file and function comments to state the new rule, and update the unit test expectations that encode the old purpose, including the client end-to-end Netflix row — verify `npm run test:unit` passes and the IBAN cases assert the whole text, per the `easybank-sync` delta and design.md D1, D2
- [x] 1.2 Extend the stored-row assertion in `tests/integration/easybank-sync.test.ts` so the IBAN row's purpose is asserted as the whole booking text — verify `npm run test:integration` passes against the disposable database the launcher creates

## 2. Integration Verification

- [x] 2.1 Run the full automated suite (`npm test`) with the local disposable database and confirm the unit, component, and integration suites pass together, per AGENTS.md's database-test rules

## Workflow follow-up

- Archive the change once the project's review requirements are satisfied, and verify the `easybank-sync` main spec now states the whole-text purpose.
