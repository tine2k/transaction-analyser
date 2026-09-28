import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getLastTwelveCalendarMonths,
  getLocalDateString,
  type CategorySpendingTransaction,
} from '../../app/utils/category-spending';

const mocks = vi.hoisted(() => ({ useFetch: vi.fn() }));

mockNuxtImport('useFetch', () => mocks.useFetch);

vi.mock('vue-echarts', async () => {
  const { defineComponent } = await import('vue');
  return {
    default: defineComponent({
      name: 'VChart',
      props: ['option'],
      template: '<div data-testid="echarts-chart" />',
    }),
  };
});

import Analytics from '../../app/pages/analytics.vue';

function response(
  transactions: CategorySpendingTransaction[] | null,
  { pending = false, error = null }: { pending?: boolean; error?: unknown } = {},
) {
  return { data: ref(transactions), error: ref(error), pending: ref(pending) };
}

describe('category spending page', () => {
  beforeEach(() => {
    mocks.useFetch.mockReset();
  });

  it('loads transactions once from the existing endpoint', async () => {
    mocks.useFetch.mockReturnValue(response([]));

    const wrapper = await mountSuspended(Analytics);

    expect(mocks.useFetch).toHaveBeenCalledTimes(1);
    expect(mocks.useFetch.mock.calls[0]?.[0]).toBe('/api/transactions');
    expect(wrapper.findAll('[data-testid="month-panel"]')).toHaveLength(12);
  });

  it('shows twelve separate monthly pies and exact absolute euro totals', async () => {
    const today = getLocalDateString(new Date());
    const [currentMonth, previousMonth] = getLastTwelveCalendarMonths(today);
    if (currentMonth === undefined || previousMonth === undefined) {
      throw new Error('expected twelve calendar month buckets');
    }
    mocks.useFetch.mockReturnValue(response([
      { bookingDate: today, amount: '-12.50', category: { id: '1', name: 'Groceries' } },
      { bookingDate: today, amount: '4.00', category: { id: '1', name: 'Groceries' } },
      { bookingDate: today, amount: '-3.25', category: null },
      { bookingDate: previousMonth.startDate, amount: '-2.00', category: { id: '2', name: 'Transport' } },
      { bookingDate: previousMonth.startDate, amount: '-7.00', category: { id: '1', name: 'Groceries' } },
    ]));

    const wrapper = await mountSuspended(Analytics);
    const panels = wrapper.findAll('[data-testid="month-panel"]');
    const charts = wrapper.findAllComponents({ name: 'VChart' });

    expect(panels).toHaveLength(12);
    expect(panels.map((panel) => panel.attributes('data-month-key')))
      .toEqual(getLastTwelveCalendarMonths(today).map(({ key }) => key));
    expect(charts).toHaveLength(12);
    expect(panels[0]?.findAll('[data-testid="category-total"]').map((item) => item.text()))
      .toEqual(['Groceries€16.50', 'Uncategorised€3.25']);
    expect(panels[1]?.findAll('[data-testid="category-total"]').map((item) => item.text()))
      .toEqual(['Transport€2.00', 'Groceries€7.00']);

    const currentOption = charts[0]?.props('option');
    expect(currentOption.series[0].type).toBe('pie');
    expect(currentOption.series[0].data.map(({ name, amount }) => [name, amount]))
      .toEqual([['Groceries', '16.50'], ['Uncategorised', '3.25']]);
    const previousOption = charts[1]?.props('option');
    expect(previousOption.series[0].data.map(({ name, amount }) => [name, amount]))
      .toEqual([['Transport', '2.00'], ['Groceries', '7.00']]);

    const currentGroceries = currentOption.series[0].data[0];
    const previousGroceries = previousOption.series[0].data[1];
    expect(currentGroceries.itemStyle.color).toBe(previousGroceries.itemStyle.color);
    expect(currentGroceries.emphasis.itemStyle.color).toBe(currentGroceries.itemStyle.color);
    expect(previousGroceries.emphasis.itemStyle.color).toBe(previousGroceries.itemStyle.color);
    expect(panels[0]?.findAll('[data-testid="category-total"]')[0]
      ?.find('[data-testid="category-color"]').element.style.backgroundColor)
      .toBe(currentGroceries.itemStyle.color);
    expect(panels[1]?.findAll('[data-testid="category-total"]')[1]
      ?.find('[data-testid="category-color"]').element.style.backgroundColor)
      .toBe(previousGroceries.itemStyle.color);
  });

  it('hides and restores uncategorised totals across all months without reloading data', async () => {
    const today = getLocalDateString(new Date());
    const [currentMonth, previousMonth] = getLastTwelveCalendarMonths(today);
    if (currentMonth === undefined || previousMonth === undefined) {
      throw new Error('expected twelve calendar month buckets');
    }
    const transactions: CategorySpendingTransaction[] = [
      { bookingDate: today, amount: '-10.00', category: { id: '1', name: 'Groceries' } },
      { bookingDate: today, amount: '-3.00', category: null },
      { bookingDate: previousMonth.startDate, amount: '-5.00', category: null },
    ];
    mocks.useFetch.mockReturnValue(response(transactions));

    const wrapper = await mountSuspended(Analytics);
    const hideControl = wrapper.get('[data-testid="hide-uncategorised"]');
    expect((hideControl.element as HTMLInputElement).checked).toBe(false);
    expect(wrapper.findAll('[data-testid="month-panel"]')).toHaveLength(12);
    expect(wrapper.findAll('[data-testid="category-total"]').map((item) => item.text()))
      .toEqual(['Groceries€10.00', 'Uncategorised€3.00', 'Uncategorised€5.00']);
    const groceryColorBeforeHide = wrapper.find('[data-testid="category-color"]').element.style.backgroundColor;

    await hideControl.setValue(true);
    const panelsWhenHidden = wrapper.findAll('[data-testid="month-panel"]');
    const chartsWhenHidden = wrapper.findAllComponents({ name: 'VChart' });
    expect((hideControl.element as HTMLInputElement).checked).toBe(true);
    expect(panelsWhenHidden).toHaveLength(12);
    expect(panelsWhenHidden[0]?.findAll('[data-testid="category-total"]').map((item) => item.text()))
      .toEqual(['Groceries€10.00']);
    expect(panelsWhenHidden[1]?.findAll('[data-testid="category-total"]')).toHaveLength(0);
    expect(panelsWhenHidden[1]?.text()).toContain(`No category data for ${previousMonth.label}`);
    expect(chartsWhenHidden[0]?.props('option').series[0].data.map(({ name }) => name))
      .toEqual(['Groceries']);
    expect(chartsWhenHidden[1]?.props('option').series[0].data).toEqual([]);
    expect(panelsWhenHidden[0]?.find('[data-testid="category-color"]')
      .element.style.backgroundColor).toBe(groceryColorBeforeHide);

    await hideControl.setValue(false);
    expect(wrapper.findAll('[data-testid="category-total"]').map((item) => item.text()))
      .toEqual(['Groceries€10.00', 'Uncategorised€3.00', 'Uncategorised€5.00']);
    expect(mocks.useFetch).toHaveBeenCalledTimes(1);
    expect(transactions).toEqual([
      { bookingDate: today, amount: '-10.00', category: { id: '1', name: 'Groceries' } },
      { bookingDate: today, amount: '-3.00', category: null },
      { bookingDate: previousMonth.startDate, amount: '-5.00', category: null },
    ]);
  });

  it('shows loading and failure states and keeps all empty-month charts', async () => {
    mocks.useFetch.mockReturnValue(response(null, { pending: true }));
    const loading = await mountSuspended(Analytics);
    expect(loading.text()).toContain('Loading monthly category totals');

    mocks.useFetch.mockReturnValue(response([
      { bookingDate: '2026-09-28', amount: '-12.50', category: { id: '1', name: 'Stale' } },
    ], { error: new Error('failed') }));
    const failed = await mountSuspended(Analytics);
    expect(failed.text()).toContain('Monthly category totals could not be loaded');
    expect(failed.text()).not.toContain('Stale');

    mocks.useFetch.mockReturnValue(response([]));
    const empty = await mountSuspended(Analytics);
    expect(empty.findAll('[data-testid="month-panel"]')).toHaveLength(12);
    expect(empty.findAllComponents({ name: 'VChart' })).toHaveLength(12);
    expect(empty.findAll('p').filter((message) => message.text().startsWith('No category data for ')))
      .toHaveLength(12);
    expect(empty.findAll('[data-testid="category-total"]')).toHaveLength(0);
  });
});
