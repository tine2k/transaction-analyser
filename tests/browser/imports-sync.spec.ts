import { expect, test } from '@playwright/test';

// The imports screen's action controls. The API is intercepted, so the checks
// exercise the screen's requests, status, and refresh rather than a live
// backend.
//
// See openspec/changes/add-easybank-sync-button/specs/easybank-sync/spec.md
// and openspec/changes/add-pushover-test-button/specs/import-notification/spec.md

const scheduledRun = {
  id: '1',
  startedAt: '2026-10-06T03:00:00Z',
  finishedAt: '2026-10-06T03:00:05Z',
  source: 'scheduled',
  nonWriting: true,
  outcome: 'success',
  rowsRead: 2,
  rowsAlreadyStored: 2,
  rowsWritten: 0,
  rowsCategorised: 0,
  error: null,
};

const uiRun = {
  id: '2',
  startedAt: '2026-10-06T09:00:00Z',
  finishedAt: '2026-10-06T09:00:02Z',
  source: 'ui',
  nonWriting: true,
  outcome: 'success',
  rowsRead: 2,
  rowsAlreadyStored: 0,
  rowsWritten: 0,
  rowsCategorised: 0,
  error: null,
};

test('the sync control starts a run and refreshes the log', async ({ page }) => {
  let logRequests = 0;
  let syncMethod: string | null = null;

  await page.route('**/api/imports', async (route) => {
    logRequests += 1;
    await route.fulfill({ json: logRequests === 1 ? [scheduledRun] : [uiRun, scheduledRun] });
  });
  await page.route('**/api/easybank/sync', async (route) => {
    syncMethod = route.request().method();
    await route.fulfill({ json: { status: 'success' } });
  });

  await page.goto('/imports');
  await expect(page.getByTestId('import-run')).toHaveCount(1);

  await page.getByTestId('sync-button').click();

  await expect(page.getByTestId('sync-status')).toContainText('The sync finished');
  await expect(page.getByTestId('import-run')).toHaveCount(2);
  await expect(page.getByTestId('import-run').first()).toContainText('Manual sync');
  expect(syncMethod).toBe('POST');
  expect(logRequests).toBeGreaterThanOrEqual(2);
});

test('the sync control reports a sync that is not configured', async ({ page }) => {
  await page.route('**/api/imports', async (route) => {
    await route.fulfill({ json: [scheduledRun] });
  });
  await page.route('**/api/easybank/sync', async (route) => {
    await route.fulfill({ json: { status: 'unconfigured' } });
  });

  await page.goto('/imports');
  await page.getByTestId('sync-button').click();

  await expect(page.getByTestId('sync-status')).toContainText('not configured');
  await expect(page.getByTestId('import-run')).toHaveCount(1);
});

test('the re-categorise control disables while it runs and shows the changed count', async ({ page }) => {
  let recategoriseMethod: string | null = null;
  let releaseRecategorise!: () => void;
  const pending = new Promise<void>((resolve) => {
    releaseRecategorise = resolve;
  });

  await page.route('**/api/imports', async (route) => {
    await route.fulfill({ json: [scheduledRun] });
  });
  await page.route('**/api/categories/recategorise', async (route) => {
    recategoriseMethod = route.request().method();
    await pending;
    await route.fulfill({ json: { changed: 2 } });
  });

  await page.goto('/imports');
  const button = page.getByTestId('recategorise-button');
  await button.click();

  await expect(button).toBeDisabled();
  await expect(button).toHaveText('Re-categorising…');

  releaseRecategorise();

  await expect(page.getByTestId('recategorise-status')).toContainText('2 transactions changed');
  await expect(button).toBeEnabled();
  expect(recategoriseMethod).toBe('POST');
});

test('the re-categorise control reports a failure rather than a zero count', async ({ page }) => {
  await page.route('**/api/imports', async (route) => {
    await route.fulfill({ json: [scheduledRun] });
  });
  await page.route('**/api/categories/recategorise', async (route) => {
    await route.fulfill({ status: 500, json: { message: 'the category request could not be completed' } });
  });

  await page.goto('/imports');
  await page.getByTestId('recategorise-button').click();

  await expect(page.getByTestId('recategorise-status')).toContainText('could not be completed');
  await expect(page.getByTestId('recategorise-status')).not.toContainText('0 transactions changed');
});

test('the notification-test control sends a POST and shows the sent message', async ({ page }) => {
  let testMethod: string | null = null;

  await page.route('**/api/imports', async (route) => {
    await route.fulfill({ json: [scheduledRun] });
  });
  await page.route('**/api/imports/test-notification', async (route) => {
    testMethod = route.request().method();
    await route.fulfill({ json: { status: 'sent' } });
  });

  await page.goto('/imports');
  await page.getByTestId('test-notification-button').click();

  await expect(page.getByTestId('test-notification-status')).toContainText('was sent');
  expect(testMethod).toBe('POST');
});

test('the notification-test control reports a refused send with its reason', async ({ page }) => {
  await page.route('**/api/imports', async (route) => {
    await route.fulfill({ json: [scheduledRun] });
  });
  await page.route('**/api/imports/test-notification', async (route) => {
    await route.fulfill({
      json: { status: 'failed', reason: 'Pushover answered 400: application token is invalid' },
    });
  });

  await page.goto('/imports');
  await page.getByTestId('test-notification-button').click();

  await expect(page.getByTestId('test-notification-status')).toContainText('The test failed');
  await expect(page.getByTestId('test-notification-status')).toContainText('application token is invalid');
});
