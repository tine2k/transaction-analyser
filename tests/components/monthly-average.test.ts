import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  formatEuroAmount,
  getLastCalendarMonths,
  getLocalDateString,
  type CategorySpendingTransaction,
} from '../../app/utils/category-spending';

const mocks = vi.hoisted(() => ({ useFetch: vi.fn() }));

mockNuxtImport('useFetch', () => mocks.useFetch);

import MonthlyAverage from '../../app/pages/monthly-average.vue';

function response(
  transactions: CategorySpendingTransaction[] | null,
  { pending = false, error = null }: { pending?: boolean; error?: unknown } = {},
) {
  return { data: ref(transactions), error: ref(error), pending: ref(pending) };
}

const today = getLocalDateString(new Date());
const monthWindow = getLastCalendarMonths(today, 13);
const [currentMonth, previousMonth] = monthWindow;
const thirteenthMonth = monthWindow[12];
if (currentMonth === undefined || previousMonth === undefined || thirteenthMonth === undefined) {
  throw new Error('expected at least thirteen calendar month buckets');
}

function sampleTransactions(): CategorySpendingTransaction[] {
  return [
    { bookingDate: currentMonth.startDate, amount: '-12.00', category: { id: '1', name: 'Groceries', hidden: false } },
    { bookingDate: previousMonth.startDate, amount: '-12.00', category: { id: '1', name: 'Groceries', hidden: false } },
    { bookingDate: thirteenthMonth.startDate, amount: '-120.00', category: { id: '1', name: 'Groceries', hidden: false } },
    { bookingDate: currentMonth.startDate, amount: '-2.00', category: null },
  ];
}

