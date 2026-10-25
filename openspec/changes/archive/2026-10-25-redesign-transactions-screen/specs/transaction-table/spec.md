# Spec Delta

## ADDED Requirements

### Requirement: The category cell presents the category as a coloured pill

The system SHALL present each row's category as a pill-shaped labelled control carrying the category's colour from the application category palette as its identifying colour. An uncategorised row SHALL use a neutral pill naming the absence. The pill SHALL keep the category name readable and SHALL NOT convey the category by colour alone.

#### Scenario: A categorised row carries a coloured category pill

- **WHEN** a returned transaction carries a category
- **THEN** its category cell shows a pill carrying that category's palette colour and the category's name

#### Scenario: An uncategorised row carries a neutral pill

- **WHEN** a returned transaction has no category
- **THEN** its category cell shows a neutral pill naming `Uncategorised`, and no category colour or invented category is shown

#### Scenario: The pill text is legible

- **WHEN** a pill is rendered with a category colour
- **THEN** the category name remains readable against the pill's ground and is not conveyed by colour alone

### Requirement: The category pill remains the assignment control

The system SHALL keep the row's category control as the manual category assignment control defined by `manual-category-assignment`. It SHALL keep its choices, disabled state, and accessible name, SHALL NOT add a second assignment path, and SHALL keep the manual-assignment and update markers visible.

#### Scenario: The pill remains the assignment control

- **WHEN** the user inspects or operates a row's category pill
- **THEN** it still offers every stored category and the Uncategorised choice, exposes the category choice for that row to assistive technology, and assigns a chosen category through the existing manual assignment path

#### Scenario: The pill keeps the assignment markers

- **WHEN** a row is being updated or carries a manual assignment
- **THEN** its update marker or manual-assignment marker remains visible beside the pill

#### Scenario: Hidden categories keep their label

- **WHEN** the category choices include a hidden category
- **THEN** the pill's option list still marks that category as hidden

### Requirement: The table orders its columns for scanning

The system SHALL present the selection-control column first, followed in order by booking date, value date, purpose, counterparty name, counterparty account, person, category, and amount, so that the amount closes each row. This order SHALL NOT change which transaction value a column holds, which header sorts a column, or any value shown.

#### Scenario: The columns follow the screen order

- **WHEN** the table header is read from left to right
- **THEN** it presents the selection control, booking date, value date, purpose, counterparty name, counterparty account, person, category, and amount in that order

#### Scenario: The amount closes the row

- **WHEN** a row is read from left to right
- **THEN** its amount is the last value shown and is aligned with the amount header

#### Scenario: Values keep their own columns

- **WHEN** a transaction is shown after the order change
- **THEN** each value appears in the column for that element and in no other column

#### Scenario: Sorting follows the header identity

- **WHEN** the user activates a column header after the order change
- **THEN** the table sorts by that header's column and does not sort by its position in the row

## MODIFIED Requirements

### Requirement: The table shows the exact sum of visible transaction amounts

The system SHALL display a sum for the transaction rows currently shown after applying the active filters. The sum SHALL be the signed arithmetic total of those rows' returned decimal amounts, SHALL be computed with exact decimal arithmetic without floating-point rounding, and SHALL change when the visible rows change. The system SHALL present the sum using the browser's active locale's EUR currency and number conventions, including locale-appropriate thousands grouping and currency placement, while preserving the exact decimal value without rounding it. The sum SHALL be presented separately from the transaction columns and SHALL NOT alter or imply a stored transaction value. The sum SHALL be presented beside the displayed transaction count on the summary line beneath the page title: its label and value SHALL use the muted text colour and the same interface type size as the count. When no row is visible, the sum SHALL be zero, presented as a locale-formatted euro zero.

#### Scenario: The sum reflects only visible rows

- **WHEN** visible rows have amounts `-12.50` and `4.00` while another filtered-out row has amount `100.00`
- **THEN** the displayed sum is the locale-formatted euro value of `-8.50`

#### Scenario: The sum preserves exact decimal values

- **WHEN** visible rows have amounts `0.01` and `-0.02`
- **THEN** the displayed sum is the locale-formatted euro value of `-0.01`, without floating-point approximation or rounding

#### Scenario: The sum follows locale currency conventions

- **WHEN** the visible rows have a sum large enough to be grouped under the active locale
- **THEN** the displayed sum uses that locale's EUR currency and number conventions, including thousands grouping, and its sign remains readable

#### Scenario: No visible transactions have a zero sum

- **WHEN** the active filters match no transaction
- **THEN** the table's displayed sum is a locale-formatted euro zero

#### Scenario: The sum is secondary to the count

- **WHEN** the summary is rendered with at least one visible transaction
- **THEN** the sum is presented on the summary line beside the count in the muted text colour, at the same interface type size as the count

#### Scenario: The secondary placement survives filtering

- **WHEN** the user changes a filter and the visible rows and their sum change
- **THEN** the updated sum remains on the summary line beneath the page title beside the updated count

### Requirement: The displayed transaction count accompanies the sum

The system SHALL display, on the summary line beneath the page title, the number of transaction rows currently shown together with the sum of those rows. The count SHALL cover the same rows as the sum, SHALL change when the visible rows change, and SHALL NOT describe the complete endpoint response while a filter is active. The count SHALL be labelled as a count of transactions, using singular wording for exactly one visible transaction and plural wording otherwise, and SHALL be zero when no row is visible. The count SHALL precede the sum in the summary's reading order and on the rendered line, and SHALL use the primary ink colour at the interface type size rather than page-title scale. The summary SHALL report no total beyond the count and the visible-row sum.

#### Scenario: The count matches the visible rows the sum covers

- **WHEN** the endpoint returns four transactions and the active filters show two rows while the other two are filtered out
- **THEN** the displayed transaction count is 2, describing the same rows as the sum

#### Scenario: The count follows the active filters

- **WHEN** the user changes a filter so the visible rows change
- **THEN** the displayed transaction count changes to the new number of visible rows together with the sum

#### Scenario: One visible transaction uses singular wording

- **WHEN** exactly one transaction row is visible
- **THEN** the count is presented with singular transaction wording, such as `1 transaction`

#### Scenario: No visible transactions show a zero count

- **WHEN** the active filters match no transaction
- **THEN** the displayed transaction count is 0, the sum remains a locale-formatted euro zero, and the empty state is shown

#### Scenario: The count precedes the sum

- **WHEN** the summary line is read in document order
- **THEN** the transaction count comes before the sum of displayed transactions

#### Scenario: The count is the summary's most prominent figure

- **WHEN** the summary is rendered with at least one visible transaction
- **THEN** the count uses the primary ink colour and the sum uses the muted colour at the same interface type size

#### Scenario: The count keeps its prominence for every visible row count

- **WHEN** the visible rows change so the count is one, many, or zero
- **THEN** the count remains the summary's primary figure through its ink colour and singular or plural wording, while the sum stays muted

#### Scenario: The count stays compact at every viewport

- **WHEN** the summary is rendered on a narrow or a wide viewport
- **THEN** the count renders at the interface type size in both cases, without scaling to page-title size, while the sum stays the same size and muted

#### Scenario: The summary sits beneath the page title

- **WHEN** the Transactions screen is rendered
- **THEN** the summary line appears after the `Transactions` page title and before the filter controls

#### Scenario: The summary adds no other total

- **WHEN** the summary line is rendered
- **THEN** it shows only the visible transaction count and the visible-row sum, and presents no income, spending, or other aggregate the read endpoint did not return
