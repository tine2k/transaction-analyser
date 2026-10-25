import { expect, test, type Page } from '@playwright/test';

// The summary line beneath the page title carries the visible count first and
// the visible-row sum second, both at the interface size. The API is intercepted,
// so the checks exercise the rendered hierarchy and its zero state.
//
// See openspec/changes/redesign-transactions-screen/specs/transaction-table/spec.md

const currentYear = new Date().getFullYear();

const categories = [
  { id: '1', name: 'Groceries', patterns: [], hidden: false, windows: [] },
];

const transactions = [
  {
    id: '1',
    bookingDate: `${currentYear}-02-10`,
    valueDate: `${currentYear}-02-10`,
    amount: '-12.50',
    purpose: 'Uncategorised purchase',
    counterpartyName: 'Shop',
    counterpartyAccount: null,
    person: { id: '1', name: 'Default' },
    categoryAssignment: 'automatic',
    category: null,
  },
  {
    id: '2',
    bookingDate: `${currentYear}-02-11`,
    valueDate: `${currentYear}-02-11`,
    amount: '4.00',
    purpose: 'Second uncategorised purchase',
    counterpartyName: 'Market',
    counterpartyAccount: null,
    person: { id: '1', name: 'Default' },
    categoryAssignment: 'automatic',
    category: null,
  },
  {
    id: '3',
    bookingDate: `${currentYear}-02-12`,
    valueDate: `${currentYear}-02-12`,
    amount: '-1.00',
    purpose: 'Categorised purchase',
    counterpartyName: 'Rail',
    counterpartyAccount: null,
    person: { id: '1', name: 'Default' },
    categoryAssignment: 'automatic',
    category: { id: '1', name: 'Groceries', hidden: false },
  },
];

async function interceptApi(page: Page): Promise<void> {
  await page.route('**/api/**', async (route) => {
    const { pathname } = new URL(route.request().url());

    if (pathname === '/api/transactions') {
      await route.fulfill({ json: transactions });
      return;
    }

    if (pathname === '/api/categories') {
      await route.fulfill({ json: categories });
      return;
    }

    await route.fulfill({ status: 404, json: { message: 'No test fixture for this endpoint' } });
  });
}

async function readSummary(page: Page) {
  return page.getByTestId('visible-total').evaluate((summaryElement) => {
    const countElement = summaryElement.querySelector('[data-testid="visible-count"]') as HTMLElement;
    const sumElement = summaryElement.querySelector('.tabular-nums') as HTMLElement;
    const countStyle = window.getComputedStyle(countElement);
    const sumStyle = window.getComputedStyle(sumElement);

    return {
      countFontSize: Number.parseFloat(countStyle.fontSize),
      sumFontSize: Number.parseFloat(sumStyle.fontSize),
      countColor: countStyle.color,
      sumColor: sumStyle.color,
      countBeforeSum: Boolean(
        countElement.compareDocumentPosition(sumElement) & Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    };
  });
}

test('the summary sits beneath the title with the count before the sum', async ({ page }) => {
  await interceptApi(page);
  await page.goto('/', { waitUntil: 'networkidle' });

  const summary = page.getByTestId('visible-total');
  const count = page.getByTestId('visible-count');

  await expect(count).toHaveText('2 transactions');
  await expect(summary).toContainText('Sum of displayed transactions:');

  const order = await page.evaluate(() => {
    const heading = document.querySelector('h1');
    const summaryElement = document.querySelector('[data-testid="visible-total"]');
    const filters = document.querySelector('[data-testid="transaction-search"]');
    if (heading === null || summaryElement === null || filters === null) {
      return { headingBeforeSummary: false, summaryBeforeFilters: false };
    }
    return {
      headingBeforeSummary: Boolean(
        heading.compareDocumentPosition(summaryElement) & Node.DOCUMENT_POSITION_FOLLOWING,
      ),
      summaryBeforeFilters: Boolean(
        summaryElement.compareDocumentPosition(filters) & Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    };
  });
  expect(order.headingBeforeSummary).toBe(true);
  expect(order.summaryBeforeFilters).toBe(true);

  const hierarchy = await readSummary(page);
  expect(hierarchy.countFontSize).toBe(14);
  expect(hierarchy.sumFontSize).toBe(14);
  expect(hierarchy.countColor).toBe('rgb(32, 30, 62)');
  expect(hierarchy.sumColor).toBe('rgb(95, 92, 120)');
  expect(hierarchy.countBeforeSum).toBe(true);
});

test('the summary keeps the interface size at every viewport', async ({ page }) => {
  await interceptApi(page);

  for (const viewport of [
    { width: 375, height: 800 },
    { width: 1280, height: 800 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/', { waitUntil: 'networkidle' });

    const { countFontSize, sumFontSize } = await readSummary(page);
    expect(countFontSize).toBe(14);
    expect(sumFontSize).toBe(14);
  }
});

test('a zero-match search keeps the zero count and euro zero on the summary line', async ({ page }) => {
  await interceptApi(page);
  await page.goto('/', { waitUntil: 'networkidle' });

  await page.getByTestId('transaction-search').fill('zzz');
  await page.getByTestId('search-submit').click();

  const summary = page.getByTestId('visible-total');
  await expect(page.getByTestId('visible-count')).toHaveText('0 transactions');
  await expect(summary.locator('.tabular-nums')).toContainText(/€\s*0|0\s*€/);
  await expect(page.getByText(/There are no transactions matching/)).toBeVisible();
});
