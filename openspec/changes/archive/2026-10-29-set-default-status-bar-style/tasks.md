# Tasks

## 1. Deliver the default status bar style

- [x] 1.1 In `nuxt.config.ts`, change the `apple-mobile-web-app-status-bar-style` metadata content from `black-translucent` to `default`, and rewrite the comment above `app.head` so it describes iOS drawing its own status-bar band instead of the brand bar painting through the top safe area. Verify by reading the file that exactly one status-bar meta tag exists, its value is `default`, and no comment still claims a translucent status bar.
- [x] 1.2 In `tests/integration/api.test.ts`, change the `apple-mobile-web-app-status-bar-style` expectation from `black-translucent` to `default`, leaving the viewport, theme-colour, capability, and title assertions unchanged. Verify by reading the test that it asserts the literal `default` value.

## 2. Verify the delivered document

- [x] 2.1 Run `pnpm run test:integration` and verify the install-metadata test passes, including the single `viewport-fit=cover` viewport tag, `#101B5D` theme colour, both capability tags, the new `default` status-bar value, and the `Expenses` title.

## Workflow follow-up

- On the iPhone, remove and re-add the home-screen shortcut so iOS reads the new status-bar metadata.
- Archive the change after implementation and verification are complete.
