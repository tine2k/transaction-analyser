# Tasks

## 1. Shared send path

- [x] 1.1 Extract the request-building and send block of `notifyImport` in `shared/import-notification.ts`
      into a private `sendMessage(config, summary)` helper and make `notifyImport` call it; verify
      `npx vitest run tests/unit/import-notification.test.ts` still passes with its existing assertions unchanged.
- [x] 1.2 Add an exported `sendTestNotification(config)` that sends the fixed test title and message through
      `sendMessage` and returns the shared outcome (`sent` / `skipped` / `failed` with reason); verify with
      new unit tests using a stub `fetchImpl` for success, a refusal whose reason carries Pushover's `errors`,
      a thrown fetch, a hanging fetch that ends by the bound, and unconfigured config where no request is
      attempted (`npx vitest run tests/unit/import-notification.test.ts`).

## 2. Notification-test endpoint

- [x] 2.1 Add `server/api/imports/test-notification.post.ts` that reads the config with
      `notificationConfigFromEnv(process.env)`, calls `sendTestNotification`, maps `skipped` to
      `unconfigured`, and answers a 200 `{ status: 'sent' }` / `{ status: 'unconfigured' }` /
      `{ status: 'failed'; reason }`, reserving a 500 for being unable to answer at all.
- [x] 2.2 Add integration tests in the `tests/integration/easybank-sync-api.test.ts` style that spawn the
      built server against `tests/helpers/fake-pushover.ts`: a configured call answers `sent` and the fake
      records exactly one POST to `/1/messages.json` carrying the token, user, and test text; an
      unconfigured spawn answers `unconfigured` with no request recorded; an error-mode fake answers
      `failed` with a reason that names no credential; and no `import_runs` row is created. Verify with
      `npm run test:integration`.

## 3. Imports screen control

- [x] 3.1 Add the "Send test notification" control to `app/pages/imports.vue` following the existing action
      pattern: a `testing` ref with a re-entrancy guard, the button disabled and its label swapped while in
      flight, and an inline `role="status"` paragraph with `data-testid="test-notification-status"` (button
      `data-testid="test-notification-button"`) mapping sent / unconfigured / failed-with-reason / transport
      error, with no log refresh.
- [x] 3.2 Extend `tests/components/imports.test.ts` to cover the control: the click POSTs to the endpoint,
      the button is disabled while the request is deferred, each outcome renders its message, and a rejected
      request renders the generic message. Verify with `npm run test:components`.
- [x] 3.3 Extend the browser test for the imports screen to intercept the endpoint and assert the new button
      and its status rendering; verify with `npm run test:browser`.
- [x] 3.4 Document the control in the README's Pushover section: the imports screen's test button verifies
      the configured credentials by sending one message. Verify the button name and screen in the text match
      the implementation.

## 4. Integration verification

- [x] 4.1 Run `npm test` and confirm the full suite passes, including the existing sync, import log, and
      notification tests, with no change to their outcomes.
