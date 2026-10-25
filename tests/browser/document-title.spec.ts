import { expect, test, type Page } from '@playwright/test';

// The tab names the screen shown, then the application. The menu labels and the tab
// names come from one list in the layout, so a route added there is named in the tab.
// See openspec/changes/add-application-icon-and-name/specs/frontend-shell/spec.md

const screens = [
  { path: '/', title: 'Transactions · Expenses' },
  { path: '/categories', title: 'Categories · Expenses' },
  { path: '/people', title: 'People · Expenses' },
  { path: '/analytics', title: 'Analytics · Expenses' },
  { path: '/monthly-totals', title: 'Monthly totals · Expenses' },
  { path: '/monthly-average', title: 'Monthly average · Expenses' },
  { path: '/imports', title: 'Imports · Expenses' },
];

async function interceptApi(page: Page): Promise<void> {
  await page.route('**/api/**', async (route) => {
    const { pathname } = new URL(route.request().url());

    if (pathname === '/api/transactions' || pathname === '/api/categories' || pathname === '/api/imports' || pathname === '/api/people') {
      await route.fulfill({ json: [] });
      return;
    }

    await route.fulfill({ status: 404, json: { message: 'No test fixture for this endpoint' } });
  });
}

for (const screen of screens) {
  test(`${screen.path} is named in the tab`, async ({ page }) => {
    await interceptApi(page);
    await page.goto(screen.path, { waitUntil: 'networkidle' });

    await expect(page).toHaveTitle(screen.title);
    // The application name appears once, as a suffix rather than repeated.
    expect((await page.title()).match(/Expenses/g)).toHaveLength(1);
  });
}

test('following a navigation link renames the tab without a reload', async ({ page }) => {
  await interceptApi(page);
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page).toHaveTitle('Transactions · Expenses');

  // A marker the page keeps only while it is the same document.
  await page.evaluate(() => {
    (window as unknown as { stillTheSameDocument: boolean }).stillTheSameDocument = true;
  });

  await page.getByRole('navigation', { name: 'Screens' }).getByRole('link', { name: 'Imports' }).click();

  await expect(page).toHaveTitle('Imports · Expenses');
  expect(await page.evaluate(() => (window as unknown as { stillTheSameDocument?: boolean }).stillTheSameDocument))
    .toBe(true);
});

test('a path no route matches shows the application name alone', async ({ page }) => {
  await interceptApi(page);
  await page.goto('/route-that-does-not-exist', { waitUntil: 'networkidle' });

  await expect(page.getByRole('heading', { name: 'This page does not exist' })).toBeVisible();
  await expect(page).toHaveTitle('Expenses');
});

test('the masthead names the application', async ({ page }) => {
  await interceptApi(page);
  await page.goto('/', { waitUntil: 'networkidle' });

  await expect(page.getByRole('banner').getByText('Expenses', { exact: true })).toBeVisible();
  await expect(page.getByRole('banner')).not.toContainText('Transaction Analyser');
});

test('every route uses the display family inside the bounded frame without external font requests', async ({ page }) => {
  await page.setViewportSize({ width: 1720, height: 1200 });
  const externalFonts: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'font' && new URL(request.url()).origin !== 'http://127.0.0.1:3000') {
      externalFonts.push(request.url());
    }
  });
  await interceptApi(page);

  for (const screen of screens) {
    await page.goto(screen.path, { waitUntil: 'networkidle' });
    const metrics = await page.evaluate(() => {
      const heading = document.querySelector('h1') as HTMLElement;
      const main = document.querySelector('main') as HTMLElement;
      const rect = main.getBoundingClientRect();
      return {
        bodyFamily: window.getComputedStyle(document.body).fontFamily,
        headingFamily: window.getComputedStyle(heading).fontFamily,
        headingWeight: window.getComputedStyle(heading).fontWeight,
        mainWidth: rect.width,
        mainX: rect.x,
        noOverflow: document.documentElement.scrollWidth <= window.innerWidth,
      };
    });

    expect(metrics.bodyFamily, screen.path).toContain('Plus Jakarta Sans');
    expect(metrics.headingFamily, screen.path).toContain('Plus Jakarta Sans');
    expect(metrics.headingWeight, screen.path).toBe('800');
    expect(metrics.mainWidth, screen.path).toBeLessThanOrEqual(1280);
    expect(metrics.mainX, screen.path).toBeGreaterThan(0);
    expect(metrics.noOverflow, screen.path).toBe(true);
  }

  expect(externalFonts).toEqual([]);
});
