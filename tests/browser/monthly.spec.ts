import { expect, test, type Page } from '@playwright/test';
import { contrastRatio } from './contrast';

// The Monthly screen replaced the Analytics screen. The old path redirects, and
// the selected month lives in the query so a month can be linked to directly.
//
// See openspec/changes/replace-analytics-with-monthly-screen/specs/category-spending-chart/spec.md
// and design.md D2 and D3.

const anna = { id: '2', name: 'Anna' };

const transactions = [
  {
    id: '1',
    bookingDate: '2025-03-05',
    valueDate: '2025-03-05',
    amount: '-10.00',
    purpose: 'March shop',
    counterpartyName: 'Shop',
    counterpartyAccount: null,
    person: anna,
    category: { id: '7', name: 'Groceries', hidden: false, expenseType: null },
  },
  {
    id: '2',
    bookingDate: '2025-04-05',
    valueDate: '2025-04-05',
    amount: '-20.00',
    purpose: 'April rent',
    counterpartyName: 'Landlord',
    counterpartyAccount: null,
    person: anna,
    category: { id: '8', name: 'Rent', hidden: false, expenseType: null },
  },
  {
    id: '3',
    bookingDate: '2024-04-05',
    valueDate: '2024-04-05',
    amount: '-30.00',
    purpose: 'Previous year',
    counterpartyName: 'Shop',
    counterpartyAccount: null,
    person: anna,
    category: { id: '9', name: 'Travel', hidden: false, expenseType: null },
  },
];

const manyCategories = Array.from({ length: 10 }, (_, index) => ({
  id: `many-${index}`,
  bookingDate: '2025-03-05',
  valueDate: '2025-03-05',
  amount: `-${10 - index}.00`,
  purpose: `March shop ${index}`,
  counterpartyName: 'Shop',
  counterpartyAccount: null,
  person: anna,
  category: { id: String(index + 1), name: `Category ${index + 1}`, hidden: false, expenseType: null },
}));

function categoryTransaction(categoryId: string, categoryName: string, amount: string) {
  return {
    id: `category-${categoryId}`,
    bookingDate: '2025-03-05',
    valueDate: '2025-03-05',
    amount,
    purpose: `March ${categoryName}`,
    counterpartyName: 'Shop',
    counterpartyAccount: null,
    person: anna,
    category: { id: categoryId, name: categoryName, hidden: false, expenseType: null },
  };
}

async function interceptTransactions(page: Page): Promise<void> {
  await page.route('**/api/transactions', async (route) => {
    await route.fulfill({ json: transactions });
  });
}

test('the former analytics path redirects to the Monthly screen', async ({ page }) => {
  await interceptTransactions(page);
  await page.goto('/analytics', { waitUntil: 'networkidle' });

  await expect(page).toHaveURL(/\/monthly$/);
  await expect(page.getByRole('heading', { name: 'Monthly' })).toBeVisible();
  await expect(page).toHaveTitle('Monthly · Expenses');
});

test('a month link selects that month, and changing month or year keeps the person', async ({ page }) => {
  await interceptTransactions(page);
  await page.goto('/monthly?month=2025-03&person=2', { waitUntil: 'networkidle' });

  await expect(page.locator('[data-testid="month-pill"][data-month-key="2025-03"]'))
    .toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('year-select')).toHaveValue('2025');
  await expect(page.getByTestId('category-row')).toHaveCount(1);
  await expect(page.getByTestId('category-row')).toContainText('Groceries');

  await page.locator('[data-testid="month-pill"][data-month-key="2025-04"]').click();
  await expect(page).toHaveURL(/month=2025-04/);
  await expect(page).toHaveURL(/person=2/);
  await expect(page.getByTestId('category-row')).toContainText('Rent');

  await page.getByTestId('year-select').selectOption('2024');
  await expect(page).toHaveURL(/month=2024-04/);
  await expect(page).toHaveURL(/person=2/);
  await expect(page.locator('[data-testid="month-pill"][data-month-key="2024-04"]'))
    .toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('category-row')).toContainText('Travel');
});

test('the Other segment and legend use the same visible neutral', async ({ page }) => {
  await page.route('**/api/transactions', async (route) => {
    await route.fulfill({ json: manyCategories });
  });
  await page.goto('/monthly?month=2025-03', { waitUntil: 'networkidle' });

  await expect(page.getByTestId('bar-legend-item').last()).toContainText('Other 2');

  const colors = await page.evaluate(() => {
    const segment = document.querySelector(
      '[data-testid="bar-segment"][data-category-key="other"]',
    ) as HTMLElement;
    const legendSwatch = document.querySelector(
      '[data-testid="bar-legend-item"]:last-child span[aria-hidden="true"]',
    ) as HTMLElement;
    const panel = document.querySelector('[data-testid="monthly-bar-panel"]') as HTMLElement;
    const categorySegments = Array.from(
      document.querySelectorAll('[data-testid="bar-segment"]:not([data-category-key="other"])'),
    ).map((element) => window.getComputedStyle(element).backgroundColor);

    return {
      segment: window.getComputedStyle(segment).backgroundColor,
      legend: window.getComputedStyle(legendSwatch).backgroundColor,
      surface: window.getComputedStyle(panel).backgroundColor,
      categorySegments,
    };
  });

  expect(colors.segment).toBe(colors.legend);
  expect(colors.categorySegments).not.toContain(colors.segment);
  expect(contrastRatio(colors.segment, colors.surface)).toBeGreaterThanOrEqual(3);
});

