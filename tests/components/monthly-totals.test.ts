import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  formatEuroAmount,
  type CategorySpendingTransaction,
} from '../../app/utils/category-spending';

const mocks = vi.hoisted(() => ({ useFetch: vi.fn() }));

mockNuxtImport('useFetch', () => mocks.useFetch);

import MonthlyTotals from '../../app/pages/monthly-totals.vue';

function response(
  transactions: CategorySpendingTransaction[] | null,
  { pending = false, error = null }: { pending?: boolean; error?: unknown } = {},
) {
  return { data: ref(transactions), error: ref(error), pending: ref(pending) };
}

describe('monthly category totals page', () => {
  beforeEach(() => {
    mocks.useFetch.mockReset();
  });

  it('loads transactions once and renders all represented months with blank zero cells', async () => {
    mocks.useFetch.mockReturnValue(response([
      { bookingDate: '2026-09-02', amount: '-12.50', category: { id: '1', name: 'Groceries', hidden: false } },
      { bookingDate: '2026-09-03', amount: '4.00', category: { id: '1', name: 'Groceries', hidden: false } },
      { bookingDate: '2026-09-04', amount: '-3.25', category: null },
      { bookingDate: '2026-09-05', amount: '1234567.89', category: { id: '3', name: 'Rent', hidden: false } },
      { bookingDate: '2026-09-06', amount: '0.00', category: { id: '4', name: 'Zero-only', hidden: false } },
      { bookingDate: '2026-08-12', amount: '-2.00', category: { id: '2', name: 'Transport', hidden: false } },
      { bookingDate: '2020-01-15', amount: '-5.00', category: { id: '1', name: 'Groceries', hidden: false } },
    ]));

    const wrapper = await mountSuspended(MonthlyTotals);

    expect(mocks.useFetch).toHaveBeenCalledTimes(1);
    expect(mocks.useFetch.mock.calls[0]?.[0]).toBe('/api/transactions');
    expect(wrapper.findAll('[data-testid="category-heading"]').map((heading) => [
      heading.text(), heading.attributes('data-category-key'),
    ])).toEqual([
      ['Groceries', 'category:1'],
      ['Rent', 'category:3'],
      ['Transport', 'category:2'],
      ['Zero-only', 'category:4'],
      ['Uncategorised', 'uncategorised'],
    ]);

    const rows = wrapper.findAll('[data-testid="month-row"]');
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.attributes('data-month-key'))).toEqual([
      '2026-09', '2026-08', '2020-01',
    ]);
    expect(rows[0]?.findAll('[data-testid="category-total-cell"]').map((cell) => cell.text()))
      .toEqual([
        formatEuroAmount('16.50'),
        formatEuroAmount('1234567.89'),
        '',
        '',
        formatEuroAmount('3.25'),
      ]);
    expect(rows[1]?.findAll('[data-testid="category-total-cell"]').map((cell) => cell.text()))
      .toEqual([
        '',
        '',
        formatEuroAmount('2.00'),
        '',
        '',
      ]);
    expect(rows[2]?.findAll('[data-testid="category-total-cell"]').map((cell) => cell.text()))
      .toEqual([formatEuroAmount('5.00'), '', '', '', '']);
    expect(rows.every((row) => row.findAll('[data-testid="category-total-cell"]').length === 5))
      .toBe(true);

    const region = wrapper.get('[data-testid="monthly-totals-scroll"]');
    expect(region.attributes('role')).toBe('region');
    expect(region.attributes('aria-label')).toBe('Monthly category totals table');
    expect(region.attributes('tabindex')).toBe('0');
    expect(region.classes()).toContain('overflow-x-auto');
    expect(wrapper.get('[data-testid="monthly-totals-table"]').classes()).toContain('w-max');
  });

  it('links populated cells to their month and category and leaves blank cells inert', async () => {
    mocks.useFetch.mockReturnValue(response([
      { bookingDate: '2026-09-02', amount: '-12.50', category: { id: '1', name: 'Groceries', hidden: false } },
      { bookingDate: '2026-09-03', amount: '4.00', category: { id: '1', name: 'Groceries', hidden: false } },
      { bookingDate: '2026-09-04', amount: '-3.25', category: null },
      { bookingDate: '2026-09-05', amount: '1234567.89', category: { id: '3', name: 'Rent', hidden: false } },
      { bookingDate: '2026-09-06', amount: '0.00', category: { id: '4', name: 'Zero-only', hidden: false } },
      { bookingDate: '2026-08-12', amount: '-2.00', category: { id: '2', name: 'Transport', hidden: false } },
      { bookingDate: '2020-01-15', amount: '-5.00', category: { id: '1', name: 'Groceries', hidden: false } },
    ]));

    const wrapper = await mountSuspended(MonthlyTotals);
    const rows = wrapper.findAll('[data-testid="month-row"]');

    const targets = rows.map((row) => row.findAll('[data-testid="category-total-link"]').map((link) => {
      const url = new URL(link.attributes('href'), 'http://localhost');
      return [url.pathname, url.searchParams.get('month'), url.searchParams.get('category')];
    }));
    expect(targets).toEqual([
      [['/', '2026-09', '1'], ['/', '2026-09', '3'], ['/', '2026-09', 'uncategorised']],
      [['/', '2026-08', '2']],
      [['/', '2020-01', '1']],
    ]);

    const allCells = rows.flatMap((row) => row.findAll('[data-testid="category-total-cell"]'));
    const populatedCells = allCells.filter((cell) => cell.text() !== '');
    const blankCells = allCells.filter((cell) => cell.text() === '');
    expect(populatedCells).toHaveLength(5);
    expect(populatedCells.every((cell) => cell.findAll('[data-testid="category-total-link"]').length === 1))
      .toBe(true);
    expect(blankCells.length).toBeGreaterThan(0);
    expect(blankCells.every((cell) => cell.find('[data-testid="category-total-link"]').exists() === false))
      .toBe(true);

    const linked = populatedCells[0]?.find('[data-testid="category-total-link"]');
    expect(linked?.classes()).toContain('hover:bg-slate-200');
    expect(linked?.classes()).toContain('transition-colors');
    expect(blankCells.every((cell) => cell.classes().every((name) => !name.startsWith('hover:')))).toBe(true);
    expect(mocks.useFetch).toHaveBeenCalledTimes(1);
  });

  it('excludes a hidden category from the table while leaving other cells unchanged', async () => {
    mocks.useFetch.mockReturnValue(response([
      { bookingDate: '2026-09-02', amount: '-12.50', category: { id: '1', name: 'Groceries', hidden: false } },
      { bookingDate: '2026-09-03', amount: '-99.00', category: { id: '9', name: 'Internal', hidden: true } },
    ]));

    const wrapper = await mountSuspended(MonthlyTotals);

    expect(wrapper.findAll('[data-testid="category-heading"]').map((heading) => heading.text()))
      .toEqual(['Groceries']);
    expect(wrapper.text()).not.toContain('Internal');
    expect(wrapper.findAll('[data-testid="month-row"]')).toHaveLength(1);
    expect(wrapper.find('[data-testid="category-total-cell"]').text()).toBe(formatEuroAmount('12.50'));
    expect(mocks.useFetch).toHaveBeenCalledTimes(1);
  });

  it('distinguishes loading, failed, and empty transaction results', async () => {
    mocks.useFetch.mockReturnValue(response(null, { pending: true }));
    const loading = await mountSuspended(MonthlyTotals);
    expect(loading.text()).toContain('Loading monthly category totals');
    expect(loading.find('[data-testid="monthly-totals-table"]').exists()).toBe(false);

    mocks.useFetch.mockReturnValue(response([
      { bookingDate: '2026-09-28', amount: '-12.50', category: { id: '1', name: 'Stale', hidden: false } },
    ], { error: new Error('failed') }));
    const failed = await mountSuspended(MonthlyTotals);
    expect(failed.text()).toContain('Monthly category totals could not be loaded');
    expect(failed.text()).not.toContain('Stale');

    mocks.useFetch.mockReturnValue(response([]));
    const empty = await mountSuspended(MonthlyTotals);
    expect(empty.findAll('[data-testid="month-row"]')).toHaveLength(0);
    expect(empty.findAll('[data-testid="category-heading"]')).toHaveLength(0);
    expect(empty.findAll('[data-testid="category-total-cell"]')).toHaveLength(0);
    expect(empty.text()).toContain('No category data for these months.');
  });
});
