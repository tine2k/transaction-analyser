# Spec Delta

## MODIFIED Requirements

### Requirement: The category table shows share, transactions, and amount

The page SHALL present a table with one row per listed category and the columns Category, Share of top category, Transactions, and Amount at every width. Below the `sm` breakpoint the rendered column order SHALL be Category, Amount, Share of top category, Transactions; from `sm` up it SHALL be Category, Share of top category, Transactions, Amount. The reordering SHALL NOT change which value a column holds. Share SHALL be the category's amount as a percentage of the greatest category amount, with the greatest at 100%. Transactions SHALL be the count of included transactions in that category. Amount SHALL be the exact absolute total in the browser's locale EUR format. When the greatest category amount is zero, no row SHALL show a share fill.

#### Scenario: The largest category is the full share

- **WHEN** the greatest category amount is `100.00`
- **THEN** that category's share is `100` percent

#### Scenario: Other categories are proportional to the largest

- **WHEN** the greatest category amount is `100.00` and another category's amount is `25.00`
- **THEN** the second category's share is `25` percent

#### Scenario: The row counts its own transactions

- **WHEN** a category has three included transactions in the selected month
- **THEN** its Transactions cell shows `3`

#### Scenario: The amount uses locale EUR formatting

- **WHEN** a category's exact total is large or fractional
- **THEN** its Amount cell shows the exact value with the browser locale's EUR currency and thousands conventions, without rounding

#### Scenario: The table lists every category, not only the top eight

- **WHEN** the selected month lists ten categories
- **THEN** the table lists all ten rows while only eight appear as separate bar segments

#### Scenario: The amount follows the category on a phone

- **WHEN** the Monthly category table is rendered below the `sm` breakpoint
- **THEN** Amount is the second column, immediately after Category, and Share and Transactions follow it

#### Scenario: The phone order changes no value

- **WHEN** the Monthly category table is rendered below the `sm` breakpoint
- **THEN** each row still holds the same category, exact amount, share, and transaction count as at a wider width, and the row order is unchanged

## ADDED Requirements

### Requirement: The Monthly category table keeps its category visible on a phone

Below the `sm` breakpoint, the Monthly category table SHALL pin its Category column at the leading edge of its scroll region with an opaque background and SHALL use compact share and cell metrics. Amount SHALL be the first column after the pinned Category column, so the first horizontal scroll reveals the amount. Pinning and compacting SHALL NOT change the columns, the value each cell holds, the share calculation, the transaction count, the amount, the row order, or the row's link target.

#### Scenario: The category stays visible while the amount and share scroll

- **WHEN** a phone reader scrolls the Monthly category table horizontally
- **THEN** each visible row's Category cell remains at the leading edge with an opaque background

#### Scenario: The amount is the first cell revealed by scrolling

- **WHEN** a phone reader scrolls the Monthly category table towards its end
- **THEN** the Amount cell for each row is reached before the Share and Transactions cells

#### Scenario: Compact share keeps its proportion

- **WHEN** the share column is shown with compact phone metrics
- **THEN** each row's share fill still represents its amount as a percentage of the greatest category amount, unchanged from the wider layout

#### Scenario: Every value remains reachable at 320 pixels

- **WHEN** the Monthly category table is shown at a 320 CSS-pixel viewport width
- **THEN** every category, amount, share, and transaction count remains present and reachable by scrolling the table region, and the page has no horizontal overflow

#### Scenario: Row links keep their target

- **WHEN** a pinned or compacted row is activated on a phone
- **THEN** it opens the same transaction link, with the same month, category, and person values, as the wider layout
