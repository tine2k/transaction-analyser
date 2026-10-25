import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  averageDecimalString,
  formatEuroAmount,
  type CategorySpendingTransaction,
} from '../../app/utils/category-spending';

const mocks = vi.hoisted(() => ({ useFetch: vi.fn() }));

mockNuxtImport('useFetch', () => mocks.useFetch);

import Yearly from '../../app/pages/yearly.vue';

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;
const defaultPerson = { id: '1', name: 'Default' };
const anna = { id: '2', name: 'Anna' };

type Category = NonNullable<CategorySpendingTransaction['category']>;

function category(
  id: string,
  name: string,
  options: { hidden?: boolean; expenseType?: 'recurring' | 'one-time' | null } = {},
): Category {
  return { id, name, hidden: false, expenseType: null, ...options };
}

function transaction(
  year: number,
  month: number,
  amount: string,
  transactionCategory: Category | null,
  person = defaultPerson,
): CategorySpendingTransaction {
  return {
    bookingDate: `${year}-${String(month).padStart(2, '0')}-02`,
    amount,
    person,
    category: transactionCategory,
  };
}

function response(
  transactions: CategorySpendingTransaction[] | null,
  { pending = false, error = null }: { pending?: boolean; error?: unknown } = {},
) {
  return { data: ref(transactions), error: ref(error), pending: ref(pending) };
}

function currentYearTransactions(): CategorySpendingTransaction[] {
  return [
    transaction(currentYear, 1, '-12.50', category('1', 'Groceries')),
    transaction(currentYear, 1, '4.00', category('1', 'Groceries')),
    transaction(currentYear, 3, '-7.00', category('1', 'Groceries')),
    transaction(currentYear, 2, '-100.00', category('2', 'Rent')),
    transaction(currentYear, 2, '-2.00', null),
    transaction(currentYear, 1, '-999.00', category('9', 'Internal', { hidden: true })),
  ];
}

