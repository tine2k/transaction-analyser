import { expect, test, type Page } from '@playwright/test';

// The Monthly and Yearly tables sit 16px below the preceding surface at every
// width. The scroll hint lives inside that same block, so hiding it at lg does
// not remove the gap.
//
// See openspec/changes/unify-surface-elevation-and-euro-formatting/tasks.md 2.

const today = new Date();
const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
const bookingDate = `${currentMonth}-01`;

const transactions = [
  {
    id: '1',
    bookingDate,
    valueDate: bookingDate,
    amount: '-10.00',
    purpose: 'Current month shop',
    counterpartyName: 'REWE',
    counterpartyAccount: null,
    person: { id: '1', name: 'Default' },
    category: { id: '1', name: 'Groceries', hidden: false, expenseType: 'recurring' },
  },
  {
    id: '2',
    bookingDate: '2025-01-02',
    valueDate: '2025-01-02',
    amount: '-20.00',
    purpose: 'Previous year shop',
    counterpartyName: 'REWE',
    counterpartyAccount: null,
    person: { id: '1', name: 'Default' },
    category: { id: '1', name: 'Groceries', hidden: false, expenseType: 'recurring' },
  },
];

async function interceptTransactions(page: Page): Promise<void> {
  await page.route('**/api/transactions', async (route) => {
    await route.fulfill({ json: transactions });
  });
}

const screens = [
  {
    path: '/monthly',
    section: 'monthly-table-section',
    hint: 'Scroll horizontally to view every column.',
    region: 'Monthly category table',
  },
  {
    path: '/yearly?year=2025',
    section: 'yearly-table-section',
    hint: 'Scroll horizontally to view every month.',
    region: 'Yearly category matrix',
  },
] as const;

test.describe('analysis table top gap', () => {
  test('keeps 16px above the table and hides the hint at desktop width', async ({ page }) => {
    await interceptTransactions(page);

    for (const screen of screens) {
      await page.goto(screen.path, { waitUntil: 'networkidle' });

      const section = page.getByTestId(screen.section);
      await expect(section).toBeVisible();
      expect(await section.evaluate((element) => window.getComputedStyle(element).marginTop))
        .toBe('16px');
      await expect(page.getByText(screen.hint)).toBeHidden();
      await expect(page.getByRole('region', { name: screen.region })).toBeVisible();
    }
  });

  test('keeps 16px above the table and shows the hint at phone width', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await interceptTransactions(page);

    for (const screen of screens) {
      await page.goto(screen.path, { waitUntil: 'networkidle' });

      const section = page.getByTestId(screen.section);
      await expect(section).toBeVisible();
      expect(await section.evaluate((element) => window.getComputedStyle(element).marginTop))
        .toBe('16px');
      await expect(page.getByText(screen.hint)).toBeVisible();
      await expect(page.getByRole('region', { name: screen.region })).toBeVisible();
    }
  });
});
