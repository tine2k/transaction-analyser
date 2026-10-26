import { expect, test, type Page } from '@playwright/test';

// One representative content surface on every route carries the resting sheet
// shadow at both a phone and a desktop width. The API is intercepted, so the
// check exercises the rendered surfaces rather than live data.
//
// See openspec/changes/unify-surface-elevation-and-euro-formatting/specs/frontend-shell/spec.md
// and tasks.md 5.1.

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

const categories = [
  { id: '1', name: 'Groceries', patterns: ['food'], hidden: false, windows: [], expenseType: 'recurring' },
];

const people = [
  { id: '1', name: 'Default', transactionCount: 2 },
];

const importRuns = [
  {
    id: '1',
    startedAt: '2026-10-06T03:00:00Z',
    finishedAt: '2026-10-06T03:00:05Z',
    source: 'scheduled',
    person: { id: '1', name: 'Default' },
    nonWriting: false,
    outcome: 'success',
    rowsRead: 2,
    rowsAlreadyStored: 0,
    rowsWritten: 2,
    rowsCategorised: 0,
    error: null,
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
    if (pathname === '/api/people') {
      await route.fulfill({ json: people });
      return;
    }
    if (pathname === '/api/imports') {
      await route.fulfill({ json: importRuns });
      return;
    }
    if (pathname.startsWith('/api/categories/')) {
      await route.fulfill({ json: { count: 0 } });
      return;
    }

    await route.fulfill({ status: 404, json: { message: 'No test fixture for this endpoint' } });
  });
}

const routes = [
  { path: '/', surface: 'filter-sheet' },
  { path: '/categories', surface: 'categories-scroll' },
  { path: '/people', surface: 'people-scroll' },
  { path: '/monthly', surface: 'monthly-summary-card' },
  { path: '/yearly', surface: 'yearly-summary-card' },
  { path: '/monthly-average', surface: 'monthly-average-table' },
  { path: '/imports', surface: 'imports-scroll' },
] as const;

async function expectRestingShadowOnEveryRoute(page: Page): Promise<void> {
  await interceptApi(page);

  for (const route of routes) {
    await page.goto(route.path, { waitUntil: 'networkidle' });

    const surface = page.getByTestId(route.surface).first();
    await expect(surface, `${route.path} should show its surface`).toBeVisible();

    const shadow = await surface.evaluate((element) => window.getComputedStyle(element).boxShadow);
    expect(shadow, `${route.path} should carry the resting shadow`)
      .toContain('rgba(40, 30, 120, 0.08)');
  }
}

test('every route rests its content surface at desktop width', async ({ page }) => {
  await expectRestingShadowOnEveryRoute(page);
});

test('every route rests its content surface at phone width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expectRestingShadowOnEveryRoute(page);
});
