import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  formatEuroAmount,
  formatMonthRange,
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

const twelveMonthRange = formatMonthRange(
  [...getLastCalendarMonths(today, 12)].reverse(),
);

function sampleTransactions(): CategorySpendingTransaction[] {
  return [
    { bookingDate: currentMonth.startDate, amount: '-12.00', person: { id: '1', name: 'Default' }, category: { id: '1', name: 'Groceries', hidden: false, expenseType: null } },
    { bookingDate: previousMonth.startDate, amount: '-12.00', person: { id: '1', name: 'Default' }, category: { id: '1', name: 'Groceries', hidden: false, expenseType: null } },
    { bookingDate: thirteenthMonth.startDate, amount: '-120.00', person: { id: '1', name: 'Default' }, category: { id: '1', name: 'Groceries', hidden: false, expenseType: null } },
    { bookingDate: currentMonth.startDate, amount: '-2.00', person: { id: '1', name: 'Default' }, category: null },
  ];
}

function categoryRows(wrapper: Awaited<ReturnType<typeof mountSuspended>>) {
  return wrapper.findAll('[data-testid="category-average"]').map((item) => [
    item.attributes('data-category-key'),
    item.find('[data-testid="category-average-amount"]').text(),
  ]);
}

function summaryValues(wrapper: Awaited<ReturnType<typeof mountSuspended>>) {
  return wrapper.findAll('[data-testid="monthly-average-summary-value"]').map((item) => item.text());
}

