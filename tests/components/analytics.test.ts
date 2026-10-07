import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  formatEuroAmount,
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
      emits: ['click'],
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
    expect(wrapper.get('[data-testid="monthly-charts"]').classes()).toContain('grid-cols-1');
    expect(wrapper.get('[data-testid="month-panel"]').classes()).toContain('min-w-0');
    expect(wrapper.get('[data-testid="hide-uncategorised"]').classes()).toContain('size-5');

    const today = getLocalDateString(new Date());
    const monthLink = wrapper.find('[data-testid="month-link"]');
    const monthTarget = new URL(monthLink.attributes('href'), 'http://localhost');
    expect(monthTarget.pathname).toBe('/');
    expect(monthTarget.searchParams.get('month')).toBe(today.slice(0, 7));
    expect(monthTarget.searchParams.get('category')).toBe('all');
  });

  it('links category totals and routes named and uncategorised slice activations', async () => {
    const today = getLocalDateString(new Date());
    mocks.useFetch.mockReturnValue(response([
      { bookingDate: today, amount: '-10.00', category: { id: '7', name: 'Groceries', hidden: false } },
      { bookingDate: today, amount: '-2.00', category: null },
    ]));

    const wrapper = await mountSuspended(Analytics);
    const links = wrapper.findAll('[data-testid="category-transaction-link"]');
    expect(links[0]?.classes()).toContain('min-h-11');
    expect(links[0]?.classes()).toContain('min-w-0');
    const targets = links.map((link) => new URL(link.attributes('href'), 'http://localhost'));
    expect(targets.map((target) => [target.searchParams.get('month'), target.searchParams.get('category')]))
      .toEqual([[today.slice(0, 7), '7'], [today.slice(0, 7), 'uncategorised']]);

    const chart = wrapper.findAllComponents({ name: 'VChart' })[0];
    if (chart === undefined) {
      throw new Error('expected current month pie chart');
    }
    const push = vi.spyOn(wrapper.vm.$router, 'push');
    const emitSlice = async (key: string) => {
      chart.vm.$emit('click', { data: { key } });
      await flushPromises();
    };

    await emitSlice('category:7');
    expect(push).toHaveBeenLastCalledWith({
      path: '/',
      query: { month: today.slice(0, 7), category: '7' },
    });

    await emitSlice('uncategorised');
    expect(push).toHaveBeenLastCalledWith({
      path: '/',
      query: { month: today.slice(0, 7), category: 'uncategorised' },
    });
    expect(mocks.useFetch).toHaveBeenCalledTimes(1);
  });

  it('shows twelve separate monthly pies and exact absolute euro totals', async () => {
    const today = getLocalDateString(new Date());
    const [currentMonth, previousMonth] = getLastTwelveCalendarMonths(today);
    if (currentMonth === undefined || previousMonth === undefined) {
      throw new Error('expected twelve calendar month buckets');
    }
    mocks.useFetch.mockReturnValue(response([
      { bookingDate: today, amount: '-12.50', category: { id: '1', name: 'Groceries', hidden: false } },
      { bookingDate: today, amount: '4.00', category: { id: '1', name: 'Groceries', hidden: false } },
      { bookingDate: today, amount: '-3.25', category: null },
      { bookingDate: today, amount: '-1234567.89', category: { id: '3', name: 'Rent', hidden: false } },
      { bookingDate: previousMonth.startDate, amount: '-2.00', category: { id: '2', name: 'Transport', hidden: false } },
      { bookingDate: previousMonth.startDate, amount: '-7.00', category: { id: '1', name: 'Groceries', hidden: false } },
    ]));

    const wrapper = await mountSuspended(Analytics);
    const panels = wrapper.findAll('[data-testid="month-panel"]');
    const charts = wrapper.findAllComponents({ name: 'VChart' });

    expect(panels).toHaveLength(12);
    expect(panels.map((panel) => panel.attributes('data-month-key')))
      .toEqual(getLastTwelveCalendarMonths(today).map(({ key }) => key));
    expect(charts).toHaveLength(12);
    expect(panels[0]?.findAll('[data-testid="category-total"]').map((item) => item.text()))
      .toEqual([
        `Rent${formatEuroAmount('1234567.89')}`,
        `Groceries${formatEuroAmount('16.50')}`,
        `Uncategorised${formatEuroAmount('3.25')}`,
      ]);
    expect(panels[1]?.findAll('[data-testid="category-total"]').map((item) => item.text()))
      .toEqual([`Groceries${formatEuroAmount('7.00')}`, `Transport${formatEuroAmount('2.00')}`]);

    const currentOption = charts[0]?.props('option');
    expect(currentOption.series[0].type).toBe('pie');
    expect(currentOption.series[0].data.map(({ name, amount }) => [name, amount]))
      .toEqual([['Rent', '1234567.89'], ['Groceries', '16.50'], ['Uncategorised', '3.25']]);
    const previousOption = charts[1]?.props('option');
    expect(previousOption.series[0].data.map(({ name, amount }) => [name, amount]))
      .toEqual([['Groceries', '7.00'], ['Transport', '2.00']]);

    const currentLabel = currentOption.series[0].label;
    expect(currentLabel.show).toBe(true);
    expect(currentOption.series[0].minShowLabelAngle).toBe(0);
    expect(currentOption.series[0].labelLayout.hideOverlap).toBe(false);
    expect(currentOption.series[0].data.map((datum) => currentLabel.formatter({ data: datum })))
      .toEqual([
        `Rent\n${formatEuroAmount('1234567.89')}`,
        `Groceries\n${formatEuroAmount('16.50')}`,
        `Uncategorised\n${formatEuroAmount('3.25')}`,
      ]);
    expect(currentOption.tooltip.formatter({ data: currentOption.series[0].data[1] }))
      .toBe(`Groceries: ${formatEuroAmount('16.50')}`);

    const currentGroceries = currentOption.series[0].data[1];
    const previousGroceries = previousOption.series[0].data[0];
    expect(currentGroceries.itemStyle.color).toBe(previousGroceries.itemStyle.color);
    expect(currentGroceries.emphasis.itemStyle.color).toBe(currentGroceries.itemStyle.color);
    expect(previousGroceries.emphasis.itemStyle.color).toBe(previousGroceries.itemStyle.color);
    expect(panels[0]?.findAll('[data-testid="category-total"]')[1]
      ?.find('[data-testid="category-color"]').element.style.backgroundColor)
      .toBe(currentGroceries.itemStyle.color);
    expect(panels[1]?.findAll('[data-testid="category-total"]')[0]
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
      { bookingDate: today, amount: '-10.00', category: { id: '1', name: 'Groceries', hidden: false } },
      { bookingDate: today, amount: '-3.00', category: null },
      { bookingDate: previousMonth.startDate, amount: '-5.00', category: null },
    ];
    mocks.useFetch.mockReturnValue(response(transactions));

    const wrapper = await mountSuspended(Analytics);
    const hideControl = wrapper.get('[data-testid="hide-uncategorised"]');
    expect((hideControl.element as HTMLInputElement).checked).toBe(false);
    expect(wrapper.findAll('[data-testid="month-panel"]')).toHaveLength(12);
    expect(wrapper.findAll('[data-testid="category-total"]').map((item) => item.text()))
      .toEqual([
        `Groceries${formatEuroAmount('10.00')}`,
        `Uncategorised${formatEuroAmount('3.00')}`,
        `Uncategorised${formatEuroAmount('5.00')}`,
      ]);
    const groceryColorBeforeHide = wrapper.find('[data-testid="category-color"]').element.style.backgroundColor;

    await hideControl.setValue(true);
    const panelsWhenHidden = wrapper.findAll('[data-testid="month-panel"]');
    const chartsWhenHidden = wrapper.findAllComponents({ name: 'VChart' });
    expect((hideControl.element as HTMLInputElement).checked).toBe(true);
    expect(panelsWhenHidden).toHaveLength(12);
    expect(panelsWhenHidden[0]?.findAll('[data-testid="category-total"]').map((item) => item.text()))
      .toEqual([`Groceries${formatEuroAmount('10.00')}`]);
    expect(panelsWhenHidden[1]?.findAll('[data-testid="category-total"]')).toHaveLength(0);
    expect(panelsWhenHidden[1]?.text()).toContain(`No category data for ${previousMonth.label}`);
    expect(chartsWhenHidden[0]?.props('option').series[0].data.map(({ name }) => name))
      .toEqual(['Groceries']);
    expect(chartsWhenHidden[1]?.props('option').series[0].data).toEqual([]);
    expect(panelsWhenHidden[0]?.find('[data-testid="category-color"]')
      .element.style.backgroundColor).toBe(groceryColorBeforeHide);

    await hideControl.setValue(false);
    expect(wrapper.findAll('[data-testid="category-total"]').map((item) => item.text()))
      .toEqual([
        `Groceries${formatEuroAmount('10.00')}`,
        `Uncategorised${formatEuroAmount('3.00')}`,
        `Uncategorised${formatEuroAmount('5.00')}`,
      ]);
    expect(mocks.useFetch).toHaveBeenCalledTimes(1);
    expect(transactions).toEqual([
      { bookingDate: today, amount: '-10.00', category: { id: '1', name: 'Groceries', hidden: false } },
      { bookingDate: today, amount: '-3.00', category: null },
      { bookingDate: previousMonth.startDate, amount: '-5.00', category: null },
    ]);
  });

  it('excludes a hidden category from every monthly chart while keeping other totals unchanged', async () => {
    const today = getLocalDateString(new Date());
    mocks.useFetch.mockReturnValue(response([
      { bookingDate: today, amount: '-10.00', category: { id: '1', name: 'Groceries', hidden: false } },
      { bookingDate: today, amount: '-99.00', category: { id: '9', name: 'Internal', hidden: true } },
      { bookingDate: today, amount: '-2.00', category: null },
    ]));

    const wrapper = await mountSuspended(Analytics);
    const panels = wrapper.findAll('[data-testid="month-panel"]');
    const charts = wrapper.findAllComponents({ name: 'VChart' });

    expect(panels[0]?.findAll('[data-testid="category-total"]').map((item) => item.text()))
      .toEqual([
        `Groceries${formatEuroAmount('10.00')}`,
        `Uncategorised${formatEuroAmount('2.00')}`,
      ]);
    expect(wrapper.text()).not.toContain('Internal');
    expect(charts[0]?.props('option').series[0].data.map(({ name }) => name))
      .toEqual(['Groceries', 'Uncategorised']);
    expect(mocks.useFetch).toHaveBeenCalledTimes(1);
  });

  it('shows loading and failure states and keeps all empty-month charts', async () => {
    mocks.useFetch.mockReturnValue(response(null, { pending: true }));
    const loading = await mountSuspended(Analytics);
    expect(loading.text()).toContain('Loading monthly category totals');

    mocks.useFetch.mockReturnValue(response([
      { bookingDate: '2026-09-28', amount: '-12.50', category: { id: '1', name: 'Stale', hidden: false } },
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

  it('defaults to the months view and switches to years without another request', async () => {
    const year = new Date().getFullYear() - 2;
    mocks.useFetch.mockReturnValue(response([
      { bookingDate: `${year}-05-01`, amount: '-10.00', category: { id: '1', name: 'Groceries', hidden: false } },
    ]));

    const wrapper = await mountSuspended(Analytics);

    expect((wrapper.get('[data-testid="view-months"]').element as HTMLInputElement).checked).toBe(true);
    expect(wrapper.findAll('[data-testid="month-panel"]')).toHaveLength(12);
    expect(wrapper.findAll('[data-testid="year-panel"]')).toHaveLength(0);

    await wrapper.get('[data-testid="view-years"]').setValue(true);
    expect(wrapper.findAll('[data-testid="month-panel"]')).toHaveLength(0);
    const yearPanels = wrapper.findAll('[data-testid="year-panel"]');
    expect(yearPanels).toHaveLength(1);
    expect(yearPanels[0]?.attributes('data-year-key')).toBe(String(year));

    await wrapper.get('[data-testid="view-months"]').setValue(true);
    expect(wrapper.findAll('[data-testid="month-panel"]')).toHaveLength(12);
    expect(mocks.useFetch).toHaveBeenCalledTimes(1);
  });

  it('sums whole calendar years newest-first and excludes hidden categories', async () => {
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;
    const oldestYear = currentYear - 2;
    mocks.useFetch.mockReturnValue(response([
      { bookingDate: `${oldestYear}-03-01`, amount: '-12.50', category: { id: '1', name: 'Groceries', hidden: false } },
      { bookingDate: `${oldestYear}-11-01`, amount: '4.00', category: { id: '1', name: 'Groceries', hidden: false } },
      { bookingDate: `${oldestYear}-05-01`, amount: '-3.25', category: null },
      { bookingDate: `${currentYear}-01-01`, amount: '-99.00', category: { id: '9', name: 'Internal', hidden: true } },
      { bookingDate: `${previousYear}-07-01`, amount: '-7.00', category: { id: '2', name: 'Travel', hidden: false } },
      { bookingDate: `${currentYear}-02-01`, amount: '-1.00', category: { id: '2', name: 'Travel', hidden: false } },
    ]));

    const wrapper = await mountSuspended(Analytics);
    await wrapper.get('[data-testid="view-years"]').setValue(true);

    const panels = wrapper.findAll('[data-testid="year-panel"]');
    expect(panels.map((panel) => panel.attributes('data-year-key')))
      .toEqual([String(currentYear), String(previousYear), String(oldestYear)]);
    expect(panels[0]?.findAll('[data-testid="category-total"]').map((item) => item.text()))
      .toEqual([`Travel${formatEuroAmount('1.00')}`]);
    expect(panels[1]?.findAll('[data-testid="category-total"]').map((item) => item.text()))
      .toEqual([`Travel${formatEuroAmount('7.00')}`]);
    expect(panels[2]?.findAll('[data-testid="category-total"]').map((item) => item.text()))
      .toEqual([`Groceries${formatEuroAmount('16.50')}`, `Uncategorised${formatEuroAmount('3.25')}`]);
    expect(wrapper.text()).not.toContain('Internal');

    const charts = wrapper.findAllComponents({ name: 'VChart' });
    expect(charts).toHaveLength(3);
    expect(charts[2]?.props('option').series[0].data.map(({ name, amount }) => [name, amount]))
      .toEqual([['Groceries', '16.50'], ['Uncategorised', '3.25']]);
    expect(mocks.useFetch).toHaveBeenCalledTimes(1);
  });

  it('links year headings and category totals to matching year transactions', async () => {
    const year = new Date().getFullYear() - 2;
    mocks.useFetch.mockReturnValue(response([
      { bookingDate: `${year}-05-01`, amount: '-10.00', category: { id: '7', name: 'Groceries', hidden: false } },
      { bookingDate: `${year}-05-02`, amount: '-2.00', category: null },
    ]));

    const wrapper = await mountSuspended(Analytics);
    await wrapper.get('[data-testid="view-years"]').setValue(true);

    const yearLink = wrapper.get('[data-testid="year-link"]');
    const yearTarget = new URL(yearLink.attributes('href'), 'http://localhost');
    expect(yearTarget.pathname).toBe('/');
    expect(yearTarget.searchParams.get('year')).toBe(String(year));
    expect(yearTarget.searchParams.get('category')).toBe('all');

    const links = wrapper.findAll('[data-testid="category-transaction-link"]');
    const targets = links.map((link) => new URL(link.attributes('href'), 'http://localhost'));
    expect(targets.map((target) => [target.searchParams.get('year'), target.searchParams.get('category')]))
      .toEqual([[String(year), '7'], [String(year), 'uncategorised']]);

    const chart = wrapper.findAllComponents({ name: 'VChart' })[0];
    if (chart === undefined) {
      throw new Error('expected current year pie chart');
    }
    const push = vi.spyOn(wrapper.vm.$router, 'push');
    const emitSlice = async (key: string) => {
      chart.vm.$emit('click', { data: { key } });
      await flushPromises();
    };

    await emitSlice('category:7');
    expect(push).toHaveBeenLastCalledWith({
      path: '/',
      query: { year: String(year), category: '7' },
    });

    await emitSlice('uncategorised');
    expect(push).toHaveBeenLastCalledWith({
      path: '/',
      query: { year: String(year), category: 'uncategorised' },
    });
    expect(mocks.useFetch).toHaveBeenCalledTimes(1);
  });

  it('hides uncategorised across year panels and keeps the setting when switching views', async () => {
    const today = getLocalDateString(new Date());
    const year = new Date().getFullYear() - 2;
    mocks.useFetch.mockReturnValue(response([
      { bookingDate: `${year}-05-01`, amount: '-10.00', category: { id: '1', name: 'Groceries', hidden: false } },
      { bookingDate: `${year}-05-02`, amount: '-2.00', category: null },
      { bookingDate: today, amount: '-5.00', category: null },
    ]));

    const wrapper = await mountSuspended(Analytics);
    await wrapper.get('[data-testid="view-years"]').setValue(true);
    await wrapper.get('[data-testid="hide-uncategorised"]').setValue(true);

    const panels = wrapper.findAll('[data-testid="year-panel"]');
    expect(panels.map((panel) => panel.attributes('data-year-key')))
      .toEqual([String(new Date().getFullYear()), String(year)]);
    expect(panels[0]?.findAll('[data-testid="category-total"]')).toHaveLength(0);
    expect(panels[0]?.text()).toContain(`No category data for ${new Date().getFullYear()}`);
    expect(panels[1]?.findAll('[data-testid="category-total"]').map((item) => item.text()))
      .toEqual([`Groceries${formatEuroAmount('10.00')}`]);

    await wrapper.get('[data-testid="view-months"]').setValue(true);
    expect((wrapper.get('[data-testid="hide-uncategorised"]').element as HTMLInputElement).checked).toBe(true);
    expect(wrapper.findAll('[data-testid="category-total"]').map((item) => item.text()))
      .not.toContain(`Uncategorised${formatEuroAmount('5.00')}`);
    expect(mocks.useFetch).toHaveBeenCalledTimes(1);
  });

  it('shows no year panels and an explanation when no year has eligible data', async () => {
    mocks.useFetch.mockReturnValue(response([
      { bookingDate: '2024-05-01', amount: '-9.00', category: { id: '9', name: 'Internal', hidden: true } },
    ]));

    const wrapper = await mountSuspended(Analytics);
    await wrapper.get('[data-testid="view-years"]').setValue(true);

    expect(wrapper.findAll('[data-testid="year-panel"]')).toHaveLength(0);
    expect(wrapper.get('[data-testid="no-year-data"]').text()).toContain('No category data for any year');
  });

  it('keeps each category color when switching between views', async () => {
    const today = getLocalDateString(new Date());
    mocks.useFetch.mockReturnValue(response([
      { bookingDate: today, amount: '-10.00', category: { id: '1', name: 'Groceries', hidden: false } },
    ]));

    const wrapper = await mountSuspended(Analytics);
    const monthlyColor = wrapper.get('[data-testid="month-panel"] [data-testid="category-color"]')
      .element.style.backgroundColor;

    await wrapper.get('[data-testid="view-years"]').setValue(true);
    const yearlyColor = wrapper.get('[data-testid="year-panel"] [data-testid="category-color"]')
      .element.style.backgroundColor;

    expect(yearlyColor).toBe(monthlyColor);
  });
});
