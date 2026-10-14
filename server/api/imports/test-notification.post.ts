// The notification-test endpoint. It sends one fixed test message through the
// same Pushover request path, environment credentials, and time bound the
// import notification uses, so an operator can verify the configuration from
// the imports screen without starting a sync. It starts no import and writes
// nothing. A refused send is the answer, not an HTTP failure — only being
// unable to answer at all is one.
//
// See openspec/changes/add-pushover-test-button/specs/import-notification/spec.md
// and openspec/changes/add-pushover-test-button/specs/backend-shell/spec.md
import { notificationConfigFromEnv, sendTestNotification } from '../../../shared/import-notification';

export default defineEventHandler(async () => {
  const outcome = await sendTestNotification(notificationConfigFromEnv(process.env));

  if (outcome.status === 'skipped') {
    return { status: 'unconfigured' };
  }

  if (outcome.status === 'failed') {
    return { status: 'failed', reason: outcome.reason };
  }

  return { status: 'sent' };
});
