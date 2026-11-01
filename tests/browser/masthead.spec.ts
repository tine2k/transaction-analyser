import { expect, test, type Page } from '@playwright/test';

// The masthead is pinned at the top of the viewport at every supported width.
// These checks scroll a long screen in headless Chromium and measure the bar
// against the content that passes beneath it.

const longCategories = Array.from({ length: 30 }, (_, index) => ({
  id: String(index + 1),
  name: `Category ${String(index + 1).padStart(2, '0')}`,
  patterns: [`category-${index + 1}`],
  hidden: false,
  windows: [],
}));

const today = new Date().toISOString().slice(0, 10);

const transactions = longCategories.slice(0, 12).map((category, index) => ({
  id: String(index + 1),
  bookingDate: today,
  valueDate: today,
  amount: `-${(index + 1) * 10}.00`,
  purpose: `A longer purpose description for ${category.name}`,
  counterpartyName: `Merchant ${index + 1}`,
  counterpartyAccount: `DE000000000000000${index + 1}`,
  person: { id: '1', name: 'Default' },
  categoryAssignment: 'automatic',
  category: { id: category.id, name: category.name, hidden: false },
}));

async function interceptApi(page: Page): Promise<void> {
  await page.route('**/api/**', async (route) => {
    const { pathname } = new URL(route.request().url());

    if (pathname === '/api/transactions' && route.request().method() === 'GET') {
      await route.fulfill({ json: transactions });
      return;
    }

    if (pathname === '/api/categories' && route.request().method() === 'GET') {
      await route.fulfill({ json: longCategories });
      return;
    }

    await route.fulfill({ status: 404, json: { message: 'No test fixture for this endpoint' } });
  });
}

type HeaderMetrics = {
  top: number;
  bottom: number;
  wordmarkVisible: boolean;
  mainTop: number;
  scrollY: number;
  scrollWidth: number;
  viewportWidth: number;
};

