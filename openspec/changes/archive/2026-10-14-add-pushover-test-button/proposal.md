# Proposal

## Why

The Pushover notification is configured only through server environment variables, so an operator
cannot tell whether the token and recipient key actually work until a real sync with uncategorised
rows goes unnoticed. A control on the imports screen that sends one test message turns that silent
assumption into an immediate, visible check.

## What Changes

- The imports screen gains a "Send test notification" control. It asks the server to send one test
  message through Pushover and shows the outcome: the message was sent, the configuration is
  absent, or the send failed with its reason. The control is disabled while its request is in
  flight, starts no import, and changes no stored data.
- A new endpoint `POST /api/imports/test-notification` performs the send on the server, using the
  same environment credentials, the same Pushover request path, and the same time bound as the
  import notification. A send Pushover refuses is answered as an outcome, not as an HTTP failure.
- The shared notification module gains a test-send entry point. The request-building and
  failure-reason code is extracted so the test and the real notification share one send path and
  one credential-redaction rule.
- The test message is a fixed text that identifies itself as a test and carries no transaction
  detail and no credential.
- No settings UI, no persisted record of the test, no schema change, and no new dependency.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `import-notification`: the Pushover configuration can be tested from the imports screen — the
  test control and its disabled-while-running state, the fixed test message, the reported outcome
  (sent / configuration absent / failed with reason), the shared send path and environment
  credentials, and the time bound.
- `backend-shell`: the API inventory gains the notification-test endpoint at
  `POST /api/imports/test-notification`, which sends a test notification and writes no stored data.

## Impact

- `shared/import-notification.ts`: a new exported test-send function; the send request is extracted
  into one private helper both entry points use.
- New route `server/api/imports/test-notification.post.ts`, and the `backend-shell` endpoint
  allow-list changes accordingly.
- `app/pages/imports.vue`: the control, its in-flight state, and its inline outcome message,
  following the existing "Sync now" and "Re-categorise all" pattern.
- Tests: unit tests for the shared test-send function against a stub fetch, integration tests for
  the endpoint against the existing fake Pushover helper, and component tests for the screen.
- No migration and no change to the sync path, the import record, or the real notification.
