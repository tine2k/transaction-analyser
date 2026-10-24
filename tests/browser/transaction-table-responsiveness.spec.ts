import { expect, test, type Page } from '@playwright/test';

// Scroll-triggered presentation in headless Chromium against the built
// application. The read endpoint is intercepted, so a view large enough to need
// several batches can be observed without a database: the partial table, the
// batch appended only as the reader approaches the end, a view change while the
// table is partway through, and select-all covering rows that have not been
// presented yet.
//
// See openspec/changes/lazy-load-transaction-rows/specs/transaction-table/spec.md

const currentYear = new Date().getFullYear();
const FIRST_BATCH_ROWS = 50;
const NEXT_BATCH_ROWS = 250;

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
    person: { id: '1', name: 'Default' },
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

async function rowCount(page: Page): Promise<number> {
  return page.locator('tbody tr').count();
}

async function scrollToEnd(page: Page): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
}

// Scroll until every matching row is present, recording each new row count.
// Observed against the 1,000-row fixture: 50 -> 300 -> 550 -> 800 -> 1000, one
// NEXT_BATCH_ROWS step at a time. The constants are tuning values; keep the
// observations here when adjusting them.
async function scrollUntilComplete(page: Page, total: number): Promise<number[]> {
  const counts = [await rowCount(page)];
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (counts[counts.length - 1] === total) {
      return counts;
    }
    await scrollToEnd(page);
    await expect.poll(() => rowCount(page), { timeout: 5000 }).toBeGreaterThan(
      counts[counts.length - 1],
    );
    const next = await rowCount(page);
    if (next !== counts[counts.length - 1]) {
      counts.push(next);
    }
  }
  throw new Error(`the table did not reach ${total} rows`);
}

test('a large view stays partial until the reader approaches the end', async ({ page }) => {
  await interceptApi(page, transactions(1000));

  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('tbody tr')).toHaveCount(FIRST_BATCH_ROWS);
  expect(FIRST_BATCH_ROWS).toBeLessThan(1000);
  expect(NEXT_BATCH_ROWS).toBeGreaterThan(0);

  // Without scrolling, no further batch is built.
  await page.waitForTimeout(500);
  await expect(page.locator('tbody tr')).toHaveCount(FIRST_BATCH_ROWS);

  const counts = await scrollUntilComplete(page, 1000);
  expect(counts[0]).toBe(FIRST_BATCH_ROWS);
  expect(counts.some((count) => count > FIRST_BATCH_ROWS && count < 1000)).toBe(true);
  expect(counts[counts.length - 1]).toBe(1000);
});

test('select-all covers rows a later batch has not presented yet', async ({ page }) => {
  await interceptApi(page, transactions(5000));

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('tbody tr')).toHaveCount(FIRST_BATCH_ROWS);

  await page.getByTestId('select-all-visible').click();

  await expect(page.getByTestId('bulk-assignment-count')).toHaveText('5000 transactions selected');
  await expect(page.getByTestId('select-all-visible')).toBeChecked();
  await expect(page.locator('tbody tr')).toHaveCount(FIRST_BATCH_ROWS);
});

test('a filter change starts the new view from its own first batch', async ({ page }) => {
  await interceptApi(page, transactions(5000));

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('tbody tr')).toHaveCount(FIRST_BATCH_ROWS);

  await scrollToEnd(page);
  await expect.poll(() => rowCount(page), { timeout: 5000 }).toBeGreaterThan(FIRST_BATCH_ROWS);

  await page.getByTestId('category-filter').selectOption('3');
  await expect(page.locator('tbody tr')).toHaveCount(FIRST_BATCH_ROWS);

  const counts = await scrollUntilComplete(page, 500);
  expect(counts[0]).toBe(FIRST_BATCH_ROWS);

  const rowsOutsideTheView = await page.evaluate(() =>
    [...document.querySelectorAll('tbody tr')].filter(
      (row) => (row.querySelector('select') as HTMLSelectElement | null)?.value !== '3',
    ).length);
  expect(rowsOutsideTheView).toBe(0);
});
