# Spec Delta

## MODIFIED Requirements

### Requirement: Every route renders inside one default layout

The system SHALL render every route inside one default layout, which supplies the application's frame: the document's shared metadata, the page container, and the shared heading area. No route SHALL be able to render outside that layout. The layout SHALL apply to the failure page as well as to the routes, so that a failure is presented in the same frame as a successful page. The system SHALL NOT add a second layout, and SHALL NOT let a route opt out of the default one. The frame's page container and the masthead's inner content SHALL span the full width of the viewport, and SHALL NOT constrain themselves to a centered maximum-width column, so that the frame uses the horizontal room a large display provides. The frame SHALL use 32px top, 40px horizontal, and 64px bottom padding at desktop widths, and 20px top, 16px horizontal, and 32px bottom padding at phone widths, so its content is not flush against the viewport edge. The frame SHALL remain within the viewport at every supported width and SHALL NOT introduce page-level horizontal overflow.

#### Scenario: A route renders inside the frame

- **WHEN** the index route is requested
- **THEN** the response contains the shared frame with the page's content inside it

#### Scenario: The failure page uses the same frame

- **WHEN** a request fails, or names a route that does not exist
- **THEN** the failure page is delivered inside the same frame as a successful page

#### Scenario: There is exactly one layout and no route escapes it

- **WHEN** the application's layouts and routes are inspected
- **THEN** exactly one layout is defined, it is the one every route renders in, and no route declares that it renders without it

#### Scenario: The frame spans the viewport width

- **WHEN** a route is rendered on a display wider than the frame's content
- **THEN** the frame's container and the masthead's inner content extend to the full width of the viewport rather than stopping at a centered maximum-width column, with only the named padding inset between the content and the viewport edge

#### Scenario: Desktop and phone padding follow the design

- **WHEN** a route is rendered at a desktop width and again at a phone width
- **THEN** the frame uses 32px top, 40px horizontal, and 64px bottom padding on desktop, and 20px top, 16px horizontal, and 32px bottom padding on the phone

## REMOVED Requirements

### Requirement: The shared main frame is bounded and padded to the design

**Reason**: The product now requires desktop layouts to use the full viewport width. The 1280px centered maximum directly contradicted the frame requirement above and the design instruction that desktop content must use the available width.

**Migration**: Use the full-width frame in `Every route renders inside one default layout`, which keeps the same desktop and phone padding without a maximum width. Screen-level readable widths, such as form columns, remain permitted and are not a frame bound.
