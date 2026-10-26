import { expect, test, type Page } from '@playwright/test';

// The manage hub: a read-only directory of People, Categories, and Imports with
// each screen's current state. The API is intercepted, so the checks exercise
// the hub's own rendering and links rather than a live backend.
//
// See openspec/changes/reorganise-navigation/specs/manage-hub/spec.md

const people = [
  { id: '1', name: 'Default', transactionCount: 4 },
  { id: '2', name: 'Anna', transactionCount: 0 },
];

const categories = [
  { id: '1', name: 'Groceries', patterns: ['market'], hidden: false, windows: [] },
  { id: '2', name: 'Transport', patterns: ['transit'], hidden: false, windows: [] },
];

const successRun = {
  id: '2',
  startedAt: '2026-10-26T06:00:00Z',
  finishedAt: '2026-10-26T06:00:05Z',
  source: 'scheduled',
  person: { id: '1', name: 'Default' },
  nonWriting: false,
  outcome: 'success',
  rowsRead: 3,
  rowsAlreadyStored: 0,
  rowsWritten: 3,
  rowsCategorised: 2,
  error: null,
};

const failedRun = {
  ...successRun,
  id: '1',
  startedAt: '2026-10-25T06:00:00Z',
  outcome: 'failed',
  rowsWritten: 0,
  rowsCategorised: 0,
  error: 'The bank export could not be read.',
};

type Fixtures = {
  people?: unknown[];
  categories?: unknown[];
  runs?: unknown[];
  failPeople?: boolean;
};

async function interceptApi(page: Page, fixtures: Fixtures = {}): Promise<void> {
  await page.route('**/api/**', async (route) => {
    const { pathname } = new URL(route.request().url());

    if (pathname === '/api/people') {
      if (fixtures.failPeople === true) {
        await route.fulfill({ status: 500, json: { message: 'unavailable' } });
        return;
      }
      await route.fulfill({ json: fixtures.people ?? people });
      return;
    }

    if (pathname === '/api/categories') {
      await route.fulfill({ json: fixtures.categories ?? categories });
      return;
    }

    if (pathname === '/api/imports') {
      await route.fulfill({ json: fixtures.runs ?? [successRun, failedRun] });
      return;
    }

    await route.fulfill({ status: 404, json: { message: 'No test fixture for this endpoint' } });
  });
}

test.describe('manage hub', () => {
  test('shows the three management rows with their state and links', async ({ page }) => {
    await interceptApi(page);
    await page.goto('/manage', { waitUntil: 'networkidle' });

    await expect(page.getByRole('heading', { level: 1, name: 'Manage' })).toBeVisible();

    await expect(page.getByTestId('manage-link-people')).toHaveAttribute('href', '/people');
    await expect(page.getByTestId('manage-link-categories')).toHaveAttribute('href', '/categories');
    await expect(page.getByTestId('manage-link-imports')).toHaveAttribute('href', '/imports');

    await expect(page.getByTestId('manage-status-people')).toHaveText('2 people');
    await expect(page.getByTestId('manage-status-categories')).toHaveText('2 categories');
    await expect(page.getByTestId('manage-status-imports'))
      .toHaveText('Last run: Success · 2026-10-26 06:00:00 UTC');

    await expect(page.getByTestId('manage-sheet').locator('form, button')).toHaveCount(0);
  });

  test('marks a failed latest run and keeps the log link', async ({ page }) => {
    await interceptApi(page, {
      runs: [{ ...failedRun, id: '3', startedAt: '2026-10-26T06:00:00Z' }],
    });
    await page.goto('/manage', { waitUntil: 'networkidle' });

    const status = page.getByTestId('manage-status-imports');
    await expect(status).toContainText('Failed');
    const color = await status.evaluate((element) => window.getComputedStyle(element).color);
    expect(color).toBe('rgb(166, 58, 46)');
    await expect(page.getByTestId('manage-link-imports')).toHaveAttribute('href', '/imports');
  });

  test('keeps a failed read unknown without hiding the other rows', async ({ page }) => {
    await interceptApi(page, { failPeople: true });
    await page.goto('/manage', { waitUntil: 'networkidle' });

    await expect(page.getByTestId('manage-status-people')).toHaveText('Status unavailable');
    await expect(page.getByTestId('manage-status-categories')).toHaveText('2 categories');
    await expect(page.getByTestId('manage-status-imports')).toContainText('Success');
  });

  test('follows the Categories entry to the category screen', async ({ page }) => {
    await interceptApi(page);
    await page.goto('/manage', { waitUntil: 'networkidle' });

    await page.getByTestId('manage-link-categories').click();
    await expect(page).toHaveURL(/\/categories$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Categories' })).toBeVisible();
  });

  test.describe('at 320 CSS pixels', () => {
    test.use({ viewport: { width: 320, height: 640 } });

    test('stacks the entries with touch-sized links and no page overflow', async ({ page }) => {
      await interceptApi(page);
      await page.goto('/manage', { waitUntil: 'networkidle' });

      const links = page.locator('[data-testid^="manage-link-"]');
      await expect(links).toHaveCount(3);

      const measurements = await links.evaluateAll((elements) => ({
        heights: elements.map((element) => element.getBoundingClientRect().height),
        scrollX: window.scrollX,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      }));

      expect(measurements.heights.every((height) => height >= 44)).toBe(true);
      expect(measurements.scrollX).toBe(0);
      expect(measurements.documentWidth).toBeLessThanOrEqual(measurements.viewportWidth);

      await expect(page.getByTestId('manage-status-people')).toBeVisible();
      await expect(page.getByTestId('manage-status-categories')).toBeVisible();
      await expect(page.getByTestId('manage-status-imports')).toBeVisible();
    });
  });
});
