# Proposal

## Why

When a booking text holds an IBAN, the sync cuts the purpose line down to only the lines before the IBAN. Everything after the IBAN — often the actual payment reference — is moved into the counterparty name and lost from the purpose, so the stored purpose no longer reflects what the bank sent.

## What Changes

- When a booking text line holds an IBAN, the purpose line becomes the whole booking text, exactly as the bank presents it (all lines, including the IBAN line), instead of only the lines before the IBAN.
- The counterparty detection is unchanged: the account is the IBAN, and the name is the text after the IBAN on that line plus any later lines, or the whole booking text when nothing follows it.
- Rows without an IBAN keep the current mapping: the first line is the name and the later lines are the purpose.
- The `easybank-sync` spec's booking-text mapping requirement and its scenarios are updated to state the new purpose rule.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `easybank-sync`: the requirement "The booking text is mapped to a counterparty and a purpose" changes — for a booking text with an IBAN the purpose is the whole booking text, not the lines before the IBAN.

## Impact

- `shared/easybank.ts` — `mapBookingText` and the comments that describe the mapping.
- `tests/unit/easybank.test.ts` — the mapping cases and the client end-to-end expectation for the IBAN row; integration test expectations that read the stored purpose.
- Stored data: the purpose of IBAN rows imported after this change differs from the old mapping. Because the purpose is part of the dedupe fingerprint, rows already written by the sync under the old mapping (above the value-date floor) would not dedupe and could be written again; a non-writing run makes this visible before writes happen.
