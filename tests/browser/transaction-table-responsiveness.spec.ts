import { expect, test, type Page } from '@playwright/test';

// Progressive presentation in headless Chromium against the built application.
// The read endpoint is intercepted, so a view large enough to need several
// batches can be observed without a database: the partial table, the summary
// covering rows that have not been presented yet, a filter change while the
// fill is running, and a fill that has to finish without animation frames.
//
// See openspec/changes/improve-transaction-table-responsiveness/specs/transaction-table/spec.md

const currentYear = new Date().getFullYear();

const categories = Array.from({ length: 10 }, (_, index) => ({
  id: String(index + 1),
  name: `Category ${index + 1}`,
  patterns: [],
  hidden: false,
  windows: [],
}));

function transactions(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: String(index + 1),
    bookingDate: `${currentYear}-02-10`,
    valueDate: `${currentYear}-02-10`,
    amount: '-1.00',
    purpose: `Transaction ${index + 1}`,
    counterpartyName: 'Shop',
    counterpartyAccount: null,
    categoryAssignment: 'automatic',
    category: categories[index % categories.length],
  }));
}

async function interceptApi(page: Page, rows: unknown[]): Promise<void> {
  await page.route('**/api/**', async (route) => {
    const { pathname } = new URL(route.request().url());
    if (pathname === '/api/transactions') {
      return route.fulfill({ json: rows });
    }
    if (pathname === '/api/categories') {
      return route.fulfill({ json: categories });
    }
    return route.fulfill({ status: 404, json: { message: 'No test fixture for this endpoint' } });
  });
}

async function waitForPartialTable(page: Page, total: number): Promise<void> {
  await page.waitForFunction((complete) => {
    const shown = document.querySelectorAll('tbody tr').length;
    return shown > 0 && shown < complete;
  }, total, { polling: 'raf' });
}

test('presents a large view in batches before completing it', async ({ page }) => {
  await interceptApi(page, transactions(1000));
  await page.addInitScript(() => {
    const samples: number[] = [];
    (window as unknown as { rowCounts: number[] }).rowCounts = samples;
    const sample = () => {
      const count = document.querySelectorAll('tbody tr').length;
      if (samples[samples.length - 1] !== count) {
        samples.push(count);
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('tbody tr')).toHaveCount(1000);

  const samples = await page.evaluate(
    () => (window as unknown as { rowCounts: number[] }).rowCounts,
  );
  expect(samples.some((count) => count > 0 && count < 1000)).toBe(true);
  expect(samples[samples.length - 1]).toBe(1000);
  expect(samples.filter((count) => count === 1000)).toHaveLength(
    samples.length - samples.indexOf(1000),
  );
});

test('select-all covers rows a later batch has not presented yet', async ({ page }) => {
  await interceptApi(page, transactions(5000));

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForPartialTable(page, 5000);

  await page.getByTestId('select-all-visible').click();

  await expect(page.getByTestId('bulk-assignment-count')).toHaveText('5000 transactions selected');
  await expect(page.getByTestId('select-all-visible')).toBeChecked();
});

test('a filter change while filling settles on the new view', async ({ page }) => {
  await interceptApi(page, transactions(5000));

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForPartialTable(page, 5000);

  await page.getByTestId('category-filter').selectOption('3');

  await expect(page.locator('tbody tr')).toHaveCount(500);

  const rowsOutsideTheView = await page.evaluate(() =>
    [...document.querySelectorAll('tbody tr')].filter(
      (row) => (row.querySelector('select') as HTMLSelectElement | null)?.value !== '3',
    ).length);
  expect(rowsOutsideTheView).toBe(0);
});

test('finishes the fill while the document is hidden', async ({ page }) => {
  await interceptApi(page, transactions(1000));
  await page.addInitScript(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('tbody tr')).toHaveCount(1000);
});
