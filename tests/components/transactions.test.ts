import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';

const mocks = vi.hoisted(() => ({ useFetch: vi.fn() }));

mockNuxtImport('useFetch', () => mocks.useFetch);

import Transactions from '../../app/pages/index.vue';
import { formatEuroAmount } from '../../app/utils/category-spending';

type TestTransaction = {
  id: string;
  bookingDate: string;
  valueDate: string;
  amount: string;
  purpose: string;
  counterpartyName: string;
  counterpartyAccount: string | null;
  category: { id: string; name: string; hidden: boolean } | null;
};

const transactions: TestTransaction[] = [
  {
    id: '4', bookingDate: '2026-03-03', valueDate: '2026-03-03', amount: '5.00',
    purpose: 'March travel', counterpartyName: 'Rail', counterpartyAccount: null,
    category: { id: '2', name: 'Travel', hidden: false },
  },
  {
    id: '3', bookingDate: '2026-02-20', valueDate: '2026-02-19', amount: '4.00',
    purpose: 'February travel', counterpartyName: 'Rail', counterpartyAccount: null,
    category: { id: '2', name: 'Travel', hidden: false },
  },
  {
    id: '2', bookingDate: '2026-02-15', valueDate: '2026-02-15', amount: '-12.50',
    purpose: 'Groceries', counterpartyName: 'Market', counterpartyAccount: null,
    category: { id: '1', name: 'Groceries', hidden: false },
  },
  {
    id: '5', bookingDate: '2026-02-10', valueDate: '2026-02-10', amount: '-9.99',
    purpose: 'Internal transfer', counterpartyName: 'Own account', counterpartyAccount: null,
    category: { id: '3', name: 'Internal', hidden: true },
  },
  {
    id: '1', bookingDate: '2026-02-01', valueDate: '2026-02-01', amount: '-0.25',
    purpose: 'Uncategorised purchase', counterpartyName: 'Shop', counterpartyAccount: null,
    category: null,
  },
];

function response(data: TestTransaction[]) {
  return { data: ref(data), error: ref(null), pending: ref(false) };
}

