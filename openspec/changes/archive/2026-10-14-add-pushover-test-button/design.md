# Design

## Context

See proposal.md — Why. The current state that shapes the approach:

- `shared/import-notification.ts` is framework-free and holds the only Pushover HTTP path: it reads
  `PUSHOVER_TOKEN`, `PUSHOVER_USER`, and the optional `PUSHOVER_BASE_URL` from the caller's
  environment map, posts a summary, is bounded by `AbortSignal.timeout(10_000)`, and builds failure
  reasons that never contain a credential. Its trigger, however, is run-shaped:
  `uncategorisedSummary(plan)` only produces a summary from an `ImportPlan`.
- The configuration is environment-only. No settings table, runtime config, endpoint, or screen
  exists for Pushover, and the capability forbids putting the credentials in a response or a file.
- `app/pages/imports.vue` already carries two controls ("Sync now", "Re-categorise all") that
  follow one pattern: a boolean ref with a re-entrancy guard, a `$fetch` POST, an inline
  `role="status"` message, a disabled control while in flight, and `data-testid` hooks that both
  component and Playwright tests assert.
- The `backend-shell` capability enumerates the API surface and forbids further endpoints, so a
  new endpoint requires a spec delta there.
- Test infrastructure already exists for exactly this feature: `tests/helpers/fake-pushover.ts`,
  the `PUSHOVER_BASE_URL` override, the component mocking pattern in `tests/components/imports.test.ts`,
  and the spawned-server pattern in `tests/integration/easybank-sync-api.test.ts`.

## Goals / Non-Goals

**Goals:**

- One click on the imports screen verifies the deployed Pushover configuration end to end — server
  environment to Pushover to a delivered message — and reports the result on the screen.
- Reuse the notification's single send path, credential handling, timeout, and redaction rule;
  no second HTTP implementation and no second failure-reason rule.
- Fully testable without a network: an injected `fetch` for unit tests and the existing fake
  Pushover server for integration tests.

**Non-Goals:**

- No settings or configuration screen, and no credential ever entered or shown in the browser.
- No retry, no delivery history, no test record in the database or the import log.
- No change to the real notification's trigger, its summary, the sync path, or the import record.
- No new dependency and no schema migration.

## Decisions

### Send on the server behind `POST /api/imports/test-notification`

The browser cannot hold the credentials (the `frontend-shell` capability forbids delivering any
server-only configuration value to it), and a direct browser-to-Pushover call is cross-origin. The
send therefore happens on the server through a new endpoint.

The path groups the control with the imports screen it lives on. Alternatives: a new top-level
`/api/notifications/test` namespace for one endpoint, or `/api/pushover/test`, which names the
vendor rather than the capability — both rejected in favour of the existing namespace.

The handler follows `server/api/easybank/sync.post.ts`: a domain outcome is answered with a 200
and a small body, and only an inability to answer is an HTTP 500. The body is
`{ status: 'sent' } | { status: 'unconfigured' } | { status: 'failed'; reason: string }`. The
endpoint reads no request body and takes no parameter.

### One send path: extract `sendMessage` and add `sendTestNotification`

The request-building block in `notifyImport` (`shared/import-notification.ts:118-149`) becomes a
private `sendMessage(config, summary)` helper that posts the summary and maps the answer onto
`ImportNotificationOutcome`. `notifyImport` keeps its trigger logic and calls it; a new exported
`sendTestNotification(config)` calls it with a fixed summary. Both reuse `isConfigured`, `readJson`,
`listedErrors`, `notificationFailure`, and the timeout, so credential redaction and the time bound
cannot drift between the test and the real notification.

Alternatives rejected:

- Reusing `notifyImport` with a synthetic `ImportPlan`: the trigger is run-shaped, the message
  would read as a run summary rather than a test, and the caller could not express "test".
- A separate test HTTP implementation: duplicates the credential and redaction logic the
  `import-notification` capability requires.

### Map the shared `skipped` outcome to `unconfigured` at the endpoint

`sendTestNotification` returns the shared vocabulary `{ status: 'sent' | 'skipped' | 'failed' }`;
for the test, `skipped` can only mean the credentials are absent, because the fixed summary always
exists. The endpoint maps it to `unconfigured`, mirroring the sync endpoint's UI vocabulary and
letting the screen state "not configured" distinctly from a failed send. A failed send keeps the
redaction-safe reason in the answer.

### Fixed test message

A fixed title and body that identify themselves as a test of the notification configuration, e.g.
title "Pushover test" and message "This is a test message from the transaction analyser." They are
distinguishable from a run summary and carry no counts, no transaction detail, and no credential.
Exact prose is a minor detail; tests assert the identifying content and the absences rather than
the exact wording.

### Screen control follows the existing action-row pattern

A `testing` ref with a re-entrancy guard, a button disabled while the request is in flight with
its label swapped while pending, and an inline `role="status"` paragraph, all beside the existing
controls. Test hooks: `test-notification-button` and `test-notification-status`. Message mapping:
sent → the message was sent; `unconfigured` → Pushover is not configured on the server; `failed`
→ the test failed, naming the reason; transport error → the test could not be sent. The log is not
refreshed, because the test writes no run.

### Spec deltas confined to `import-notification` and `backend-shell`

The screen control is defined in `import-notification`, as the re-categorise control was defined in
`category-recategorisation` without touching `import-log`; the import log's own requirement stays
true and gains no new claim. `frontend-shell` needs no delta for the same precedent: the test
derives nothing from transactions, writes no stored data, and reaches the server only through a
same-origin request.

### Testing

- Unit (`tests/unit/import-notification.test.ts`): `sendTestNotification` with a stub `fetchImpl` —
  success on a 2xx whose JSON `status` is 1; a refusal whose reason carries Pushover's `errors`; a
  thrown fetch; a hanging fetch that ends by the bound; and unconfigured config, where no request
  is attempted.
- Integration (a new `tests/integration/*-api.test.ts` following `easybank-sync-api.test.ts`):
  spawn the built server with `PUSHOVER_*` pointed at the fake Pushover; a POST to
  `/api/imports/test-notification` answers `sent` and the fake records exactly one POST to
  `/1/messages.json` carrying the token, user, and test text; an unconfigured spawn answers
  `unconfigured` with no request recorded; an error-mode fake answers `failed` with a reason that
  names no credential; no `import_runs` row is created by any call.
- Component (`tests/components/imports.test.ts`): clicking the control POSTs to the endpoint; the
  control is disabled while the request is deferred; each outcome renders its message; a rejected
  request renders the generic failure message.
- Browser (`tests/browser/`): optionally extend the existing imports interception test to cover
  the new button with its `data-testid`.

## Risks / Trade-offs

- [A shown failure reason could disclose something unexpected] → the reason is built only from the
  error message and Pushover's `errors` list; the credentials travel only in the request body,
  which is never returned or logged. A unit test asserts no token appears in the reason.
- [A slow Pushover holds the screen's request] → the same 10-second bound the real notification
  uses; the request ends by its bound and the screen answers with the failure.
- [The endpoint could be used to send messages repeatedly] → the application admits every
  requester by design (`backend-shell` recognises no user); the send is manual, bounded, and one
  message per request, consistent with the shell's posture.
- [A passing test does not prove every notification will be sent] → accepted; the test verifies
  the delivery configuration, while trigger behaviour stays covered by the existing
  `import-notification` tests.

## Migration Plan

No migration and no new configuration: the endpoint deploys with the application and reads the
same environment variables the notification already documents in the README. Rollback is a revert
of the image; stored data and the sync path are untouched either way.