test('similar-sized top-eight categories with the same home colour are separated', async ({ page }) => {
  await page.route('**/api/transactions', async (route) => {
    await route.fulfill({
      json: [
        categoryTransaction('1', 'Groceries', '-100.00'),
        categoryTransaction('21', 'Household', '-105.00'),
      ],
    });
  });
  await page.goto('/monthly?month=2025-03', { waitUntil: 'networkidle' });

  const colors = await page.evaluate(() => {
    const background = (selector: string) => {
      const element = document.querySelector(selector) as HTMLElement | null;
      return element === null ? '' : window.getComputedStyle(element).backgroundColor;
    };
    const householdLegend = Array.from(
      document.querySelectorAll('[data-testid="bar-legend-item"]'),
    ).find((item) => item.textContent?.includes('Household'));

    return {
      groceriesSegment: background('[data-testid="bar-segment"][data-category-key="category:1"]'),
      householdSegment: background('[data-testid="bar-segment"][data-category-key="category:21"]'),
      householdLegend: householdLegend === undefined
        ? ''
        : window.getComputedStyle(
          householdLegend.querySelector('span[aria-hidden="true"]') as HTMLElement,
        ).backgroundColor,
      householdRow: background(
        '[data-testid="category-row"][data-category-key="category:21"] [data-testid="category-color"]',
      ),
    };
  });

  expect(colors.householdSegment).not.toBe(colors.groceriesSegment);
  expect(colors.householdLegend).toBe(colors.householdSegment);
  expect(colors.householdRow).toBe(colors.householdSegment);
});

test('a category outside the top eight keeps its home colour', async ({ page }) => {
  await page.route('**/api/transactions', async (route) => {
    await route.fulfill({
      json: [
        categoryTransaction('1', 'Groceries', '-100.00'),
        categoryTransaction('2', 'Rent', '-90.00'),
        categoryTransaction('3', 'Transport', '-80.00'),
        categoryTransaction('4', 'Utilities', '-70.00'),
        categoryTransaction('5', 'Internet', '-60.00'),
        categoryTransaction('6', 'Phone', '-50.00'),
        categoryTransaction('7', 'Insurance', '-40.00'),
        categoryTransaction('8', 'Health', '-30.00'),
        categoryTransaction('21', 'Household', '-1.00'),
      ],
    });
  });
  await page.goto('/monthly?month=2025-03', { waitUntil: 'networkidle' });

  const colors = await page.evaluate(() => {
    const background = (key: string) => {
      const element = document.querySelector(
        `[data-testid="category-row"][data-category-key="${key}"] [data-testid="category-color"]`,
      ) as HTMLElement | null;
      return element === null ? '' : window.getComputedStyle(element).backgroundColor;
    };

    return {
      topEight: background('category:1'),
      outside: background('category:21'),
      rows: document.querySelectorAll('[data-testid="category-row"]').length,
    };
  });

  expect(colors.rows).toBe(9);
  expect(colors.outside).toBe(colors.topEight);
});

test('every category bar mark, legend swatch, and table dot clears 3:1', async ({ page }) => {
  await page.route('**/api/transactions', async (route) => {
    await route.fulfill({ json: manyCategories });
  });
  await page.goto('/monthly?month=2025-03', { waitUntil: 'networkidle' });

  const marks = await page.evaluate(() => {
    const panel = document.querySelector('[data-testid="monthly-bar-panel"]') as HTMLElement;
    const table = document.querySelector('[data-testid="monthly-category-scroll"]') as HTMLElement;
    const panelSurface = window.getComputedStyle(panel).backgroundColor;
    const tableSurface = window.getComputedStyle(table).backgroundColor;
    const background = (element: Element | null) =>
      element === null ? '' : window.getComputedStyle(element).backgroundColor;

    return [
      ...Array.from(document.querySelectorAll('[data-testid="bar-segment"]')).map((element) => ({
        kind: 'bar segment',
        colour: background(element),
        surface: panelSurface,
      })),
      ...Array.from(
        document.querySelectorAll('[data-testid="bar-legend-item"] span[aria-hidden="true"]'),
      ).map((element) => ({
        kind: 'legend swatch',
        colour: background(element),
        surface: panelSurface,
      })),
      ...Array.from(document.querySelectorAll('[data-testid="category-color"]')).map((element) => ({
        kind: 'table dot',
        colour: background(element),
        surface: tableSurface,
      })),
    ];
  });

  expect(marks.length).toBeGreaterThan(0);
  for (const mark of marks) {
    expect(contrastRatio(mark.colour, mark.surface), mark.kind).toBeGreaterThanOrEqual(3);
  }
});

test('every category share bar meets the 3:1 contrast floor against its track', async ({ page }) => {
  await page.route('**/api/transactions', async (route) => {
    await route.fulfill({ json: manyCategories });
  });
  await page.goto('/monthly?month=2025-03', { waitUntil: 'networkidle' });

  const bars = await page.evaluate(() => Array.from(
    document.querySelectorAll('[data-testid="share-bar"]'),
  ).map((element) => ({
    fill: window.getComputedStyle(element).backgroundColor,
    track: window.getComputedStyle(element.parentElement as HTMLElement).backgroundColor,
  })));

  expect(bars).not.toHaveLength(0);
  for (const bar of bars) {
    expect(contrastRatio(bar.fill, bar.track)).toBeGreaterThanOrEqual(3);
  }
});
