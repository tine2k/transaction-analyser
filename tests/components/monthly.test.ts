import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  formatEuroAmount,
  getLocalDateString,
  type CategorySpendingTransaction,
} from '../../app/utils/category-spending';

const mocks = vi.hoisted(() => ({ useFetch: vi.fn() }));

mockNuxtImport('useFetch', () => mocks.useFetch);

import Monthly from '../../app/pages/monthly.vue';

const today = getLocalDateString(new Date());
const currentMonth = today.slice(0, 7);
const currentYear = Number(today.slice(0, 4));
const defaultPerson = { id: '1', name: 'Default' };
const anna = { id: '2', name: 'Anna' };

function response(
  transactions: CategorySpendingTransaction[] | null,
  { pending = false, error = null }: { pending?: boolean; error?: unknown } = {},
) {
  return { data: ref(transactions), error: ref(error), pending: ref(pending) };
}

function transaction(
  bookingDate: string,
  amount: string,
  category: { id: string; name: string; hidden?: boolean; expenseType?: 'recurring' | 'one-time' | null } | null,
  person: { id: string; name: string } = defaultPerson,
): CategorySpendingTransaction {
  return {
    bookingDate,
    amount,
    person,
    category: category === null
      ? null
      : { hidden: false, expenseType: null, ...category },
  };
}

function currentMonthTransaction(
  amount: string,
  category: { id: string; name: string; hidden?: boolean; expenseType?: 'recurring' | 'one-time' | null } | null,
  day = '01',
  person: { id: string; name: string } = defaultPerson,
): CategorySpendingTransaction {
  return transaction(`${currentMonth}-${day}`, amount, category, person);
}

