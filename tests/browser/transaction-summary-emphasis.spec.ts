import { expect, test, type Page } from '@playwright/test';

// Summary hierarchy on the transactions table. The API is intercepted, so the
// checks exercise the rendered emphasis: the visible count is the primary
// figure, the sum is secondary, and both stay tied to the visible rows.
//
// See openspec/changes/promote-transaction-count/specs/transaction-table/spec.md

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

test('the visible count leads the summary and the sum follows it', async ({ page }) => {
  await interceptApi(page);
  await page.goto('/', { waitUntil: 'networkidle' });

  const summary = page.getByTestId('visible-total');
  const count = page.getByTestId('visible-count');
  const sum = summary.locator('p').last();

  await expect(count).toHaveText('2 transactions');
  await expect(sum).toContainText('Sum of displayed transactions:');

  const hierarchy = await summary.evaluate((summaryElement) => {
    const countElement = summaryElement.querySelector('[data-testid="visible-count"]') as HTMLElement;
    const sumElement = summaryElement.querySelector('p:last-child') as HTMLElement;
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

  expect(hierarchy.countFontSize).toBeGreaterThan(hierarchy.sumFontSize);
  expect(hierarchy.countColor).toBe('rgb(32, 36, 43)');
  expect(hierarchy.sumColor).toBe('rgb(90, 96, 104)');
  expect(hierarchy.countBeforeSum).toBe(true);
});

test('a zero-match search keeps the zero count and euro zero', async ({ page }) => {
  await interceptApi(page);
  await page.goto('/', { waitUntil: 'networkidle' });

  await page.getByTestId('transaction-search').fill('zzz');
  await page.getByTestId('search-submit').click();

  const summary = page.getByTestId('visible-total');
  await expect(page.getByTestId('visible-count')).toHaveText('0 transactions');
  await expect(summary.locator('p').last()).toContainText(/€\s*0|0\s*€/);
  await expect(page.getByText(/There are no transactions matching/)).toBeVisible();
});
