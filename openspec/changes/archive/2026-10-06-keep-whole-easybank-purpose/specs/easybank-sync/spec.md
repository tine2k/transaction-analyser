# Spec Delta

## MODIFIED Requirements

### Requirement: The booking text is mapped to a counterparty and a purpose

The bank's list gives each transaction a booking text of one or more lines and no separate counterparty columns. The sync SHALL map that text as follows, and SHALL always produce a non-empty counterparty name and a non-empty purpose line. When a line holds an IBAN, the counterparty account SHALL be that IBAN, the counterparty name SHALL be the text after the IBAN on that line together with any later lines, and the purpose line SHALL be the whole booking text, including the IBAN line. When no line holds an IBAN, the counterparty name SHALL be the first line, the purpose line the later lines, or the first line again when there are none, and the counterparty account SHALL be absent. When a line holds an IBAN but nothing follows it, the counterparty name SHALL be the whole booking text.

#### Scenario: A transfer with an IBAN

- **WHEN** the booking text is `Abbuchung Dauerauftrag` followed by a line holding an IBAN and a name
- **THEN** the counterparty account is that IBAN, the counterparty name is the text after it, and the purpose line is the whole booking text, including the IBAN and the name

#### Scenario: Lines after the IBAN stay in the purpose

- **WHEN** the booking text is `Abbuchung Dauerauftrag`, then a line holding an IBAN and a name, then `Miete Oktober 2026`
- **THEN** the counterparty name is the text after the IBAN and the later line, and the purpose line is all three lines exactly as the bank sent them

#### Scenario: A card payment without an IBAN

- **WHEN** the booking text has no IBAN and reads `Bezahlung Karte` on its first line and merchant details on the later lines
- **THEN** the counterparty name is `Bezahlung Karte`, the purpose line is the later lines, and no counterparty account is stored

#### Scenario: A single-line booking text

- **WHEN** the booking text is one line with no IBAN
- **THEN** that line is both the counterparty name and the purpose line, so neither is empty

#### Scenario: An IBAN on the first line

- **WHEN** the first line of the booking text holds the IBAN
- **THEN** the purpose line is the whole booking text, so the required purpose is never empty

#### Scenario: An IBAN with nothing after it

- **WHEN** the line holding the IBAN carries no text after it and no later line exists
- **THEN** the counterparty name and the purpose line are both the whole booking text, so neither is empty
