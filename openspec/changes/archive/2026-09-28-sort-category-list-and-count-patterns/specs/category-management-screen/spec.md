# Spec Delta

## MODIFIED Requirements

### Requirement: The category screen lists every category with its name and expression

When the category management screen is loaded, the browser SHALL request `GET /api/categories` from the same origin and SHALL show a row for each returned category carrying its name and the count of regular expressions in that category's `patterns` array. The list SHALL NOT display the regular-expression values themselves; they remain available in the create and edit forms. It SHALL show every returned category, dropping none. The rows SHALL be ordered by category name in ascending, case-insensitive alphabetical order, with category identity in ascending order as a tie-breaker for equal names. The list SHALL show a defined state when no category is returned, stating that there are no categories rather than an empty list. It SHALL show a distinct state when the request fails, stating that the categories could not be loaded. It SHALL NOT invent a category or a count, or show a category that the endpoint did not return.

#### Scenario: Every category gets a row

- **WHEN** the endpoint returns several categories
- **THEN** the screen shows one row for each category, carrying its name and expression count

#### Scenario: The list shows expression counts but not expression values

- **WHEN** a returned category carries two regular expressions
- **THEN** its row shows the count `2` and neither regular-expression value

#### Scenario: Categories are ordered by name

- **WHEN** the endpoint returns categories in an order different from their names
- **THEN** the screen shows them in ascending alphabetical order by name, ignoring case, with equal names ordered by ascending category identity

#### Scenario: An empty list is explained

- **WHEN** the endpoint returns no category
- **THEN** the screen states that there are no categories, and no row is invented

#### Scenario: A failure is not an empty result

- **WHEN** the request for categories fails
- **THEN** the screen states that the categories could not be loaded, and does not read as an empty list
