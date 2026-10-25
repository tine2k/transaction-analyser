# Spec Delta

## REMOVED Requirements

### Requirement: Content surfaces are sheets separated by rules

**Reason**: Replaced by uniform surface elevation. The old rule forbade decorative shadows on every content panel except the desktop Transactions sheets, which is the behavior this change reverses.

**Migration**: Use `Every content surface rests elevated` and `Content surfaces sit on the paper ground`; every content surface region now carries the theme's resting shadow at every viewport width.

## ADDED Requirements

### Requirement: Every content surface rests elevated

The system SHALL render every content surface region — filter groups, table regions, summary figures, list panels, form panels, and the Transactions filter and table sheets — with the theme's resting shadow at every viewport width. It SHALL NOT render a content surface region without that resting shadow.

#### Scenario: Every content surface rests elevated

- **WHEN** any content surface region is rendered at a phone, tablet, or desktop width
- **THEN** its computed box shadow is the theme's resting shadow

#### Scenario: Transactions sheets may rest elevated

- **WHEN** the Transactions filter and table sheets are rendered at a desktop width
- **THEN** each carries a subtle resting shadow rather than relying only on the surface-over-paper distinction

#### Scenario: Summary figures are cards

- **WHEN** the Monthly or Yearly summary figures are rendered
- **THEN** each is a surface region carrying the theme's resting shadow

### Requirement: Content surfaces sit on the paper ground

The system SHALL separate content with the surface color over the paper ground. Related content MAY be grouped on a rounded surface region, and the Transactions screen SHALL group its filters and its table on separate sheets. Stronger elevation SHALL be reserved for elements that float above content, such as the fixed action bars.

#### Scenario: Transactions content is grouped on sheets

- **WHEN** the Transactions screen is rendered
- **THEN** its filter controls and its table are each presented on a rounded surface sheet over the paper ground

#### Scenario: Floating elements may elevate

- **WHEN** the application shows a fixed action bar that floats above content
- **THEN** that bar may carry a stronger shadow than the resting surface shadow