describe('transaction list filters', () => {
  beforeEach(() => {
    mocks.useFetch.mockReset();
    mocks.useFetch.mockReturnValue(response(transactions));
  });

  it('defaults to uncategorised and retains full-response counts and endpoint order', async () => {
    const wrapper = await mountSuspended(Transactions);

    expect((wrapper.get('[data-testid="category-filter"]').element as HTMLSelectElement).value)
      .toBe('uncategorised');
    expect((wrapper.get('[data-testid="month-filter"]').element as HTMLSelectElement).value)
      .toBe('all');
    expect(wrapper.findAll('tbody tr').map((row) => row.attributes('data-transaction-id')))
      .toEqual(['1']);
    expect(wrapper.get('[data-testid="visible-total"]').text()).toContain(formatEuroAmount('-0.25'));
    expect(wrapper.get('[data-testid="category-filter"]').text()).toContain('All categories (5)');
    expect(wrapper.get('[data-testid="category-filter"]').text()).toContain('Uncategorised (1)');
    expect(mocks.useFetch).toHaveBeenCalledTimes(1);
  });

  it('gives both filters a full-width mobile layout and touch-sized control height', async () => {
    const wrapper = await mountSuspended(Transactions);

    for (const selector of ['[data-testid="category-filter"]', '[data-testid="month-filter"]']) {
      const filter = wrapper.get(selector);
      expect(filter.classes()).toContain('min-h-11');
      expect(filter.classes()).toContain('w-full');
      expect(filter.classes()).toContain('sm:w-auto');
    }
  });

  it('labels the transaction table scroll region and makes it keyboard reachable', async () => {
    const wrapper = await mountSuspended(Transactions);
    const region = wrapper.get('[data-testid="transactions-scroll"]');

    expect(region.attributes('role')).toBe('region');
    expect(region.attributes('aria-label')).toBe('Transactions table');
    expect(region.attributes('tabindex')).toBe('0');
    expect(region.classes()).toContain('overflow-x-auto');
    expect(region.get('table').classes()).toContain('w-max');
  });

  it('keeps a hidden category and its transactions visible in the list and filter', async () => {
    const wrapper = await mountSuspended(Transactions);
    const categoryFilter = wrapper.get('[data-testid="category-filter"]');

    expect(categoryFilter.text()).toContain('Internal');

    await categoryFilter.setValue('3');
    await flushPromises();

    expect(wrapper.findAll('tbody tr').map((row) => row.attributes('data-transaction-id')))
      .toEqual(['5']);
    expect(wrapper.text()).toContain('Internal transfer');
    expect(mocks.useFetch).toHaveBeenCalledTimes(1);
  });

  it('initializes category and month from a direct filter link', async () => {
    const wrapper = await mountSuspended(Transactions, {
      route: '/?category=1&month=2026-02',
    });

    expect((wrapper.get('[data-testid="category-filter"]').element as HTMLSelectElement).value)
      .toBe('1');
    expect((wrapper.get('[data-testid="month-filter"]').element as HTMLSelectElement).value)
      .toBe('2026-02');
    expect(wrapper.findAll('tbody tr').map((row) => row.attributes('data-transaction-id')))
      .toEqual(['2']);
    expect(wrapper.get('[data-testid="visible-total"]').text()).toContain(formatEuroAmount('-12.50'));
    expect(wrapper.findAll('tbody tr')[0]?.findAll('td')[2]?.text()).toBe('-12.50');
    expect(mocks.useFetch).toHaveBeenCalledTimes(1);
  });

  it('composes filter selections, preserves row order, and reflects them in the route query', async () => {
    const wrapper = await mountSuspended(Transactions);
    const categoryFilter = wrapper.get('[data-testid="category-filter"]');
    const monthFilter = wrapper.get('[data-testid="month-filter"]');
    const replace = vi.spyOn(wrapper.vm.$router, 'replace');

    await categoryFilter.setValue('all');
    await flushPromises();
    expect((categoryFilter.element as HTMLSelectElement).value).toBe('all');
    expect(replace).toHaveBeenCalledWith({ path: '/', query: { category: 'all' } });
    await monthFilter.setValue('2026-02');
    await flushPromises();
    expect((monthFilter.element as HTMLSelectElement).value).toBe('2026-02');
    expect(wrapper.findAll('tbody tr').map((row) => row.attributes('data-transaction-id')))
      .toEqual(['3', '2', '5', '1']);
    expect(wrapper.get('[data-testid="visible-total"]').text()).toContain(formatEuroAmount('-18.74'));

    await categoryFilter.setValue('2');
    await flushPromises();
    expect(wrapper.findAll('tbody tr').map((row) => row.attributes('data-transaction-id')))
      .toEqual(['3']);
    expect(wrapper.get('[data-testid="visible-total"]').text()).toContain(formatEuroAmount('4.00'));

    await categoryFilter.setValue('uncategorised');
    expect(wrapper.findAll('tbody tr').map((row) => row.attributes('data-transaction-id')))
      .toEqual(['1']);
    expect(wrapper.get('[data-testid="visible-total"]').text()).toContain(formatEuroAmount('-0.25'));
    await monthFilter.setValue('all');
    await flushPromises();
    expect((monthFilter.element as HTMLSelectElement).value).toBe('all');
    expect(mocks.useFetch).toHaveBeenCalledTimes(1);

    await categoryFilter.setValue('1');
    await flushPromises();
    await monthFilter.setValue('2026-03');
    await flushPromises();
    expect(wrapper.findAll('tbody tr')).toHaveLength(0);
    expect(wrapper.get('[data-testid="visible-total"]').text()).toContain(formatEuroAmount('0'));
  });

  it('falls back safely for unknown query values', async () => {
    const wrapper = await mountSuspended(Transactions, {
      route: '/?category=missing&month=2026-13',
    });

    expect((wrapper.get('[data-testid="category-filter"]').element as HTMLSelectElement).value)
      .toBe('uncategorised');
    expect((wrapper.get('[data-testid="month-filter"]').element as HTMLSelectElement).value)
      .toBe('all');
    expect(wrapper.findAll('tbody tr').map((row) => row.attributes('data-transaction-id')))
      .toEqual(['1']);
  });
});