async function headerMetrics(page: Page): Promise<HeaderMetrics> {
  return page.evaluate(() => {
    const header = document.querySelector('header') as HTMLElement;
    const wordmark = header.querySelector('p') as HTMLElement;
    const main = document.querySelector('main') as HTMLElement;
    const headerBox = header.getBoundingClientRect();
    const wordmarkBox = wordmark.getBoundingClientRect();

    return {
      top: headerBox.top,
      bottom: headerBox.bottom,
      wordmarkVisible:
        wordmarkBox.top >= 0
        && wordmarkBox.bottom <= window.innerHeight
        && wordmarkBox.width > 0
        && wordmarkBox.height > 0,
      mainTop: main.getBoundingClientRect().top,
      scrollY: window.scrollY,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
]) {
  test.describe(`${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport });

    test('the masthead stays pinned on a long screen and keeps its destinations visible', async ({ page }) => {
      await interceptApi(page);
      await page.goto('/categories', { waitUntil: 'networkidle' });
      await expect(page.getByRole('heading', { name: 'Categories' })).toBeVisible();

      await page.evaluate(() => window.scrollTo(0, 900));
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

      // On a phone the destinations sit behind the disclosure control; open the
      // panel so they can be checked in the pinned bar.
      if (viewport.width < 768) {
        await page.getByTestId('mobile-navigation-toggle').click();
        await expect(page.getByTestId('mobile-navigation-toggle')).toHaveAttribute('aria-expanded', 'true');
      }

      const metrics = await headerMetrics(page);
      expect(metrics.top, 'the pinned bar sits against the top edge').toBe(0);
      expect(metrics.wordmarkVisible, 'the wordmark stays visible').toBe(true);
      expect(metrics.mainTop, 'page content has moved up beneath the bar').toBeLessThan(0);
      expect(metrics.scrollWidth, 'no page-level horizontal overflow').toBeLessThanOrEqual(metrics.viewportWidth);

      const links = page.locator('#screen-navigation a');
      await expect(links).toHaveCount(5);
      for (const link of await links.all()) {
        await expect(link).toBeVisible();
      }
    });
  });
}

test.describe('stacking', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('a table scrolling beneath the pinned bar never paints over it', async ({ page }) => {
    await interceptApi(page);
    await page.goto('/categories', { waitUntil: 'networkidle' });

    const table = page.getByTestId('categories-scroll');
    await expect(table).toBeVisible();

    const tableTop = await table.evaluate(
      (element) => element.getBoundingClientRect().top + window.scrollY,
    );
    await page.evaluate((top) => window.scrollTo(0, top - 20), tableTop);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

    const stacking = await page.evaluate(() => {
      const header = document.querySelector('header') as HTMLElement;
      const region = document.querySelector('[data-testid="categories-scroll"]') as HTMLElement;
      const headerBox = header.getBoundingClientRect();
      const regionBox = region.getBoundingClientRect();
      const samples = [0.1, 0.5, 0.9].map((fraction) => {
        const x = headerBox.left + headerBox.width * fraction;
        const y = headerBox.top + headerBox.height / 2;
        const hit = document.elementFromPoint(x, y);
        return hit !== null && header.contains(hit);
      });

      return {
        headerBottom: headerBox.bottom,
        regionTop: regionBox.top,
        headerHitBySamples: samples,
      };
    });

    expect(stacking.regionTop, 'the table has scrolled into the bar\'s band').toBeLessThan(stacking.headerBottom);
    expect(stacking.headerHitBySamples).toEqual([true, true, true]);
  });

  test('the transactions fixed bottom bars stay below the pinned masthead', async ({ page }) => {
    await interceptApi(page);
    await page.goto('/?category=all', { waitUntil: 'networkidle' });
    await page.getByTestId('row-select').first().check();

    const bar = page.getByTestId('bulk-assignment-bar');
    await expect(bar).toBeVisible();

    const metrics = await page.evaluate(() => {
      const header = document.querySelector('header') as HTMLElement;
      const barElement = document.querySelector('[data-testid="bulk-assignment-bar"]') as HTMLElement;
      const container = barElement.parentElement as HTMLElement;
      const headerBox = header.getBoundingClientRect();
      const barBox = barElement.getBoundingClientRect();

      return {
        headerTop: headerBox.top,
        headerBottom: headerBox.bottom,
        barTop: barBox.top,
        headerZ: Number(window.getComputedStyle(header).zIndex),
        barZ: Number(window.getComputedStyle(container).zIndex),
      };
    });

    expect(metrics.headerTop).toBe(0);
    expect(metrics.barTop, 'the bottom bar starts below the masthead').toBeGreaterThanOrEqual(metrics.headerBottom);
    expect(metrics.headerZ, 'the masthead stacks above the bottom bar').toBeGreaterThan(metrics.barZ);
  });
});

test.describe('short viewport', () => {
  test.use({ viewport: { width: 640, height: 320 } });

  test('the expanded panel scrolls internally and keeps every destination reachable', async ({ page }) => {
    await interceptApi(page);
    await page.goto('/categories', { waitUntil: 'networkidle' });

    const toggle = page.getByTestId('mobile-navigation-toggle');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    const nav = page.locator('#screen-navigation');
    const panel = await nav.evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      overflowY: window.getComputedStyle(element).overflowY,
      scrollY: window.scrollY,
    }));

    expect(panel.overflowY, 'the panel owns its own scrolling').toBe('auto');
    expect(panel.scrollHeight, 'the panel is taller than the space it is given').toBeGreaterThan(panel.clientHeight);

    const links = page.locator('#screen-navigation a');
    await expect(links).toHaveCount(5);
    for (const link of await links.all()) {
      await link.scrollIntoViewIfNeeded();
      await expect(link).toBeVisible();
      await expect(link).toBeInViewport();
    }

    const after = await page.evaluate(() => {
      const header = document.querySelector('header') as HTMLElement;
      const navigation = document.querySelector('#screen-navigation') as HTMLElement;
      return {
        headerTop: header.getBoundingClientRect().top,
        pageScrollY: window.scrollY,
        panelScrolled: navigation.scrollTop > 0,
      };
    });

    expect(after.headerTop, 'the masthead stays pinned while the panel scrolls').toBe(0);
    expect(after.pageScrollY).toBe(panel.scrollY);
    expect(after.panelScrolled, 'reaching the last link scrolls the panel, not the page').toBe(true);
  });
});

test.describe('keyboard focus', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('a control scrolled almost out of view clears the masthead when focused', async ({ page }) => {
    await interceptApi(page);
    await page.goto('/categories', { waitUntil: 'networkidle' });

    const nameInput = page.getByLabel('Name');
    await expect(nameInput).toBeVisible();

    // Put the first control of the form under the pinned bar.
    const nameTop = await nameInput.evaluate(
      (element) => element.getBoundingClientRect().top + window.scrollY,
    );
    await page.evaluate((top) => window.scrollTo(0, top - 10), nameTop);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

    // Keyboard only: the disclosure control is the first stop, the name field the next.
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const focused = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      const header = document.querySelector('header') as HTMLElement;
      if (active === null) {
        return null;
      }

      const box = active.getBoundingClientRect();
      return {
        tag: active.tagName,
        label: active.getAttribute('aria-label') ?? active.getAttribute('name') ?? '',
        top: box.top,
        bottom: box.bottom,
        headerBottom: header.getBoundingClientRect().bottom,
      };
    });

    expect(focused).not.toBeNull();
    expect(focused!.tag).toBe('INPUT');
    expect(focused!.top, 'the focused field sits below the pinned bar').toBeGreaterThanOrEqual(focused!.headerBottom);
    expect(focused!.bottom).toBeGreaterThan(0);
  });
});
