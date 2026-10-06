# Spec Delta

## MODIFIED Requirements

### Requirement: Retrieved rows go through the same import path as a manual file

The sync SHALL hand the retrieved rows to the same import path the manual CSV import uses, as the `transaction-csv-import` capability defines, so that a row already stored is skipped, no stored transaction is updated or deleted, and each newly written row is categorised by the stored categories as that path defines.

#### Scenario: A row already stored is skipped

- **WHEN** the retrieved rows hold a transaction the table already holds
- **THEN** no second copy of that transaction is written

#### Scenario: Stored rows are left alone

- **WHEN** the sync imports new rows
- **THEN** every transaction that was already stored is unchanged

#### Scenario: A newly imported row is categorised like a CSV row

- **WHEN** the sync writes a row whose purpose line matches a stored category's expression
- **THEN** the written transaction holds that category, exactly as a CSV import of the same row would