describe('yearly page', () => {
  beforeEach(() => {
    mocks.useFetch.mockReset();
  });

  it('loads transactions once and renders the current year as a category-by-month matrix', async () => {
    mocks.useFetch.mockReturnValue(response(currentYearTransactions()));

    const wrapper = await mountSuspended(Yearly, { route: '/yearly' });

    expect(mocks.useFetch).toHaveBeenCalledTimes(1);
    expect(mocks.useFetch.mock.calls[0]?.[0]).toBe('/api/transactions');
    expect(wrapper.get('[data-testid="yearly-subtitle"]').text()).toBe('Every category, month by month');

    const pills = wrapper.findAll('[data-testid="year-pill"]');
    expect(pills.map((pill) => pill.text())).toContain(String(currentYear));
    expect(pills.find((pill) => pill.attributes('data-year') === String(currentYear))?.attributes('aria-pressed'))
      .toBe('true');

    const rows = wrapper.findAll('[data-testid="yearly-row"]');
    expect(rows.map((row) => row.attributes('data-category-key'))).toEqual([
      'category:2', 'category:1', 'uncategorised',
    ]);
    expect(rows.map((row) => row.get('th').text())).toEqual(['Rent', 'Groceries', 'Uncategorised']);
    expect(rows.every((row) => row.findAll('[data-testid="yearly-month-cell"]').length === 12)).toBe(true);
    expect(wrapper.findAll('[data-testid="yearly-month-cell"]')).toHaveLength(36);
    expect(wrapper.text()).not.toContain('Internal');

    expect(wrapper.get('[data-testid="total-moved-value"]').text()).toBe(formatEuroAmount('125.50'));
    expect(wrapper.get('[data-testid="average-divisor"]').text())
      .toContain(`over ${currentMonth} ${currentMonth === 1 ? 'month' : 'months'}`);
    expect(wrapper.get('[data-testid="average-value"]').text())
      .toBe(formatEuroAmount(averageDecimalString('125.50', currentMonth)));

    const region = wrapper.get('[data-testid="yearly-matrix-scroll"]');
    expect(region.attributes('role')).toBe('region');
    expect(region.attributes('aria-label')).toBe('Yearly category matrix');
    expect(region.attributes('tabindex')).toBe('0');
    expect(region.classes()).toContain('overflow-x-auto');
    expect(wrapper.get('[data-testid="yearly-matrix"]').classes()).toContain('min-w-[1100px]');
  });

  it('selects a URL year and states the twelve-month divisor', async () => {
    const pastYear = currentYear - 1;
    mocks.useFetch.mockReturnValue(response([
      transaction(pastYear, 2, '-120.00', category('1', 'Groceries')),
      transaction(pastYear, 3, '-24.00', category('2', 'Rent')),
    ]));

    const wrapper = await mountSuspended(Yearly, { route: `/yearly?year=${pastYear}` });

    expect(wrapper.get('[data-testid="year-pill"][data-year="' + pastYear + '"]').attributes('aria-pressed'))
      .toBe('true');
    expect(wrapper.get('[data-testid="yearly-summary"]').text()).toContain(`Total moved ${pastYear}`);
    expect(wrapper.get('[data-testid="average-divisor"]').text()).toContain('over 12 months');
    expect(wrapper.get('[data-testid="average-value"]').text())
      .toBe(formatEuroAmount(averageDecimalString('144.00', 12)));
    expect(mocks.useFetch).toHaveBeenCalledTimes(1);
  });

  it('renders blank zero cells and a total column', async () => {
    const pastYear = currentYear - 1;
    mocks.useFetch.mockReturnValue(response([
      transaction(pastYear, 1, '0.00', category('1', 'Zero-only')),
      transaction(pastYear, 2, '-10.00', category('2', 'Groceries')),
    ]));

    const wrapper = await mountSuspended(Yearly, { route: `/yearly?year=${pastYear}` });

    const zeroRow = wrapper.get('[data-testid="yearly-row"][data-category-key="category:1"]');
    expect(zeroRow.findAll('[data-testid="yearly-month-cell"]').map((cell) => cell.text())).toEqual(
      Array.from({ length: 12 }, () => ''),
    );
    expect(zeroRow.get('[data-testid="yearly-total-cell"]').text()).toBe('');

    const populatedRow = wrapper.get('[data-testid="yearly-row"][data-category-key="category:2"]');
    expect(populatedRow.findAll('[data-testid="yearly-month-cell"]')[1]?.text())
      .toBe(formatEuroAmount('10.00'));
    expect(populatedRow.get('[data-testid="yearly-total-cell"]').text()).toBe(formatEuroAmount('10.00'));
  });

  it('marks not-yet-elapsed months with a dash and keeps real future data', async () => {
    const futureYear = currentYear + 1;
    mocks.useFetch.mockReturnValue(response([
      transaction(futureYear, 3, '-10.00', category('1', 'Groceries')),
    ]));

    const wrapper = await mountSuspended(Yearly, { route: `/yearly?year=${futureYear}` });

    const cells = wrapper.get('[data-testid="yearly-row"]').findAll('[data-testid="yearly-month-cell"]');
    expect(cells[2]?.text()).toBe(formatEuroAmount('10.00'));
    expect(cells[0]?.text()).toBe('–');
    expect(cells[11]?.text()).toBe('–');
    expect(wrapper.get('[data-testid="average-value"]').text()).toBe('–');
    expect(wrapper.find('[data-testid="average-divisor"]').exists()).toBe(false);
  });

  it('links populated month and total cells and leaves blank cells inert', async () => {
    const pastYear = currentYear - 1;
    mocks.useFetch.mockReturnValue(response([
      transaction(pastYear, 1, '-12.50', category('1', 'Groceries')),
      transaction(pastYear, 2, '-2.00', null),
    ]));

    const wrapper = await mountSuspended(Yearly, { route: `/yearly?year=${pastYear}` });
    const groceries = wrapper.get('[data-testid="yearly-row"][data-category-key="category:1"]');
    const monthCells = groceries.findAll('[data-testid="yearly-month-cell"]');

    const monthLink = new URL(monthCells[0]?.get('[data-testid="yearly-month-link"]').attributes('href')!, 'http://localhost');
    expect(monthLink.pathname).toBe('/');
    expect(monthLink.searchParams.get('month')).toBe(`${pastYear}-01`);
    expect(monthLink.searchParams.get('category')).toBe('1');
    expect(monthLink.searchParams.has('person')).toBe(false);

    const totalLink = new URL(groceries.get('[data-testid="yearly-total-link"]').attributes('href')!, 'http://localhost');
    expect(totalLink.pathname).toBe('/');
    expect(totalLink.searchParams.get('year')).toBe(String(pastYear));
    expect(totalLink.searchParams.get('category')).toBe('1');

    const uncategorised = wrapper.get('[data-testid="yearly-row"][data-category-key="uncategorised"]');
    const uncategorisedLink = new URL(
      uncategorised.get('[data-testid="yearly-month-link"]').attributes('href')!,
      'http://localhost',
    );
    expect(uncategorisedLink.searchParams.get('category')).toBe('uncategorised');

    const blankCell = monthCells[1]!;
    expect(blankCell.find('[data-testid="yearly-month-link"]').exists()).toBe(false);
    expect(blankCell.text()).toBe('');
    expect(groceries.get('[data-testid="yearly-month-link"]').classes()).toContain('hover:bg-paper');
    expect(groceries.get('[data-testid="yearly-total-link"]').classes()).toContain('hover:underline');
    expect(mocks.useFetch).toHaveBeenCalledTimes(1);
  });

  it('scopes by person and carries the person through links', async () => {
    const pastYear = currentYear - 1;
    mocks.useFetch.mockReturnValue(response([
      transaction(pastYear, 1, '-10.00', category('1', 'Groceries'), anna),
      transaction(pastYear, 1, '-2.00', null, defaultPerson),
    ]));

    const wrapper = await mountSuspended(Yearly, { route: `/yearly?year=${pastYear}&person=2` });

    expect((wrapper.get('[data-testid="person-filter"]').element as HTMLSelectElement).value).toBe('2');
    expect(wrapper.findAll('[data-testid="yearly-row"]').map((row) => row.attributes('data-category-key')))
      .toEqual(['category:1']);
    const link = new URL(
      wrapper.get('[data-testid="yearly-month-link"]').attributes('href')!,
      'http://localhost',
    );
    expect(link.searchParams.get('person')).toBe('2');
    expect(mocks.useFetch).toHaveBeenCalledTimes(1);
  });

  it('falls back to all people for an unknown person and omits it from links', async () => {
    const pastYear = currentYear - 1;
    mocks.useFetch.mockReturnValue(response([
      transaction(pastYear, 1, '-10.00', category('1', 'Groceries'), anna),
      transaction(pastYear, 1, '-2.00', null, defaultPerson),
    ]));

    const wrapper = await mountSuspended(Yearly, { route: `/yearly?year=${pastYear}&person=999` });

    expect((wrapper.get('[data-testid="person-filter"]').element as HTMLSelectElement).value).toBe('all');
    expect(wrapper.findAll('[data-testid="yearly-row"]')).toHaveLength(2);
    const link = new URL(
      wrapper.get('[data-testid="yearly-month-link"]').attributes('href')!,
      'http://localhost',
    );
    expect(link.searchParams.has('person')).toBe(false);
  });

  it('filters rows and cards by expense type without another request', async () => {
    mocks.useFetch.mockReturnValue(response([
      transaction(currentYear, 1, '-10.00', category('1', 'Groceries', { expenseType: 'recurring' })),
      transaction(currentYear, 1, '-20.00', category('2', 'New car', { expenseType: 'one-time' })),
      transaction(currentYear, 1, '-30.00', category('3', 'Internal')),
      transaction(currentYear, 1, '-3.00', null),
    ]));

    const wrapper = await mountSuspended(Yearly, { route: '/yearly' });
    expect((wrapper.get('[data-testid="expense-type-all"]').element as HTMLInputElement).checked).toBe(true);
    expect(wrapper.findAll('[data-testid="yearly-row"]')).toHaveLength(4);

    await wrapper.get('[data-testid="expense-type-recurring"]').setValue(true);
    expect(wrapper.findAll('[data-testid="yearly-row"]').map((row) => row.get('th').text()))
      .toEqual(['Groceries']);
    expect(wrapper.get('[data-testid="total-moved-value"]').text()).toBe(formatEuroAmount('10.00'));

    await wrapper.get('[data-testid="expense-type-one-time"]').setValue(true);
    expect(wrapper.findAll('[data-testid="yearly-row"]').map((row) => row.get('th').text()))
      .toEqual(['New car']);
    expect(wrapper.get('[data-testid="total-moved-value"]').text()).toBe(formatEuroAmount('20.00'));
    expect(mocks.useFetch).toHaveBeenCalledTimes(1);
  });

  it('hides uncategorised from rows and cards and restores it', async () => {
    mocks.useFetch.mockReturnValue(response([
      transaction(currentYear, 1, '-10.00', category('1', 'Groceries')),
      transaction(currentYear, 1, '-3.00', null),
    ]));

    const wrapper = await mountSuspended(Yearly, { route: '/yearly' });
    expect(wrapper.findAll('[data-testid="yearly-row"]')).toHaveLength(2);
    expect(wrapper.get('[data-testid="total-moved-value"]').text()).toBe(formatEuroAmount('13.00'));

    await wrapper.get('[data-testid="hide-uncategorised"]').setValue(true);
    expect(wrapper.findAll('[data-testid="yearly-row"]')).toHaveLength(1);
    expect(wrapper.get('[data-testid="total-moved-value"]').text()).toBe(formatEuroAmount('10.00'));

    await wrapper.get('[data-testid="hide-uncategorised"]').setValue(false);
    expect(wrapper.findAll('[data-testid="yearly-row"]')).toHaveLength(2);
    expect(wrapper.get('[data-testid="total-moved-value"]').text()).toBe(formatEuroAmount('13.00'));
    expect(mocks.useFetch).toHaveBeenCalledTimes(1);
  });

  it('renders a row-relative heatmap and leaves the total column untinted', async () => {
    const pastYear = currentYear - 1;
    mocks.useFetch.mockReturnValue(response([
      transaction(pastYear, 1, '-10.00', category('1', 'Groceries')),
      transaction(pastYear, 2, '-20.00', category('1', 'Groceries')),
      transaction(pastYear, 3, '-5.00', category('1', 'Groceries')),
    ]));

    const wrapper = await mountSuspended(Yearly, { route: `/yearly?year=${pastYear}` });
    const row = wrapper.get('[data-testid="yearly-row"]');
    const cells = row.findAll('[data-testid="yearly-month-cell"]');

    expect(cells[0]?.classes()).toContain('yearly-tint');
    expect(cells[0]?.attributes('style')).toContain('--yearly-tint');
    expect(cells[1]?.attributes('style')).toContain('56%');
    expect(cells[2]?.attributes('style')).toContain('--yearly-tint');
    expect(cells[2]?.attributes('style')).not.toContain('56%');
    expect(cells[3]?.classes()).toContain('bg-paper');
    expect(cells[3]?.attributes('style')).toBeUndefined();
    expect(row.get('[data-testid="yearly-total-cell"]').attributes('style')).toBeUndefined();
    expect(cells.every((cell) => cell.classes().includes('text-ink'))).toBe(true);
    expect(cells[1]?.text()).toBe(formatEuroAmount('20.00'));
  });

  it('offers represented, current, and queried years and switches without re-fetching', async () => {
    const olderYear = currentYear - 2;
    const queriedYear = currentYear - 3;
    mocks.useFetch.mockReturnValue(response([
      transaction(olderYear, 1, '-10.00', category('1', 'Older')),
      transaction(currentYear, 1, '-20.00', category('2', 'Current')),
    ]));

    const wrapper = await mountSuspended(Yearly, { route: `/yearly?year=${queriedYear}` });

    expect(wrapper.findAll('[data-testid="year-pill"]').map((pill) => pill.text())).toEqual([
      String(queriedYear), String(olderYear), String(currentYear),
    ]);
    expect(wrapper.get('[data-testid="year-pill"][data-year="' + queriedYear + '"]').attributes('aria-pressed'))
      .toBe('true');
    expect(wrapper.findAll('[data-testid="yearly-row"]')).toHaveLength(0);
    expect(wrapper.text()).toContain(`No category data for ${queriedYear}.`);

    await wrapper.get('[data-testid="year-pill"][data-year="' + olderYear + '"]').trigger('click');
    await flushPromises();

    expect(wrapper.get('[data-testid="year-pill"][data-year="' + olderYear + '"]').attributes('aria-pressed'))
      .toBe('true');
    expect(wrapper.findAll('[data-testid="yearly-row"]').map((row) => row.get('th').text())).toEqual(['Older']);
    expect(mocks.useFetch).toHaveBeenCalledTimes(1);
  });

  it('distinguishes loading, failed, and empty results', async () => {
    mocks.useFetch.mockReturnValue(response(null, { pending: true }));
    const loading = await mountSuspended(Yearly, { route: '/yearly' });
    expect(loading.text()).toContain('Loading yearly data');
    expect(loading.find('[data-testid="yearly-matrix"]').exists()).toBe(false);

    mocks.useFetch.mockReturnValue(response([
      transaction(currentYear, 1, '-12.50', category('1', 'Stale')),
    ], { error: new Error('failed') }));
    const failed = await mountSuspended(Yearly, { route: '/yearly' });
    expect(failed.text()).toContain('Yearly data could not be loaded');
    expect(failed.text()).not.toContain('Stale');

    mocks.useFetch.mockReturnValue(response([]));
    const empty = await mountSuspended(Yearly, { route: '/yearly' });
    expect(empty.findAll('[data-testid="yearly-row"]')).toHaveLength(0);
    expect(empty.get('[data-testid="total-moved-value"]').text()).toBe(formatEuroAmount('0'));
    expect(empty.text()).toContain(`No category data for ${currentYear}.`);
  });
});
