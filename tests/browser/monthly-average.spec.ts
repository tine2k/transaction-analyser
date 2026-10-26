import { expect, test, type Page } from '@playwright/test';
import { contrastRatio } from './contrast';

// The Monthly average trend and share bars are category indicators, so each
// fill must clear 3:1 against the surface it is drawn on. The fills are solid:
// the mockup's reduced opacity would lighten the teal below that floor.
//
// See openspec/changes/redesign-monthly-average-screen/specs/monthly-category-average/spec.md
// and design.md D6-D7.

const today = new Date();
const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
const bookingDate = `${currentMonth}-01`;

const transactions = [
  {
    id: '1',
    bookingDate,
    valueDate: bookingDate,
    amount: '-100.00',
    purpose: 'Supermarket',
    counterpartyName: 'REWE',
    counterpartyAccount: null,
    person: { id: '1', name: 'Default' },
    category: { id: '1', name: 'Groceries', hidden: false, expenseType: 'recurring' },
  },
  {
    id: '2',
    bookingDate,
    valueDate: bookingDate,
    amount: '-50.00',
    purpose: 'Rail ticket',
    counterpartyName: 'Rail',
    counterpartyAccount: null,
    person: { id: '1', name: 'Default' },
    category: { id: '2', name: 'Transport', hidden: false, expenseType: 'one-time' },
  },
  {
    id: '3',
    bookingDate,
    valueDate: bookingDate,
    amount: '-10.00',
    purpose: 'Local shop',
    counterpartyName: 'Shop',
    counterpartyAccount: null,
    person: { id: '1', name: 'Default' },
    category: null,
  },
];

async function interceptTransactions(page: Page): Promise<void> {
  await page.route('**/api/transactions', async (route) => {
    await route.fulfill({ json: transactions });
  });
}

test('the trend and share bars are solid category colours above 3:1', async ({ page }) => {
  await interceptTransactions(page);
  await page.goto('/monthly-average', { waitUntil: 'networkidle' });

  await expect(page.getByTestId('trend-bar').first()).toBeVisible();
  await expect(page.getByTestId('average-bar').first()).toBeVisible();

  const bars = page.locator('[data-testid="trend-bar"], [data-testid="average-bar"]');
  const fills = await bars.evaluateAll((elements) => elements.map((element) => {
    const style = window.getComputedStyle(element);
    return { backgroundColor: style.backgroundColor, opacity: style.opacity };
  }));

  expect(fills.length).toBeGreaterThan(0);
  for (const fill of fills) {
    expect(fill.opacity, 'category fills should be solid').toBe('1');
    expect(contrastRatio(fill.backgroundColor, 'rgb(255, 255, 255)'))
      .toBeGreaterThanOrEqual(3);
  }

  const dots = await page.locator('[data-testid="category-color"]').evaluateAll((elements) => {
    const table = document.querySelector('[data-testid="monthly-average-table"]') as HTMLElement;
    const surface = window.getComputedStyle(table).backgroundColor;
    return elements.map((element) => ({
      colour: window.getComputedStyle(element).backgroundColor,
      surface,
    }));
  });
  expect(dots.length).toBeGreaterThan(0);
  for (const dot of dots) {
    expect(contrastRatio(dot.colour, dot.surface)).toBeGreaterThanOrEqual(3);
  }
});