describe('monthly category average page', () => {
  beforeEach(() => {
    mocks.useFetch.mockReset();
  });

  it('loads transactions once and shows the default twelve-month averages', async () => {
    mocks.useFetch.mockReturnValue(response(sampleTransactions()));

    const wrapper = await mountSuspended(MonthlyAverage);

    expect(mocks.useFetch).toHaveBeenCalledTimes(1);
    expect(mocks.useFetch.mock.calls[0]?.[0]).toBe('/api/transactions');
    expect((wrapper.get('[data-testid="month-count-input"]').element as HTMLInputElement).value).toBe('12');
    expect(wrapper.get('[data-testid="applied-window"]').text()).toContain('12');

    expect(wrapper.findAll('[data-testid="category-average"]').map((item) => [
      item.attributes('data-category-key'),
      item.find('[data-testid="category-average-amount"]').text(),
    ])).toEqual([
      ['category:1', formatEuroAmount('2.00')],
      ['uncategorised', formatEuroAmount('0.17')],
    ]);
  });

  it('recomputes the averages from the fetched data when the window changes', async () => {
    mocks.useFetch.mockReturnValue(response(sampleTransactions()));

    const wrapper = await mountSuspended(MonthlyAverage);
    await wrapper.get('[data-testid="month-count-input"]').setValue('13');

    expect(wrapper.get('[data-testid="applied-window"]').text()).toContain('13');
    expect(wrapper.findAll('[data-testid="category-average"]').map((item) => [
      item.attributes('data-category-key'),
      item.find('[data-testid="category-average-amount"]').text(),
    ])).toEqual([
      ['category:1', formatEuroAmount('11.08')],
      ['uncategorised', formatEuroAmount('0.15')],
    ]);
    expect(mocks.useFetch).toHaveBeenCalledTimes(1);
  });

  it('sorts averages by amount or category in either direction with stable ties', async () => {
    mocks.useFetch.mockReturnValue(response([
      { bookingDate: currentMonth.startDate, amount: '-240.00', category: { id: '3', name: 'Zebra', hidden: false } },
      { bookingDate: currentMonth.startDate, amount: '-24.00', category: { id: '4', name: 'Alpha', hidden: false } },
      { bookingDate: currentMonth.startDate, amount: '-24.00', category: { id: '2', name: 'alpha', hidden: false } },
      { bookingDate: currentMonth.startDate, amount: '-36.00', category: null },
    ]));

    const wrapper = await mountSuspended(MonthlyAverage);
    const keys = () => wrapper.findAll('[data-testid="category-average"]')
      .map((item) => item.attributes('data-category-key'));
    const amountSort = wrapper.get('[data-testid="monthly-average-sort-column"]');
    const directionSort = wrapper.get('[data-testid="monthly-average-sort-direction"]');

    expect((amountSort.element as HTMLSelectElement).value).toBe('amount');
    expect((directionSort.element as HTMLSelectElement).value).toBe('desc');
    expect(keys()).toEqual(['category:3', 'uncategorised', 'category:2', 'category:4']);

    await directionSort.setValue('asc');
    expect(keys()).toEqual(['category:2', 'category:4', 'uncategorised', 'category:3']);

    await directionSort.setValue('desc');
    expect(keys()).toEqual(['category:3', 'uncategorised', 'category:2', 'category:4']);

    await amountSort.setValue('category');
    await directionSort.setValue('asc');
    expect(keys()).toEqual(['category:2', 'category:4', 'category:3', 'uncategorised']);

    await directionSort.setValue('desc');
    expect(keys()).toEqual(['category:3', 'category:2', 'category:4', 'uncategorised']);
    expect(mocks.useFetch).toHaveBeenCalledTimes(1);
  });

  it('keeps the last valid window when the control is emptied or given an invalid value', async () => {
    mocks.useFetch.mockReturnValue(response(sampleTransactions()));

    const wrapper = await mountSuspended(MonthlyAverage);
    const control = wrapper.get('[data-testid="month-count-input"]');
    await control.setValue('13');
    const amountAfterChange = wrapper.get('[data-testid="category-average-amount"]').text();

    await control.setValue('0');
    expect(wrapper.get('[data-testid="applied-window"]').text()).toContain('13');
    expect(wrapper.get('[data-testid="category-average-amount"]').text()).toBe(amountAfterChange);

    await control.setValue('');
    expect(wrapper.get('[data-testid="applied-window"]').text()).toContain('13');
    expect(wrapper.get('[data-testid="category-average-amount"]').text()).toBe(amountAfterChange);
    expect(mocks.useFetch).toHaveBeenCalledTimes(1);
  });

  it('excludes a hidden category from the averages while leaving visible categories unchanged', async () => {
    mocks.useFetch.mockReturnValue(response([
      { bookingDate: currentMonth.startDate, amount: '-12.00', category: { id: '1', name: 'Groceries', hidden: false } },
      { bookingDate: currentMonth.startDate, amount: '-120.00', category: { id: '9', name: 'Internal', hidden: true } },
      { bookingDate: currentMonth.startDate, amount: '-2.00', category: null },
    ]));

    const wrapper = await mountSuspended(MonthlyAverage);

    expect(wrapper.findAll('[data-testid="category-average"]').map((item) => [
      item.attributes('data-category-key'),
      item.find('[data-testid="category-average-amount"]').text(),
    ])).toEqual([
      ['category:1', formatEuroAmount('1.00')],
      ['uncategorised', formatEuroAmount('0.17')],
    ]);
    expect(wrapper.text()).not.toContain('Internal');
    expect(mocks.useFetch).toHaveBeenCalledTimes(1);
  });

  it('distinguishes loading, failed, and empty transaction results', async () => {
    mocks.useFetch.mockReturnValue(response(null, { pending: true }));
    const loading = await mountSuspended(MonthlyAverage);
    expect(loading.text()).toContain('Loading monthly category averages');
    expect(loading.find('[data-testid="monthly-average-list"]').exists()).toBe(false);

    mocks.useFetch.mockReturnValue(response([
      { bookingDate: currentMonth.startDate, amount: '-12.00', category: { id: '1', name: 'Stale', hidden: false } },
    ], { error: new Error('failed') }));
    const failed = await mountSuspended(MonthlyAverage);
    expect(failed.text()).toContain('Monthly category averages could not be loaded');
    expect(failed.text()).not.toContain('Stale');

    mocks.useFetch.mockReturnValue(response([
      { bookingDate: '2000-01-01', amount: '-12.00', category: { id: '1', name: 'Old', hidden: false } },
    ]));
    const empty = await mountSuspended(MonthlyAverage);
    expect(empty.findAll('[data-testid="category-average"]')).toHaveLength(0);
    expect(empty.get('[data-testid="no-data"]').text()).toBe('No category data for these months.');
  });
});
