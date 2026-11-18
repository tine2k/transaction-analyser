import { expect, test, type Page } from '@playwright/test';
import { contrastRatio } from './contrast';

// The transaction amount direction colours: spending reads red, income green,
// and zero stays ink, on both the desktop table and the phone cards. The amount
// text itself is never reformatted, so the sign remains the primary indication.
//
// See openspec/changes/colour-transaction-amounts/specs/transaction-table/spec.md

const currentYear = new Date().getFullYear();

const categories = [
  { id: '1', name: 'Groceries', patterns: ['market'], hidden: false, windows: [] },
];

const transactions = [
  {
    id: 'negative',
    bookingDate: `${currentYear}-02-10`,
    valueDate: `${currentYear}-02-10`,
    amount: '-12.50',
    purpose: 'Weekly shop',
    counterpartyName: 'Market',
    counterpartyAccount: 'AT001',
    person: { id: '1', name: 'Default' },
    categoryAssignment: 'automatic',
    category: { id: '1', name: 'Groceries', hidden: false },
  },
  {
    id: 'positive',
    bookingDate: `${currentYear}-02-11`,
    valueDate: `${currentYear}-02-11`,
    amount: '250.00',
    purpose: 'Salary',
    counterpartyName: 'Employer',
    counterpartyAccount: null,
    person: { id: '1', name: 'Default' },
    categoryAssignment: 'automatic',
    category: { id: '1', name: 'Groceries', hidden: false },
  },
  {
    id: 'zero',
    bookingDate: `${currentYear}-02-12`,
    valueDate: `${currentYear}-02-12`,
    amount: '0.00',
    purpose: 'Refund offset',
    counterpartyName: 'Shop',
    counterpartyAccount: null,
    person: { id: '1', name: 'Default' },
    categoryAssignment: 'automatic',
    category: { id: '1', name: 'Groceries', hidden: false },
  },
];

const NEGATIVE_COLOR = 'rgb(138, 20, 40)';
const POSITIVE_COLOR = 'rgb(11, 81, 50)';
const INK_COLOR = 'rgb(32, 30, 62)';
const MUTED_COLOR = 'rgb(95, 92, 120)';
const SURFACE_COLOR = 'rgb(255, 255, 255)';

async function interceptApi(page: Page): Promise<void> {
  await page.route('**/api/**', async (route) => {
    const { pathname } = new URL(route.request().url());
    const method = route.request().method();

    if (pathname === '/api/transactions' && method === 'GET') {
      await route.fulfill({ json: transactions });
      return;
    }

    if (pathname === '/api/categories' && method === 'GET') {
      await route.fulfill({ json: categories });
      return;
    }

    if (pathname === '/api/people' && method === 'GET') {
      await route.fulfill({ json: [] });
      return;
    }

    await route.fulfill({ status: 404, json: { message: 'No test fixture for this endpoint' } });
  });
}

async function openWithAllCategories(page: Page): Promise<void> {
  await interceptApi(page);
  await page.goto('/?category=all', { waitUntil: 'networkidle' });
  await expect(page.getByTestId('visible-count')).toHaveText('3 transactions');
}

test.describe('transaction amount colours', () => {
  test('colours the desktop table amounts and keeps the rest of the row ink', async ({ page }) => {
    await page.setViewportSize({ width: 1720, height: 1200 });
    await openWithAllCategories(page);

    const style = (selector: string) =>
      page.locator(selector).evaluate((element) => window.getComputedStyle(element).color);

    const negativeCell = '[data-transaction-id="negative"] td:last-child';
    const positiveCell = '[data-transaction-id="positive"] td:last-child';
    const zeroCell = '[data-transaction-id="zero"] td:last-child';

    await expect(page.locator(negativeCell)).toHaveText('-12.50');
    await expect(page.locator(positiveCell)).toHaveText('250.00');
    await expect(page.locator(zeroCell)).toHaveText('0.00');

    const negative = await style(negativeCell);
    const positive = await style(positiveCell);
    const zero = await style(zeroCell);

    expect(negative).toBe(NEGATIVE_COLOR);
    expect(positive).toBe(POSITIVE_COLOR);
    expect(zero).toBe(INK_COLOR);
    expect(negative).not.toBe(positive);

    expect(contrastRatio(negative, SURFACE_COLOR)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(positive, SURFACE_COLOR)).toBeGreaterThanOrEqual(4.5);

    // The direction colour belongs to the amount only. The booking date, the
    // purpose, and the summary's derived sum keep their own colours.
    expect(await style('[data-transaction-id="negative"] td:nth-child(2)')).toBe(INK_COLOR);
    expect(await style('[data-transaction-id="negative"] td:nth-child(4)')).toBe(INK_COLOR);
    expect(await style('[data-testid="visible-total"] .tabular-nums')).toBe(MUTED_COLOR);
  });

  test('colours the phone card amounts by the same rule', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await interceptApi(page);
    await page.goto('/?category=all', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('transaction-card')).toHaveCount(3);

    const amountOf = (id: string) =>
      page.locator(`[data-transaction-id="${id}"] [data-transaction-field="amount"]`);

    await expect(amountOf('negative')).toHaveText('-12.50');
    await expect(amountOf('positive')).toHaveText('250.00');
    await expect(amountOf('zero')).toHaveText('0.00');

    const colorOf = (id: string) =>
      amountOf(id).evaluate((element) => window.getComputedStyle(element).color);

    expect(await colorOf('negative')).toBe(NEGATIVE_COLOR);
    expect(await colorOf('positive')).toBe(POSITIVE_COLOR);
    expect(await colorOf('zero')).toBe(INK_COLOR);
  });
});