describe('the Monthly screen', () => {
  beforeEach(() => {
    mocks.useFetch.mockReset();
  });

  it('loads once and presents the selected month, summary, bar, and complete table', async () => {
    mocks.useFetch.mockReturnValue(response([
      currentMonthTransaction('-12.50', { id: '1', name: 'Groceries' }, '01'),
      currentMonthTransaction('4.00', { id: '1', name: 'Groceries' }, '02'),
      currentMonthTransaction('-100.00', { id: '2', name: 'Rent' }, '03'),
      currentMonthTransaction('-3.25', null, '04'),
      currentMonthTransaction('-99.00', { id: '3', name: 'Internal', hidden: true }, '05'),
    ]));

    const wrapper = await mountSuspended(Monthly);

    expect(mocks.useFetch).toHaveBeenCalledTimes(1);
    expect(mocks.useFetch.mock.calls[0]?.[0]).toBe('/api/transactions');
    expect(wrapper.get('[data-testid="monthly-subtitle"]').text())
      .toContain('Absolute transaction totals by category, 3 categories');
    expect(wrapper.get('[data-testid="total-moved-value"]').text()).toBe(formatEuroAmount('119.75'));
    expect(wrapper.get('[data-testid="transaction-count-value"]').text()).toBe('4');

    const rows = wrapper.findAll('[data-testid="category-row"]');
    expect(rows.map((row) => row.attributes('data-category-key')))
      .toEqual(['category:2', 'category:1', 'uncategorised']);
    expect(rows[1]?.get('[data-testid="row-amount"]').text()).toBe(formatEuroAmount('16.50'));
    expect(rows[1]?.get('[data-testid="row-transactions"]').text()).toBe('2');

    expect(wrapper.findAll('[data-testid="bar-segment"]')).toHaveLength(3);
    expect(wrapper.findAll('[data-testid="bar-legend-item"]')).toHaveLength(3);
    expect(wrapper.get('[data-testid="bar-legend"]').text()).toContain('Groceries');
    expect(wrapper.get('[data-testid="bar-legend"]').text()).toContain(formatEuroAmount('16.50'));
    expect(wrapper.text()).not.toContain('Internal');
    expect(wrapper.find('[data-testid="echarts-chart"]').exists()).toBe(false);

    const currentPill = wrapper.findAll('[data-testid="month-pill"]')
      .find((pill) => pill.attributes('data-month-key') === currentMonth);
    expect(currentPill?.attributes('aria-pressed')).toBe('true');
  });

  it('keeps a category colour when the visible category set changes', async () => {
    const rent = { id: '2', name: 'Rent' };
    mocks.useFetch.mockReturnValue(response([
      currentMonthTransaction('-10.00', rent),
    ]));

    const alone = await mountSuspended(Monthly);
    const aloneMark = alone.get(
      '[data-testid="category-row"][data-category-key="category:2"] [data-testid="category-color"]',
    ).attributes('style');

    mocks.useFetch.mockReturnValue(response([
      currentMonthTransaction('-10.00', rent),
      currentMonthTransaction('-1.00', { id: '1', name: 'Groceries' }),
    ]));

    const withSibling = await mountSuspended(Monthly);
    const withSiblingMark = withSibling.get(
      '[data-testid="category-row"][data-category-key="category:2"] [data-testid="category-color"]',
    ).attributes('style');

    expect(aloneMark).toContain('background-color');
    expect(withSiblingMark).toBe(aloneMark);
  });

  it('separates similar-sized categories that share a home colour', async () => {
    mocks.useFetch.mockReturnValue(response([
      currentMonthTransaction('-100.00', { id: '1', name: 'Groceries' }, '01'),
      currentMonthTransaction('-105.00', { id: '21', name: 'Household' }, '02'),
    ]));

    const wrapper = await mountSuspended(Monthly);
    const groceriesSegment = wrapper.get(
      '[data-testid="bar-segment"][data-category-key="category:1"]',
    ).attributes('style');
    const householdSegment = wrapper.get(
      '[data-testid="bar-segment"][data-category-key="category:21"]',
    ).attributes('style');
    const householdLegend = wrapper.findAll('[data-testid="bar-legend-item"]')
      .find((item) => item.text().includes('Household'))
      ?.get('span[aria-hidden="true"]')
      .attributes('style');
    const householdRow = wrapper.get(
      '[data-testid="category-row"][data-category-key="category:21"] [data-testid="category-color"]',
    ).attributes('style');

    expect(householdSegment).not.toBe(groceriesSegment);
    const background = (style: string | undefined) =>
      style?.match(/background-color:\s*([^;]+)/)?.[1];
    expect(background(householdLegend)).toBe(background(householdSegment));
    expect(background(householdRow)).toBe(background(householdSegment));
  });

  it('keeps the home colour on a category outside the top eight', async () => {
    mocks.useFetch.mockReturnValue(response([
      currentMonthTransaction('-100.00', { id: '1', name: 'Groceries' }, '01'),
      currentMonthTransaction('-90.00', { id: '2', name: 'Rent' }, '02'),
      currentMonthTransaction('-80.00', { id: '3', name: 'Transport' }, '03'),
      currentMonthTransaction('-70.00', { id: '4', name: 'Utilities' }, '04'),
      currentMonthTransaction('-60.00', { id: '5', name: 'Internet' }, '05'),
      currentMonthTransaction('-50.00', { id: '6', name: 'Phone' }, '06'),
      currentMonthTransaction('-40.00', { id: '7', name: 'Insurance' }, '07'),
      currentMonthTransaction('-30.00', { id: '8', name: 'Health' }, '08'),
      currentMonthTransaction('-1.00', { id: '21', name: 'Household' }, '09'),
    ]));

    const wrapper = await mountSuspended(Monthly);
    const topEightHome = wrapper.get(
      '[data-testid="category-row"][data-category-key="category:1"] [data-testid="category-color"]',
    ).attributes('style');
    const outsideHome = wrapper.get(
      '[data-testid="category-row"][data-category-key="category:21"] [data-testid="category-color"]',
    ).attributes('style');

    expect(wrapper.findAll('[data-testid="category-row"]')).toHaveLength(9);
    expect(outsideHome).toBe(topEightHome);
  });

  it('reads the selected month from the URL and keeps the year control in step', async () => {
    const month = `${currentYear - 1}-03`;
    const replace = vi.fn();
    mocks.useFetch.mockReturnValue(response([
      transaction(`${month}-05`, '-10.00', { id: '7', name: 'Groceries' }),
      transaction(`${currentYear - 1}-04-01`, '-20.00', { id: '8', name: 'Rent' }),
    ]));

    const wrapper = await mountSuspended(Monthly, { route: `/monthly?month=${month}` });
    vi.spyOn(wrapper.vm.$router, 'replace').mockImplementation(replace);

    expect(wrapper.findAll('[data-testid="month-pill"]')).toHaveLength(12);
    expect(wrapper.get(`[data-testid="month-pill"][data-month-key="${month}"]`).attributes('aria-pressed'))
      .toBe('true');
    expect((wrapper.get('[data-testid="year-select"]').element as HTMLSelectElement).value)
      .toBe(String(currentYear - 1));
    expect(wrapper.findAll('[data-testid="category-row"]')).toHaveLength(1);
    expect(wrapper.get('[data-testid="row-amount"]').text()).toBe(formatEuroAmount('10.00'));

    await wrapper.get('[data-testid="year-select"]').setValue(String(currentYear));

    expect(replace).toHaveBeenCalledWith({
      path: '/monthly',
      query: { month: `${currentYear}-03` },
    });
    expect(mocks.useFetch).toHaveBeenCalledTimes(1);
  });

  it('changes month through the pills and preserves the person in the query', async () => {
    const nextMonth = currentMonth === `${currentYear}-01` ? `${currentYear}-02` : `${currentYear}-01`;
    const replace = vi.fn();
    mocks.useFetch.mockReturnValue(response([
      currentMonthTransaction('-10.00', { id: '7', name: 'Groceries' }, '01', anna),
      transaction(`${nextMonth}-01`, '-20.00', { id: '8', name: 'Rent' }, anna),
    ]));

    const wrapper = await mountSuspended(Monthly, { route: '/monthly?person=2' });
    vi.spyOn(wrapper.vm.$router, 'replace').mockImplementation(replace);

    await wrapper.get(`[data-testid="month-pill"][data-month-key="${nextMonth}"]`).trigger('click');

    expect(replace).toHaveBeenCalledWith({
      path: '/monthly',
      query: { person: '2', month: nextMonth },
    });
    expect(mocks.useFetch).toHaveBeenCalledTimes(1);
  });

  it('splits the eight largest categories from one Other segment', async () => {
    const many = Array.from({ length: 10 }, (_, index) =>
      currentMonthTransaction(String(10 - index), {
        id: String(index + 1),
        name: `Category ${String(index + 1).padStart(2, '0')}`,
      }));

    mocks.useFetch.mockReturnValue(response(many));
    const wrapper = await mountSuspended(Monthly);

    expect(wrapper.get('[data-testid="bar-heading"]').text()).toContain('top 8 + 2 others');
    expect(wrapper.findAll('[data-testid="bar-segment"]')).toHaveLength(9);
    expect(wrapper.findAll('[data-testid="bar-legend-item"]')).toHaveLength(9);
    expect(wrapper.findAll('[data-testid="category-row"]')).toHaveLength(10);
    expect(wrapper.get('[data-testid="bar-legend-item"]:last-child').text()).toContain('Other 2');

    const shares = wrapper.findAll('[data-testid="share-bar"]');
    expect(shares[0]?.attributes('style')).toContain('width: 100%');
    expect(shares[1]?.attributes('style')).toContain('width: 90%');
  });

  it('links named, uncategorised, and person-scoped rows to the transactions screen', async () => {
    mocks.useFetch.mockReturnValue(response([
      currentMonthTransaction('-10.00', { id: '7', name: 'Groceries' }, '01', anna),
      currentMonthTransaction('-2.00', null, '02', anna),
    ]));

    const allPeople = await mountSuspended(Monthly);
    const allLinks = allPeople.findAll('[data-testid="category-transaction-link"]');
    const allTargets = allLinks.map((link) => new URL(link.attributes('href')!, 'http://localhost'));
    expect(allTargets.map((target) => [target.searchParams.get('month'), target.searchParams.get('category')]))
      .toEqual([[currentMonth, '7'], [currentMonth, 'uncategorised']]);
    expect(allTargets.every((target) => !target.searchParams.has('person'))).toBe(true);

    const onePerson = await mountSuspended(Monthly, { route: '/monthly?person=2' });
    const personTarget = new URL(onePerson.get('[data-testid="category-transaction-link"]').attributes('href')!, 'http://localhost');
    expect(personTarget.searchParams.get('person')).toBe('2');
    expect(personTarget.searchParams.get('category')).toBe('7');

    expect(mocks.useFetch).toHaveBeenCalledTimes(2);
  });

  it('scopes every figure with the expense-type filter without another request', async () => {
    mocks.useFetch.mockReturnValue(response([
      currentMonthTransaction('-10.00', { id: '1', name: 'Groceries', expenseType: 'recurring' }, '01'),
      currentMonthTransaction('-20.00', { id: '2', name: 'New car', expenseType: 'one-time' }, '02'),
      currentMonthTransaction('-40.00', null, '03'),
      currentMonthTransaction('-30.00', { id: '3', name: 'Internal', hidden: true }, '04'),
    ]));

    const wrapper = await mountSuspended(Monthly);
    expect(wrapper.get('[data-testid="total-moved-value"]').text()).toBe(formatEuroAmount('70.00'));
    expect(wrapper.get('[data-testid="transaction-count-value"]').text()).toBe('3');

    await wrapper.get('[data-testid="expense-type-recurring"]').setValue(true);
    expect(wrapper.get('[data-testid="total-moved-value"]').text()).toBe(formatEuroAmount('10.00'));
    expect(wrapper.get('[data-testid="transaction-count-value"]').text()).toBe('1');
    expect(wrapper.findAll('[data-testid="category-row"]')).toHaveLength(1);
    expect(wrapper.text()).not.toContain('New car');
    expect(wrapper.text()).not.toContain('Uncategorised');

    await wrapper.get('[data-testid="expense-type-one-time"]').setValue(true);
    expect(wrapper.get('[data-testid="total-moved-value"]').text()).toBe(formatEuroAmount('20.00'));
    expect(wrapper.findAll('[data-testid="category-row"]')).toHaveLength(1);
    expect(wrapper.text()).toContain('New car');
    expect(mocks.useFetch).toHaveBeenCalledTimes(1);
  });

  it('scopes the summary, bar, table, and count when uncategorised is hidden', async () => {
    mocks.useFetch.mockReturnValue(response([
      currentMonthTransaction('-10.00', { id: '1', name: 'Groceries' }, '01'),
      currentMonthTransaction('-2.00', null, '02'),
    ]));

    const wrapper = await mountSuspended(Monthly);
    expect(wrapper.get('[data-testid="total-moved-value"]').text()).toBe(formatEuroAmount('12.00'));
    expect(wrapper.get('[data-testid="transaction-count-value"]').text()).toBe('2');
    expect(wrapper.text()).toContain('Uncategorised');

    await wrapper.get('[data-testid="hide-uncategorised"]').setValue(true);
    expect(wrapper.get('[data-testid="total-moved-value"]').text()).toBe(formatEuroAmount('10.00'));
    expect(wrapper.get('[data-testid="transaction-count-value"]').text()).toBe('1');
    expect(wrapper.findAll('[data-testid="category-row"]')).toHaveLength(1);
    expect(wrapper.text()).not.toContain('Uncategorised');

    await wrapper.get('[data-testid="hide-uncategorised"]').setValue(false);
    expect(wrapper.get('[data-testid="total-moved-value"]').text()).toBe(formatEuroAmount('12.00'));
    expect(wrapper.text()).toContain('Uncategorised');
    expect(mocks.useFetch).toHaveBeenCalledTimes(1);
  });

  it('reads a person from the URL and falls back to all people for an unknown one', async () => {
    mocks.useFetch.mockReturnValue(response([
      currentMonthTransaction('-10.00', { id: '7', name: 'Groceries' }, '01', anna),
      currentMonthTransaction('-2.00', null, '02', defaultPerson),
    ]));

    const named = await mountSuspended(Monthly, { route: '/monthly?person=2' });
    expect((named.get('[data-testid="person-filter"]').element as HTMLSelectElement).value).toBe('2');
    expect(named.get('[data-testid="transaction-count-value"]').text()).toBe('1');
    expect(named.text()).not.toContain('Uncategorised');

    const unknown = await mountSuspended(Monthly, { route: '/monthly?person=999' });
    expect((unknown.get('[data-testid="person-filter"]').element as HTMLSelectElement).value).toBe('all');
    expect(unknown.get('[data-testid="transaction-count-value"]').text()).toBe('2');
    expect(unknown.text()).toContain('Uncategorised');
  });

  it('keeps table semantics, control names, and legend text for assistive technology', async () => {
    mocks.useFetch.mockReturnValue(response([
      currentMonthTransaction('-10.00', { id: '1', name: 'Groceries' }, '01'),
      currentMonthTransaction('-2.00', null, '02'),
    ]));

    const wrapper = await mountSuspended(Monthly);

    const region = wrapper.get('[data-testid="monthly-category-scroll"]');
    expect(region.attributes('role')).toBe('region');
    expect(region.attributes('aria-label')).toBe('Monthly category table');
    expect(region.attributes('tabindex')).toBe('0');
    expect(wrapper.get('table caption').text()).toContain('Absolute transaction totals by category');
    expect(wrapper.get('table caption').text()).toContain(String(currentYear));
    expect(wrapper.findAll('thead th').map((header) => header.text())).toEqual([
      'Category', 'Share of top category', 'Transactions', 'Amount',
    ]);

    expect(wrapper.get('[data-testid="month-picker"]').attributes('data-testid')).toBe('month-picker');
    const pills = wrapper.findAll('[data-testid="month-pill"]');
    expect(pills).toHaveLength(12);
    expect(pills.filter((pill) => pill.attributes('aria-pressed') === 'true')).toHaveLength(1);
    expect(wrapper.get('[data-testid="year-select"]').element.closest('label')?.textContent).toContain('Year');

    const legendItems = wrapper.findAll('[data-testid="bar-legend-item"]');
    expect(legendItems).toHaveLength(2);
    expect(legendItems[0]?.text()).toContain('Groceries');
    expect(legendItems[0]?.text()).toContain(formatEuroAmount('10.00'));
    expect(wrapper.get('[data-testid="category-bar"]').attributes('aria-hidden')).toBe('true');
  });

  it('distinguishes loading, failure, and an empty month', async () => {
    mocks.useFetch.mockReturnValue(response([], { pending: true }));
    const loading = await mountSuspended(Monthly);
    expect(loading.get('[data-testid="monthly-loading"]').text()).toContain('Loading monthly data');
    expect(loading.find('[data-testid="monthly-summary"]').exists()).toBe(false);

    mocks.useFetch.mockReturnValue(response([], { error: new Error('failed') }));
    const failed = await mountSuspended(Monthly);
    expect(failed.get('[data-testid="monthly-error"]').text()).toContain('Monthly data could not be loaded');
    expect(failed.find('[data-testid="monthly-summary"]').exists()).toBe(false);

    mocks.useFetch.mockReturnValue(response([]));
    const empty = await mountSuspended(Monthly);
    expect(empty.get('[data-testid="total-moved-value"]').text()).toBe(formatEuroAmount('0'));
    expect(empty.get('[data-testid="transaction-count-value"]').text()).toBe('0');
    expect(empty.find('[data-testid="category-bar"]').exists()).toBe(false);
    expect(empty.get('[data-testid="no-category-data"]').text()).toContain(`No category data for`);
    expect(empty.findAll('[data-testid="month-pill"]')).toHaveLength(12);
  });

  it('presents every analysis surface on the card surface', async () => {
    mocks.useFetch.mockReturnValue(response([
      currentMonthTransaction('-12.50', { id: '1', name: 'Groceries' }),
    ]));

    const wrapper = await mountSuspended(Monthly);

    for (const surface of [
      wrapper.get('[data-testid="monthly-filter-panel"]'),
      wrapper.get('[data-testid="monthly-bar-panel"]'),
      wrapper.get('[data-testid="monthly-category-scroll"]'),
    ]) {
      expect(surface.classes()).toContain('shadow-sheet');
      expect(surface.classes()).toContain('border-card-border');
    }
    const summaries = wrapper.findAll('[data-testid="monthly-summary-card"]');
    expect(summaries).toHaveLength(2);
    expect(summaries.every((card) => card.classes().includes('shadow-sheet'))).toBe(true);
    expect(summaries.every((card) => card.classes().includes('border-card-border'))).toBe(true);

    const tableSection = wrapper.get('[data-testid="monthly-table-section"]');
    expect(tableSection.classes()).toContain('mt-4');
    expect(tableSection.find('[data-testid="monthly-category-scroll"]').exists()).toBe(true);
    expect(tableSection.find('#monthly-table-scroll-help').exists()).toBe(true);
  });
});