function phoneMatchMedia() {
  return vi.fn(() => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

describe('monthly category average page', () => {
  beforeEach(() => {
    mocks.useFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('presents cards below the sm breakpoint with the exact values as text', async () => {
    vi.stubGlobal('matchMedia', phoneMatchMedia());
    mocks.useFetch.mockReturnValue(response(sampleTransactions()));

    const wrapper = await mountSuspended(MonthlyAverage);

    expect(wrapper.find('[data-testid="monthly-average-table"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="category-average"]').exists()).toBe(false);
    const cards = wrapper.findAll('[data-testid="category-average-card"]');
    expect(cards).toHaveLength(2);

    const groceries = cards.find((card) => card.attributes('data-category-key') === 'category:1');
    expect(groceries).toBeDefined();
    expect(groceries!.text()).toContain('Groceries');
    expect(groceries!.text()).toContain('Last 12 months');
    expect(groceries!.get('[data-testid="category-window-total"]').text()).toBe(formatEuroAmount('24.00'));
    expect(groceries!.get('[data-testid="category-average-amount"]').text()).toBe(formatEuroAmount('2.00'));
    expect(groceries!.findAll('[data-testid="trend-bar"]')).toHaveLength(12);
    expect(groceries!.get('[data-testid="category-trend"]').attributes('aria-hidden')).toBe('true');
    expect(groceries!.get('[data-testid="average-bar-cell"]').attributes('aria-hidden')).toBe('true');
    expect(wrapper.get('[data-testid="monthly-average-sort-statement"]').text())
      .toBe('Sorted by average amount, descending');
  });

  it('states and applies the phone sort beside the cards', async () => {
    vi.stubGlobal('matchMedia', phoneMatchMedia());
    mocks.useFetch.mockReturnValue(response([
      { bookingDate: currentMonth.startDate, amount: '-120.00', person: { id: '1', name: 'Default' }, category: { id: '3', name: 'Zebra', hidden: false, expenseType: null } },
      { bookingDate: currentMonth.startDate, amount: '-12.00', person: { id: '1', name: 'Default' }, category: { id: '4', name: 'Alpha', hidden: false, expenseType: null } },
    ]));

    const wrapper = await mountSuspended(MonthlyAverage);
    const cardNames = () => wrapper.findAll('[data-testid="category-average-card"]')
      .map((card) => card.get('h2').text());

    expect(cardNames()).toEqual(['Zebra', 'Alpha']);

    await wrapper.get('[data-testid="monthly-average-sort-column"]').setValue('category');
    expect(wrapper.get('[data-testid="monthly-average-sort-statement"]').text())
      .toBe('Sorted by category, descending');
    expect(cardNames()).toEqual(['Zebra', 'Alpha']);

    await wrapper.get('[data-testid="monthly-average-sort-direction"]').setValue('asc');
    expect(wrapper.get('[data-testid="monthly-average-sort-statement"]').text())
      .toBe('Sorted by category, ascending');
    expect(cardNames()).toEqual(['Alpha', 'Zebra']);
  });

  it('loads transactions once and shows the default twelve-month comparison table', async () => {
    mocks.useFetch.mockReturnValue(response(sampleTransactions()));

    const wrapper = await mountSuspended(MonthlyAverage);

    expect(mocks.useFetch).toHaveBeenCalledTimes(1);
    expect(mocks.useFetch.mock.calls[0]?.[0]).toBe('/api/transactions');
    expect((wrapper.get('[data-testid="month-count-input"]').element as HTMLInputElement).value).toBe('12');
    expect(wrapper.get('[data-testid="monthly-average-subtitle"]').text()).toContain('12 months');
    expect(wrapper.get('[data-testid="monthly-average-subtitle"]').text()).toContain(twelveMonthRange);

    expect(categoryRows(wrapper)).toEqual([
      ['category:1', formatEuroAmount('2.00')],
      ['uncategorised', formatEuroAmount('0.17')],
    ]);
    expect(summaryValues(wrapper)).toEqual([
      formatEuroAmount('2.17'),
      formatEuroAmount('0.00'),
      formatEuroAmount('0.00'),
    ]);

    expect(wrapper.get('[data-testid="category-average"]').findAll('[data-testid="trend-bar"]')).toHaveLength(12);
    expect(wrapper.get('[data-testid="category-average"]').find('[data-testid="category-window-total"]').text())
      .toBe(formatEuroAmount('24.00'));
    expect(wrapper.get('[data-testid="category-sort-header"]').text()).toContain('Category');
    expect(wrapper.get('[data-testid="amount-sort-header"]').text()).toContain('Avg / month');
    expect(wrapper.text()).toContain('Last 12 months');
    expect(wrapper.text()).toContain('12-month total');
    expect(wrapper.get('caption').text()).toContain('12 months');
  });

  it('keeps the home colour for two categories that share a family', async () => {
    mocks.useFetch.mockReturnValue(response([
      {
        bookingDate: currentMonth.startDate,
        amount: '-10.00',
        person: { id: '1', name: 'Default' },
        category: { id: '1', name: 'Groceries', hidden: false, expenseType: null },
      },
      {
        bookingDate: currentMonth.startDate,
        amount: '-5.00',
        person: { id: '1', name: 'Default' },
        category: { id: '21', name: 'Household', hidden: false, expenseType: null },
      },
    ]));

    const wrapper = await mountSuspended(MonthlyAverage);
    const groceries = wrapper.get(
      '[data-testid="category-average"][data-category-key="category:1"] [data-testid="category-color"]',
    ).attributes('style');
    const household = wrapper.get(
      '[data-testid="category-average"][data-category-key="category:21"] [data-testid="category-color"]',
    ).attributes('style');

    expect(household).toBe(groceries);
  });

  it('uses touch-sized controls and keeps long category names wrappable', async () => {
    mocks.useFetch.mockReturnValue(response([
      {
        bookingDate: currentMonth.startDate,
        amount: '-12.00',
        person: { id: '1', name: 'Default' },
        category: { id: '1', name: 'A category name that needs room to wrap on a narrow screen', hidden: false, expenseType: null },
      },
    ]));

    const wrapper = await mountSuspended(MonthlyAverage);

    expect(wrapper.get('[data-testid="month-count-input"]').classes()).toContain('min-h-11');
    expect(wrapper.get('[data-testid="person-filter"]').classes()).toContain('min-h-11');
    expect(wrapper.get('[data-testid="expense-type-filter"]').classes()).toContain('min-h-11');
    expect(wrapper.get('[data-testid="monthly-average-sort-column"]').classes()).toContain('min-h-11');
    expect(wrapper.get('[data-testid="monthly-average-sort-direction"]').classes()).toContain('min-h-11');
    expect(wrapper.get('[data-category-key="category:1"] th .break-words').exists()).toBe(true);
  });

  it('recomputes the table, trend, and figures when the window changes', async () => {
    mocks.useFetch.mockReturnValue(response(sampleTransactions()));

    const wrapper = await mountSuspended(MonthlyAverage);
    await wrapper.get('[data-testid="month-count-input"]').setValue('13');

    expect(wrapper.get('[data-testid="monthly-average-subtitle"]').text()).toContain('13 months');
    expect(categoryRows(wrapper)).toEqual([
      ['category:1', formatEuroAmount('11.08')],
      ['uncategorised', formatEuroAmount('0.15')],
    ]);
    expect(summaryValues(wrapper)).toEqual([
      formatEuroAmount('11.23'),
      formatEuroAmount('0.00'),
      formatEuroAmount('0.00'),
    ]);
    expect(wrapper.get('[data-testid="category-average"]').findAll('[data-testid="trend-bar"]')).toHaveLength(13);
    expect(mocks.useFetch).toHaveBeenCalledTimes(1);
  });

  it('sorts averages by amount or category in either direction and reports the sort', async () => {
    mocks.useFetch.mockReturnValue(response([
      { bookingDate: currentMonth.startDate, amount: '-240.00', person: { id: '1', name: 'Default' }, category: { id: '3', name: 'Zebra', hidden: false, expenseType: null } },
      { bookingDate: currentMonth.startDate, amount: '-24.00', person: { id: '1', name: 'Default' }, category: { id: '4', name: 'Alpha', hidden: false, expenseType: null } },
      { bookingDate: currentMonth.startDate, amount: '-24.00', person: { id: '1', name: 'Default' }, category: { id: '2', name: 'alpha', hidden: false, expenseType: null } },
      { bookingDate: currentMonth.startDate, amount: '-36.00', person: { id: '1', name: 'Default' }, category: null },
    ]));

    const wrapper = await mountSuspended(MonthlyAverage);
    const keys = () => wrapper.findAll('[data-testid="category-average"]')
      .map((item) => item.attributes('data-category-key'));
    const amountSort = wrapper.get('[data-testid="monthly-average-sort-column"]');
    const directionSort = wrapper.get('[data-testid="monthly-average-sort-direction"]');
    const categoryHeader = wrapper.get('[data-testid="category-sort-header"]');
    const amountHeader = wrapper.get('[data-testid="amount-sort-header"]');

    expect((amountSort.element as HTMLSelectElement).value).toBe('amount');
    expect((directionSort.element as HTMLSelectElement).value).toBe('desc');
    expect(amountHeader.attributes('aria-sort')).toBe('descending');
    expect(categoryHeader.attributes('aria-sort')).toBeUndefined();
    expect(keys()).toEqual(['category:3', 'uncategorised', 'category:2', 'category:4']);

    await directionSort.setValue('asc');
    expect(amountHeader.attributes('aria-sort')).toBe('ascending');
    expect(keys()).toEqual(['category:2', 'category:4', 'uncategorised', 'category:3']);

    await directionSort.setValue('desc');
    expect(keys()).toEqual(['category:3', 'uncategorised', 'category:2', 'category:4']);

    await amountSort.setValue('category');
    await directionSort.setValue('asc');
    expect(categoryHeader.attributes('aria-sort')).toBe('ascending');
    expect(amountHeader.attributes('aria-sort')).toBeUndefined();
    expect(keys()).toEqual(['category:2', 'category:4', 'category:3', 'uncategorised']);

    await directionSort.setValue('desc');
    expect(categoryHeader.attributes('aria-sort')).toBe('descending');
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
    expect(wrapper.get('[data-testid="monthly-average-subtitle"]').text()).toContain('13 months');
    expect(wrapper.get('[data-testid="category-average-amount"]').text()).toBe(amountAfterChange);

    await control.setValue('');
    expect(wrapper.get('[data-testid="monthly-average-subtitle"]').text()).toContain('13 months');
    expect(wrapper.get('[data-testid="category-average-amount"]').text()).toBe(amountAfterChange);
    expect(wrapper.get('[data-testid="category-average"]').findAll('[data-testid="trend-bar"]')).toHaveLength(13);
    expect(mocks.useFetch).toHaveBeenCalledTimes(1);
  });

  it('excludes a hidden category from the table and every figure while leaving visible categories unchanged', async () => {
    mocks.useFetch.mockReturnValue(response([
      { bookingDate: currentMonth.startDate, amount: '-12.00', person: { id: '1', name: 'Default' }, category: { id: '1', name: 'Groceries', hidden: false, expenseType: null } },
      { bookingDate: currentMonth.startDate, amount: '-120.00', person: { id: '1', name: 'Default' }, category: { id: '9', name: 'Internal', hidden: true, expenseType: null } },
      { bookingDate: currentMonth.startDate, amount: '-2.00', person: { id: '1', name: 'Default' }, category: null },
    ]));

    const wrapper = await mountSuspended(MonthlyAverage);

    expect(categoryRows(wrapper)).toEqual([
      ['category:1', formatEuroAmount('1.00')],
      ['uncategorised', formatEuroAmount('0.17')],
    ]);
    expect(summaryValues(wrapper)).toEqual([
      formatEuroAmount('1.17'),
      formatEuroAmount('0.00'),
      formatEuroAmount('0.00'),
    ]);
    expect(wrapper.text()).not.toContain('Internal');
    expect(mocks.useFetch).toHaveBeenCalledTimes(1);
  });

  it('distinguishes loading, failed, and empty transaction results', async () => {
    mocks.useFetch.mockReturnValue(response(null, { pending: true }));
    const loading = await mountSuspended(MonthlyAverage);
    expect(loading.text()).toContain('Loading monthly category averages');
    expect(loading.find('[data-testid="monthly-average-table"]').exists()).toBe(false);

    mocks.useFetch.mockReturnValue(response([
      { bookingDate: currentMonth.startDate, amount: '-12.00', person: { id: '1', name: 'Default' }, category: { id: '1', name: 'Stale', hidden: false, expenseType: null } },
    ], { error: new Error('failed') }));
    const failed = await mountSuspended(MonthlyAverage);
    expect(failed.text()).toContain('Monthly category averages could not be loaded');
    expect(failed.text()).not.toContain('Stale');

    mocks.useFetch.mockReturnValue(response([
      { bookingDate: '2000-01-01', amount: '-12.00', person: { id: '1', name: 'Default' }, category: { id: '1', name: 'Old', hidden: false, expenseType: null } },
    ]));
    const empty = await mountSuspended(MonthlyAverage);
    expect(empty.findAll('[data-testid="category-average"]')).toHaveLength(0);
    expect(empty.get('[data-testid="no-data"]').text()).toBe('No category data for these months.');
    expect(summaryValues(empty)).toEqual([
      formatEuroAmount('0.00'),
      formatEuroAmount('0.00'),
      formatEuroAmount('0.00'),
    ]);
  });

  it('filters by expense type through the select without another request and keeps the window', async () => {
    mocks.useFetch.mockReturnValue(response([
      { bookingDate: currentMonth.startDate, amount: '-12.00', person: { id: '1', name: 'Default' }, category: { id: '1', name: 'Groceries', hidden: false, expenseType: 'recurring' } },
      { bookingDate: currentMonth.startDate, amount: '-24.00', person: { id: '1', name: 'Default' }, category: { id: '2', name: 'New car', hidden: false, expenseType: 'one-time' } },
      { bookingDate: currentMonth.startDate, amount: '-2.00', person: { id: '1', name: 'Default' }, category: null },
    ]));

    const wrapper = await mountSuspended(MonthlyAverage);
    const typeFilter = wrapper.get('[data-testid="expense-type-filter"]');

    expect((typeFilter.element as HTMLSelectElement).value).toBe('all');
    expect(summaryValues(wrapper)).toEqual([
      formatEuroAmount('3.17'),
      formatEuroAmount('1.00'),
      formatEuroAmount('2.00'),
    ]);

    await wrapper.get('[data-testid="month-count-input"]').setValue('13');
    await typeFilter.setValue('recurring');

    expect(categoryRows(wrapper)).toEqual([['category:1', formatEuroAmount('0.92')]]);
    expect(wrapper.get('[data-testid="monthly-average-subtitle"]').text()).toContain('13 months');
    expect(summaryValues(wrapper)).toEqual([
      formatEuroAmount('0.92'),
      formatEuroAmount('0.92'),
      formatEuroAmount('1.85'),
    ]);

    await typeFilter.setValue('one-time');
    expect(categoryRows(wrapper)).toEqual([['category:2', formatEuroAmount('1.85')]]);
    expect(summaryValues(wrapper)).toEqual([
      formatEuroAmount('1.85'),
      formatEuroAmount('0.92'),
      formatEuroAmount('1.85'),
    ]);
    expect(mocks.useFetch).toHaveBeenCalledTimes(1);
  });

  it('shows no rows when a filter leaves nothing in the window while typed figures stay person-scoped', async () => {
    mocks.useFetch.mockReturnValue(response([
      { bookingDate: currentMonth.startDate, amount: '-12.00', person: { id: '1', name: 'Default' }, category: { id: '1', name: 'Groceries', hidden: false, expenseType: 'recurring' } },
    ]));

    const wrapper = await mountSuspended(MonthlyAverage);
    await wrapper.get('[data-testid="expense-type-filter"]').setValue('one-time');

    expect(wrapper.findAll('[data-testid="category-average"]')).toHaveLength(0);
    expect(wrapper.get('[data-testid="no-data"]').text()).toBe('No category data for these months.');
    expect(summaryValues(wrapper)).toEqual([
      formatEuroAmount('0.00'),
      formatEuroAmount('1.00'),
      formatEuroAmount('0.00'),
    ]);
  });

  it('presents the comparison table on the card surface and exposes its accessibility contract', async () => {
    mocks.useFetch.mockReturnValue(response(sampleTransactions()));

    const wrapper = await mountSuspended(MonthlyAverage);
    const region = wrapper.get('[data-testid="monthly-average-table"]');

    expect(region.classes()).toContain('shadow-sheet');
    expect(region.classes()).toContain('border-card-border');
    for (const surface of [
      wrapper.get('[data-testid="monthly-average-filter-panel"]'),
      wrapper.get('[data-testid="monthly-average-summary-card"]'),
    ]) {
      expect(surface.classes()).toContain('shadow-sheet');
      expect(surface.classes()).toContain('border-card-border');
    }
    expect(region.attributes('role')).toBe('region');
    expect(region.attributes('aria-label')).toBe('Monthly average category table');
    expect(region.attributes('tabindex')).toBe('0');
    expect(region.attributes('aria-describedby')).toBe('monthly-average-table-scroll-help');
    expect(wrapper.get('[data-testid="category-trend"]').attributes('aria-hidden')).toBe('true');
    expect(wrapper.get('[data-testid="average-bar-cell"]').attributes('aria-hidden')).toBe('true');
    expect(wrapper.get('[data-testid="category-color"]').attributes('aria-hidden')).toBe('true');
    expect(wrapper.get('[data-testid="amount-sort-header"]').attributes('aria-sort')).toBe('descending');
    expect(wrapper.get('[data-testid="category-sort-header"]').attributes('aria-sort')).toBeUndefined();
  });
});

describe('the monthly average person filter', () => {
  const anna = { id: '2', name: 'Anna' };
  const defaultPerson = { id: '1', name: 'Default' };

  beforeEach(() => {
    mocks.useFetch.mockReset();
  });

  function withPeople() {
    return response([
      { bookingDate: currentMonth.startDate, amount: '-12.00', person: anna, category: { id: '1', name: 'Groceries', hidden: false, expenseType: null } },
      { bookingDate: currentMonth.startDate, amount: '-2.00', person: defaultPerson, category: null },
    ]);
  }

  it('reads the person from the URL and scopes the table and every figure', async () => {
    mocks.useFetch.mockReturnValue(withPeople());

    const wrapper = await mountSuspended(MonthlyAverage, { route: '/monthly-average?person=2' });

    expect((wrapper.get('[data-testid="person-filter"]').element as HTMLSelectElement).value).toBe('2');
    expect(categoryRows(wrapper)).toEqual([['category:1', formatEuroAmount('1.00')]]);
    expect(summaryValues(wrapper)).toEqual([
      formatEuroAmount('1.00'),
      formatEuroAmount('0.00'),
      formatEuroAmount('0.00'),
    ]);
    expect(mocks.useFetch).toHaveBeenCalledTimes(1);
  });

  it('falls back to all people and changes the person without another request', async () => {
    mocks.useFetch.mockReturnValue(withPeople());

    const wrapper = await mountSuspended(MonthlyAverage, { route: '/monthly-average?person=999' });

    expect((wrapper.get('[data-testid="person-filter"]').element as HTMLSelectElement).value).toBe('all');
    expect(categoryRows(wrapper)).toEqual([
      ['category:1', formatEuroAmount('1.00')],
      ['uncategorised', formatEuroAmount('0.17')],
    ]);
    expect(summaryValues(wrapper)).toEqual([
      formatEuroAmount('1.17'),
      formatEuroAmount('0.00'),
      formatEuroAmount('0.00'),
    ]);

    await wrapper.get('[data-testid="person-filter"]').setValue('2');
    await flushPromises();
    expect((wrapper.get('[data-testid="person-filter"]').element as HTMLSelectElement).value).toBe('2');
    expect(categoryRows(wrapper)).toEqual([['category:1', formatEuroAmount('1.00')]]);
    expect(mocks.useFetch).toHaveBeenCalledTimes(1);
  });
});
