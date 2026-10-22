import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';

const mocks = vi.hoisted(() => ({ useFetch: vi.fn(), fetch: vi.fn() }));

mockNuxtImport('useFetch', () => mocks.useFetch);
mockNuxtImport('$fetch', () => mocks.fetch);

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
  categoryAssignment: 'manual' | 'automatic';
  category: { id: string; name: string; hidden: boolean } | null;
};

const transactions: TestTransaction[] = [
  {
    id: '4', bookingDate: '2026-03-03', valueDate: '2026-03-03', amount: '5.00',
    purpose: 'March travel', counterpartyName: 'Rail', counterpartyAccount: null,
    categoryAssignment: 'automatic',
    category: { id: '2', name: 'Travel', hidden: false },
  },
  {
    id: '3', bookingDate: '2026-02-20', valueDate: '2026-02-19', amount: '4.00',
    purpose: 'February travel', counterpartyName: 'Rail', counterpartyAccount: null,
    categoryAssignment: 'automatic',
    category: { id: '2', name: 'Travel', hidden: false },
  },
  {
    id: '2', bookingDate: '2026-02-15', valueDate: '2026-02-15', amount: '-12.50',
    purpose: 'Groceries', counterpartyName: 'Market', counterpartyAccount: null,
    categoryAssignment: 'manual',
    category: { id: '1', name: 'Groceries', hidden: false },
  },
  {
    id: '5', bookingDate: '2026-02-10', valueDate: '2026-02-10', amount: '-9.99',
    purpose: 'Internal transfer', counterpartyName: 'Own account', counterpartyAccount: null,
    categoryAssignment: 'automatic',
    category: { id: '3', name: 'Internal', hidden: true },
  },
  {
    id: '1', bookingDate: '2026-02-01', valueDate: '2026-02-01', amount: '-0.25',
    purpose: 'Uncategorised purchase', counterpartyName: 'Shop', counterpartyAccount: null,
    categoryAssignment: 'automatic',
    category: null,
  },
];

const storedCategories = [
  { id: '1', name: 'Groceries', patterns: ['market'], hidden: false, windows: [] },
  { id: '2', name: 'Travel', patterns: ['travel'], hidden: false, windows: [] },
  { id: '3', name: 'Internal', patterns: ['internal'], hidden: true, windows: [] },
];

// Sorting exercises values the filter fixture does not carry: distinct booking
// and value dates, mixed-case text, equal comparisons, and a missing account
// alongside a missing category. The array order is the endpoint order.
const sortingTransactions: TestTransaction[] = [
  {
    id: 'a', bookingDate: '2026-01-03', valueDate: '2026-01-01', amount: '-2.00',
    purpose: 'beta', counterpartyName: 'Zeta', counterpartyAccount: 'AT2',
    categoryAssignment: 'automatic',
    category: { id: '1', name: 'alpha', hidden: false },
  },
  {
    id: 'b', bookingDate: '2026-01-01', valueDate: '2026-01-03', amount: '10.00',
    purpose: 'Alpha', counterpartyName: 'alpha', counterpartyAccount: null,
    categoryAssignment: 'automatic',
    category: null,
  },
  {
    id: 'c', bookingDate: '2026-01-02', valueDate: '2026-01-02', amount: '-10.00',
    purpose: 'alpha', counterpartyName: 'Beta', counterpartyAccount: 'AT1',
    categoryAssignment: 'automatic',
    category: { id: '2', name: 'Beta', hidden: false },
  },
  {
    id: 'd', bookingDate: '2026-01-04', valueDate: '2026-01-04', amount: '2.00',
    purpose: 'Gamma', counterpartyName: 'beta', counterpartyAccount: 'AT1',
    categoryAssignment: 'automatic',
    category: { id: '1', name: 'alpha', hidden: false },
  },
];

function transactionsResponse(data: TestTransaction[]) {
  return { data: ref(data), error: ref(null), pending: ref(false) };
}

function categoriesResponse() {
  return { data: ref(storedCategories), error: ref(null), pending: ref(false) };
}

const mountedWrappers: Array<{ unmount: () => void }> = [];

async function mountTransactions(options?: { route?: string; attachTo?: Element }) {
  const wrapper = await mountSuspended(Transactions, options);
  mountedWrappers.push(wrapper);
  return wrapper;
}

let getSelection: ReturnType<typeof vi.spyOn>;

function fakeSelection(start: Node, end: Node, text: string): Selection {
  return {
    isCollapsed: text === '',
    rangeCount: 1,
    getRangeAt: () => ({ startContainer: start, endContainer: end }),
    toString: () => text,
  } as unknown as Selection;
}

function setSelection(start: Node, end: Node, text: string): void {
  getSelection.mockReturnValue(fakeSelection(start, end, text));
  document.dispatchEvent(new Event('selectionchange'));
}

function clearSelection(): void {
  getSelection.mockReturnValue(fakeSelection(document.body, document.body, ''));
  document.dispatchEvent(new Event('selectionchange'));
}

function purposeNode(wrapper: Awaited<ReturnType<typeof mountTransactions>>, transactionId: string): Node {
  return wrapper.get(`[data-transaction-id="${transactionId}"] td:nth-child(5)`).element.firstChild as Node;
}

function counterpartyNode(wrapper: Awaited<ReturnType<typeof mountTransactions>>, transactionId: string): Node {
  return wrapper.get(`[data-transaction-id="${transactionId}"] td:nth-child(6)`).element.firstChild as Node;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function fetchCalls(url: string): unknown[][] {
  return mocks.fetch.mock.calls.filter(([calledUrl]) => calledUrl === url);
}

describe('transaction list filters', () => {
  beforeEach(() => {
    mocks.useFetch.mockReset();
    mocks.fetch.mockReset();
    mocks.useFetch.mockImplementation((url: unknown) =>
      url === '/api/transactions' ? transactionsResponse(transactions) : categoriesResponse());
  });

  afterEach(() => {
    for (const wrapper of mountedWrappers.splice(0)) {
      wrapper.unmount();
    }
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('defaults to uncategorised and retains full-response counts and endpoint order', async () => {
    const wrapper = await mountTransactions();

    expect((wrapper.get('[data-testid="category-filter"]').element as HTMLSelectElement).value)
      .toBe('uncategorised');
    expect((wrapper.get('[data-testid="period-filter"]').element as HTMLSelectElement).value)
      .toBe('all');
    expect(wrapper.findAll('tbody tr').map((row) => row.attributes('data-transaction-id')))
      .toEqual(['1']);
    expect(wrapper.get('[data-testid="visible-total"]').text()).toContain(formatEuroAmount('-0.25'));
    expect(wrapper.get('[data-testid="visible-count"]').text()).toBe('1 transaction');
    expect(wrapper.get('[data-testid="category-filter"]').text()).toContain('All categories (5)');
    expect(wrapper.get('[data-testid="category-filter"]').text()).toContain('Uncategorised (1)');
    expect(mocks.useFetch).toHaveBeenCalledTimes(2);
  });

  it('gives both filters a full-width mobile layout and touch-sized control height', async () => {
    const wrapper = await mountTransactions();

    for (const selector of ['[data-testid="category-filter"]', '[data-testid="period-filter"]']) {
      const filter = wrapper.get(selector);
      expect(filter.classes()).toContain('min-h-11');
      expect(filter.classes()).toContain('w-full');
      expect(filter.classes()).toContain('sm:w-auto');
    }
  });

  it('labels the transaction table scroll region and makes it keyboard reachable', async () => {
    const wrapper = await mountTransactions();
    const region = wrapper.get('[data-testid="transactions-scroll"]');

    expect(region.attributes('role')).toBe('region');
    expect(region.attributes('aria-label')).toBe('Transactions table');
    expect(region.attributes('tabindex')).toBe('0');
    expect(region.classes()).toContain('overflow-x-auto');
    expect(region.get('table').classes()).toContain('w-max');
  });

  it('keeps a hidden category and its transactions visible in the list and filter', async () => {
    const wrapper = await mountTransactions();
    const categoryFilter = wrapper.get('[data-testid="category-filter"]');

    expect(categoryFilter.text()).toContain('Internal');

    await categoryFilter.setValue('3');
    await flushPromises();

    expect(wrapper.findAll('tbody tr').map((row) => row.attributes('data-transaction-id')))
      .toEqual(['5']);
    expect(wrapper.text()).toContain('Internal transfer');
    expect(mocks.useFetch).toHaveBeenCalledTimes(2);
  });

  it('initializes category and month from a direct filter link', async () => {
    const wrapper = await mountTransactions({ route: '/?category=1&month=2026-02' });

    expect((wrapper.get('[data-testid="category-filter"]').element as HTMLSelectElement).value)
      .toBe('1');
    expect((wrapper.get('[data-testid="period-filter"]').element as HTMLSelectElement).value)
      .toBe('2026-02');
    expect(wrapper.findAll('tbody tr').map((row) => row.attributes('data-transaction-id')))
      .toEqual(['2']);
    expect(wrapper.get('[data-testid="visible-total"]').text()).toContain(formatEuroAmount('-12.50'));
    expect(wrapper.get('[data-testid="visible-count"]').text()).toBe('1 transaction');
    expect(wrapper.findAll('tbody tr')[0]?.findAll('td')[3]?.text()).toBe('-12.50');
    expect(mocks.useFetch).toHaveBeenCalledTimes(2);
  });

  it('composes filter selections, preserves row order, and reflects them in the route query', async () => {
    const wrapper = await mountTransactions();
    const categoryFilter = wrapper.get('[data-testid="category-filter"]');
    const periodFilter = wrapper.get('[data-testid="period-filter"]');
    const replace = vi.spyOn(wrapper.vm.$router, 'replace');

    await categoryFilter.setValue('all');
    await flushPromises();
    expect((categoryFilter.element as HTMLSelectElement).value).toBe('all');
    expect(replace).toHaveBeenCalledWith({ path: '/', query: { category: 'all' } });
    await periodFilter.setValue('2026-02');
    await flushPromises();
    expect((periodFilter.element as HTMLSelectElement).value).toBe('2026-02');
    expect(wrapper.findAll('tbody tr').map((row) => row.attributes('data-transaction-id')))
      .toEqual(['3', '2', '5', '1']);
    expect(wrapper.get('[data-testid="visible-total"]').text()).toContain(formatEuroAmount('-18.74'));
    expect(wrapper.get('[data-testid="visible-count"]').text()).toBe('4 transactions');

    await categoryFilter.setValue('2');
    await flushPromises();
    expect(wrapper.findAll('tbody tr').map((row) => row.attributes('data-transaction-id')))
      .toEqual(['3']);
    expect(wrapper.get('[data-testid="visible-total"]').text()).toContain(formatEuroAmount('4.00'));
    expect(wrapper.get('[data-testid="visible-count"]').text()).toBe('1 transaction');

    await categoryFilter.setValue('uncategorised');
    expect(wrapper.findAll('tbody tr').map((row) => row.attributes('data-transaction-id')))
      .toEqual(['1']);
    expect(wrapper.get('[data-testid="visible-total"]').text()).toContain(formatEuroAmount('-0.25'));
    await periodFilter.setValue('all');
    await flushPromises();
    expect((periodFilter.element as HTMLSelectElement).value).toBe('all');
    expect(mocks.useFetch).toHaveBeenCalledTimes(2);

    await categoryFilter.setValue('1');
    await flushPromises();
    await periodFilter.setValue('2026-03');
    await flushPromises();
    expect(wrapper.findAll('tbody tr')).toHaveLength(0);
    expect(wrapper.get('[data-testid="visible-total"]').text()).toContain(formatEuroAmount('0'));
    expect(wrapper.get('[data-testid="visible-count"]').text()).toBe('0 transactions');
  });

  it('falls back safely for unknown query values', async () => {
    const wrapper = await mountTransactions({ route: '/?category=missing&month=2026-13&year=1999' });

    expect((wrapper.get('[data-testid="category-filter"]').element as HTMLSelectElement).value)
      .toBe('uncategorised');
    expect((wrapper.get('[data-testid="period-filter"]').element as HTMLSelectElement).value)
      .toBe('all');
    expect(wrapper.findAll('tbody tr').map((row) => row.attributes('data-transaction-id')))
      .toEqual(['1']);
  });

  it('groups represented periods under Years and Months, newest first', async () => {
    const wrapper = await mountTransactions();

    const select = wrapper.get('[data-testid="period-filter"]');
    expect(select.findAll('option').map((option) => [option.attributes('value'), option.text()])).toEqual([
      ['all', 'All periods'],
      ['2026', '2026'],
      ['2026-03', 'March 2026'],
      ['2026-02', 'February 2026'],
    ]);

    const groups = select.findAll('optgroup');
    expect(groups.map((group) => group.attributes('label'))).toEqual(['Years', 'Months']);
    expect(groups[0]?.findAll('option').map((option) => [option.attributes('value'), option.text()]))
      .toEqual([['2026', '2026']]);
    expect(groups[1]?.findAll('option').map((option) => [option.attributes('value'), option.text()]))
      .toEqual([
        ['2026-03', 'March 2026'],
        ['2026-02', 'February 2026'],
      ]);
  });

  it('filters to a selected calendar year and excludes other years', async () => {
    const mixed: TestTransaction[] = [
      {
        id: '9', bookingDate: '2025-12-31', valueDate: '2025-12-31', amount: '-1.00',
        purpose: 'Old year', counterpartyName: 'Shop', counterpartyAccount: null,
        category: { id: '1', name: 'Groceries', hidden: false },
      },
      {
        id: '8', bookingDate: '2026-01-02', valueDate: '2026-01-02', amount: '-2.00',
        purpose: 'New year', counterpartyName: 'Shop', counterpartyAccount: null,
        category: { id: '1', name: 'Groceries', hidden: false },
      },
    ];
    mocks.useFetch.mockImplementation((url: unknown) =>
      url === '/api/transactions' ? transactionsResponse(mixed) : categoriesResponse());

    const wrapper = await mountTransactions();
    const periodFilter = wrapper.get('[data-testid="period-filter"]');
    const replace = vi.spyOn(wrapper.vm.$router, 'replace');

    expect(wrapper.findAll('[data-testid="period-filter"] option')
      .map((option) => option.attributes('value')))
      .toEqual(['all', '2026', '2025', '2026-01', '2025-12']);

    await wrapper.get('[data-testid="category-filter"]').setValue('all');
    await flushPromises();
    await periodFilter.setValue('2025');
    await flushPromises();

    expect((periodFilter.element as HTMLSelectElement).value).toBe('2025');
    const yearCall = replace.mock.calls.find(([location]) =>
      (location as { query?: Record<string, string> }).query?.year === '2025');
    expect(yearCall).toBeDefined();
    expect((yearCall?.[0] as { query: Record<string, string> }).query.month).toBeUndefined();
    expect(wrapper.findAll('tbody tr').map((row) => row.attributes('data-transaction-id')))
      .toEqual(['9']);
  });

  it('initializes the period filter from a year link', async () => {
    const wrapper = await mountTransactions({ route: '/?category=1&year=2026' });

    expect((wrapper.get('[data-testid="period-filter"]').element as HTMLSelectElement).value)
      .toBe('2026');
    expect(wrapper.findAll('tbody tr').map((row) => row.attributes('data-transaction-id')))
      .toEqual(['2']);
  });

  it('prefers an offered month over a year when both are in the query', async () => {
    const wrapper = await mountTransactions({ route: '/?category=1&month=2026-02&year=2026' });

    expect((wrapper.get('[data-testid="period-filter"]').element as HTMLSelectElement).value)
      .toBe('2026-02');
    expect(wrapper.findAll('tbody tr').map((row) => row.attributes('data-transaction-id')))
      .toEqual(['2']);
  });
});

describe('transaction sorting', () => {
  beforeEach(() => {
    mocks.useFetch.mockReset();
    mocks.fetch.mockReset();
    mocks.useFetch.mockImplementation((url: unknown) =>
      url === '/api/transactions' ? transactionsResponse(transactions) : categoriesResponse());
  });

  afterEach(() => {
    for (const wrapper of mountedWrappers.splice(0)) {
      wrapper.unmount();
    }
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function useSortingTransactions(): void {
    mocks.useFetch.mockImplementation((url: unknown) =>
      url === '/api/transactions'
        ? transactionsResponse(sortingTransactions)
        : categoriesResponse());
  }

  function shownIds(wrapper: Awaited<ReturnType<typeof mountTransactions>>): string[] {
    return wrapper.findAll('tbody tr')
      .map((row) => row.attributes('data-transaction-id') ?? '');
  }

  function headerCell(
    wrapper: Awaited<ReturnType<typeof mountTransactions>>,
    column: string,
  ): HTMLElement {
    return wrapper.get(`[data-testid="sort-${column}"]`).element.closest('th') as HTMLElement;
  }

  it('initializes a descending sort from the query and marks the header', async () => {
    useSortingTransactions();
    const wrapper = await mountTransactions({ route: '/?category=all&sort=amount&direction=desc' });

    expect(shownIds(wrapper)).toEqual(['b', 'd', 'a', 'c']);
    expect(headerCell(wrapper, 'amount').getAttribute('aria-sort')).toBe('descending');
  });

  it('falls back to the endpoint order for an unknown column', async () => {
    useSortingTransactions();
    const wrapper = await mountTransactions({ route: '/?category=all&sort=unknown&direction=desc' });

    expect(shownIds(wrapper)).toEqual(['a', 'b', 'c', 'd']);
    for (const column of ['bookingDate', 'valueDate', 'amount', 'purpose', 'counterpartyName', 'counterpartyAccount', 'category']) {
      expect(headerCell(wrapper, column).getAttribute('aria-sort')).toBe('none');
    }
  });

  it('defaults a recognized column with a missing or invalid direction to ascending', async () => {
    useSortingTransactions();
    const missing = await mountTransactions({ route: '/?category=all&sort=amount' });
    expect(shownIds(missing)).toEqual(['c', 'a', 'd', 'b']);
    expect(headerCell(missing, 'amount').getAttribute('aria-sort')).toBe('ascending');

    const invalid = await mountTransactions({ route: '/?category=all&sort=amount&direction=sideways' });
    expect(shownIds(invalid)).toEqual(['c', 'a', 'd', 'b']);
    expect(headerCell(invalid, 'amount').getAttribute('aria-sort')).toBe('ascending');
  });

  it('sorts amounts by signed numeric value instead of text', async () => {
    useSortingTransactions();
    const wrapper = await mountTransactions({ route: '/?category=all&sort=amount&direction=asc' });

    expect(shownIds(wrapper)).toEqual(['c', 'a', 'd', 'b']);
  });

  it('sorts booking and value dates independently and chronologically', async () => {
    useSortingTransactions();
    const booking = await mountTransactions({ route: '/?category=all&sort=bookingDate&direction=asc' });
    expect(shownIds(booking)).toEqual(['b', 'c', 'a', 'd']);

    const value = await mountTransactions({ route: '/?category=all&sort=valueDate&direction=asc' });
    expect(shownIds(value)).toEqual(['a', 'c', 'b', 'd']);
  });

  it('sorts text without case sensitivity', async () => {
    useSortingTransactions();
    const purpose = await mountTransactions({ route: '/?category=all&sort=purpose&direction=asc' });
    expect(shownIds(purpose)).toEqual(['b', 'c', 'a', 'd']);

    const counterparty = await mountTransactions({ route: '/?category=all&sort=counterpartyName&direction=asc' });
    expect(shownIds(counterparty)).toEqual(['b', 'c', 'd', 'a']);
  });

  it('sorts rows without an account or category last in both directions', async () => {
    useSortingTransactions();
    const accountAscending = await mountTransactions({ route: '/?category=all&sort=counterpartyAccount&direction=asc' });
    expect(shownIds(accountAscending)).toEqual(['c', 'd', 'a', 'b']);

    const accountDescending = await mountTransactions({ route: '/?category=all&sort=counterpartyAccount&direction=desc' });
    expect(shownIds(accountDescending)).toEqual(['a', 'c', 'd', 'b']);

    const categoryAscending = await mountTransactions({ route: '/?category=all&sort=category&direction=asc' });
    expect(shownIds(categoryAscending)).toEqual(['a', 'd', 'c', 'b']);

    const categoryDescending = await mountTransactions({ route: '/?category=all&sort=category&direction=desc' });
    expect(shownIds(categoryDescending)).toEqual(['c', 'a', 'd', 'b']);
  });

  it('keeps the endpoint order for rows that compare equal', async () => {
    useSortingTransactions();
    const wrapper = await mountTransactions({ route: '/?category=all&sort=purpose&direction=asc' });

    expect(shownIds(wrapper)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('starts a new column ascending and toggles the active column', async () => {
    useSortingTransactions();
    const wrapper = await mountTransactions({ route: '/?category=all' });

    await wrapper.get('[data-testid="sort-amount"]').trigger('click');
    expect(shownIds(wrapper)).toEqual(['c', 'a', 'd', 'b']);
    expect(headerCell(wrapper, 'amount').getAttribute('aria-sort')).toBe('ascending');

    await wrapper.get('[data-testid="sort-amount"]').trigger('click');
    expect(shownIds(wrapper)).toEqual(['b', 'd', 'a', 'c']);
    expect(headerCell(wrapper, 'amount').getAttribute('aria-sort')).toBe('descending');

    await wrapper.get('[data-testid="sort-purpose"]').trigger('click');
    expect(shownIds(wrapper)).toEqual(['b', 'c', 'a', 'd']);
    expect(headerCell(wrapper, 'purpose').getAttribute('aria-sort')).toBe('ascending');
    expect(headerCell(wrapper, 'amount').getAttribute('aria-sort')).toBe('none');
    expect(mocks.useFetch).toHaveBeenCalledTimes(2);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it('renders a button in every value header and leaves the selection header unsorted', async () => {
    useSortingTransactions();
    const wrapper = await mountTransactions({ route: '/?category=all' });
    const headers = wrapper.findAll('thead th');

    expect(headers).toHaveLength(8);
    expect(headers[0]?.attributes('aria-sort')).toBeUndefined();
    expect(headers[0]?.find('[data-testid="select-all-visible"]').exists()).toBe(true);
    expect(wrapper.findAll('thead th button')).toHaveLength(7);
    for (const button of wrapper.findAll('thead th button')) {
      expect(button.attributes('type')).toBe('button');
      expect(button.classes()).toContain('min-h-11');
    }
    for (const column of ['bookingDate', 'valueDate', 'amount', 'purpose', 'counterpartyName', 'counterpartyAccount', 'category']) {
      expect(headerCell(wrapper, column).getAttribute('aria-sort')).toBe('none');
    }
  });

  it('updates the route query and preserves the existing filters', async () => {
    useSortingTransactions();
    const wrapper = await mountTransactions({ route: '/?category=all&month=2026-01' });
    const replace = vi.spyOn(wrapper.vm.$router, 'replace');

    await wrapper.get('[data-testid="sort-purpose"]').trigger('click');

    expect(replace).toHaveBeenCalledWith({
      path: '/',
      query: {
        category: 'all',
        month: '2026-01',
        sort: 'purpose',
        direction: 'asc',
      },
    });
  });

  it('keeps the sort when a filter changes and leaves the summary unchanged', async () => {
    useSortingTransactions();
    const wrapper = await mountTransactions({ route: '/?category=all&sort=amount&direction=asc' });
    const totalBefore = wrapper.get('[data-testid="visible-total"]').text();
    const countBefore = wrapper.get('[data-testid="visible-count"]').text();
    const replace = vi.spyOn(wrapper.vm.$router, 'replace');

    expect(shownIds(wrapper)).toEqual(['c', 'a', 'd', 'b']);

    await wrapper.get('[data-testid="sort-purpose"]').trigger('click');
    expect(shownIds(wrapper)).toEqual(['b', 'c', 'a', 'd']);
    expect(wrapper.get('[data-testid="visible-total"]').text()).toBe(totalBefore);
    expect(wrapper.get('[data-testid="visible-count"]').text()).toBe(countBefore);

    await wrapper.get('[data-testid="category-filter"]').setValue('2');
    await flushPromises();

    expect(shownIds(wrapper)).toEqual(['c']);
    expect(headerCell(wrapper, 'purpose').getAttribute('aria-sort')).toBe('ascending');
    const lastCall = replace.mock.calls.at(-1)?.[0] as { query: Record<string, string> };
    expect(lastCall.query).toEqual({
      category: '2',
      sort: 'purpose',
      direction: 'asc',
    });
    expect(mocks.useFetch).toHaveBeenCalledTimes(2);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it('keeps row selection attached to the transaction after sorting', async () => {
    useSortingTransactions();
    const wrapper = await mountTransactions({ route: '/?category=all&sort=amount&direction=asc' });

    expect(shownIds(wrapper)).toEqual(['c', 'a', 'd', 'b']);
    await wrapper.get('[data-transaction-id="c"] [data-testid="row-select"]').setValue(true);

    expect(wrapper.get('[data-testid="bulk-assignment-bar"]').text()).toContain('1 transaction selected');
  });
});

describe('transaction pattern shortcut', () => {
  beforeEach(() => {
    mocks.useFetch.mockReset();
    mocks.fetch.mockReset();
    mocks.useFetch.mockImplementation((url: unknown) =>
      url === '/api/transactions' ? transactionsResponse(transactions) : categoriesResponse());
    getSelection = vi.spyOn(window, 'getSelection').mockReturnValue(null as unknown as Selection);
  });

  afterEach(() => {
    for (const wrapper of mountedWrappers.splice(0)) {
      wrapper.unmount();
    }
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shows the bar with the captured text and the stored categories for a valid selection', async () => {
    mocks.fetch.mockImplementation((url: string) =>
      url === '/api/categories/literal-match-count' ? Promise.resolve({ count: 12 }) : Promise.reject(new Error('unexpected request')));
    const wrapper = await mountTransactions();

    setSelection(purposeNode(wrapper, '1'), purposeNode(wrapper, '1'), 'Uncategorised purchase');
    await wait(300);
    await flushPromises();

    expect(wrapper.get('[data-testid="pattern-shortcut-text"]').text()).toBe('Uncategorised purchase');
    const options = wrapper.findAll('[data-testid="pattern-shortcut-category"] option');
    expect(options.map((option) => option.text())).toEqual([
      'Choose a category',
      'Groceries',
      'Internal (hidden)',
      'Travel',
    ]);
    expect(wrapper.get('[data-testid="pattern-shortcut-preview"]').text()).toContain('Matches 12 stored transactions');
  });

  it('shows no bar for a short selection, a multi-cell selection, or a selection outside the table', async () => {
    const wrapper = await mountTransactions();

    setSelection(purposeNode(wrapper, '1'), purposeNode(wrapper, '1'), 'Un');
    await flushPromises();
    expect(wrapper.find('[data-testid="pattern-shortcut-bar"]').exists()).toBe(false);

    setSelection(purposeNode(wrapper, '1'), counterpartyNode(wrapper, '1'), 'Uncategorised purchaseShop');
    await flushPromises();
    expect(wrapper.find('[data-testid="pattern-shortcut-bar"]').exists()).toBe(false);

    setSelection(document.body, document.body, 'Somewhere else entirely');
    await flushPromises();
    expect(wrapper.find('[data-testid="pattern-shortcut-bar"]').exists()).toBe(false);
  });

  it('hides the bar when the selection is cleared and on Escape', async () => {
    const wrapper = await mountTransactions();

    setSelection(purposeNode(wrapper, '1'), purposeNode(wrapper, '1'), 'Uncategorised purchase');
    await flushPromises();
    expect(wrapper.find('[data-testid="pattern-shortcut-text"]').exists()).toBe(true);

    clearSelection();
    await flushPromises();
    expect(wrapper.find('[data-testid="pattern-shortcut-bar"]').exists()).toBe(false);

    setSelection(purposeNode(wrapper, '1'), purposeNode(wrapper, '1'), 'Uncategorised purchase');
    await flushPromises();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await flushPromises();
    expect(wrapper.find('[data-testid="pattern-shortcut-bar"]').exists()).toBe(false);
  });

  it('keeps the captured text while the bar own control holds focus', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    try {
      const wrapper = await mountTransactions({ attachTo: container });

      setSelection(purposeNode(wrapper, '1'), purposeNode(wrapper, '1'), 'Uncategorised purchase');
      await flushPromises();
      wrapper.get('[data-testid="pattern-shortcut-category"]').element.focus();

      clearSelection();
      await flushPromises();

      expect(wrapper.get('[data-testid="pattern-shortcut-text"]').text()).toBe('Uncategorised purchase');
    } finally {
      container.remove();
    }
  });

  it('reports an unavailable preview instead of a fabricated count', async () => {
    mocks.fetch.mockRejectedValue(new Error('preview failed'));
    const wrapper = await mountTransactions();

    setSelection(purposeNode(wrapper, '1'), purposeNode(wrapper, '1'), 'Uncategorised purchase');
    await wait(300);
    await flushPromises();

    expect(wrapper.get('[data-testid="pattern-shortcut-preview"]').text()).toContain('Match count unavailable');
    expect(wrapper.get('[data-testid="pattern-shortcut-category"]').attributes('disabled')).toBeUndefined();
  });

  it('appends the captured text to the chosen category and reports the result', async () => {
    mocks.fetch.mockImplementation((url: string) => {
      if (url === '/api/categories/1/patterns') {
        return Promise.resolve({
          category: { id: '1', name: 'Groceries', patterns: ['market', 'Uncategorised purchase'], hidden: false, windows: [] },
          added: true,
        });
      }
      if (url === '/api/transactions') {
        return Promise.resolve(transactions);
      }
      return Promise.resolve({ count: 0 });
    });
    const wrapper = await mountTransactions();

    setSelection(purposeNode(wrapper, '1'), purposeNode(wrapper, '1'), 'Uncategorised purchase');
    await flushPromises();
    await wrapper.get('[data-testid="pattern-shortcut-category"]').setValue('1');
    await flushPromises();

    expect(mocks.fetch).toHaveBeenCalledWith('/api/categories/1/patterns', {
      method: 'POST',
      body: { text: 'Uncategorised purchase' },
    });
    expect(wrapper.get('[data-testid="pattern-shortcut-status"]').text()).toBe('Added to Groceries');
    expect(wrapper.find('[data-testid="pattern-shortcut-text"]').exists()).toBe(false);
  });

  it('reports an already-stored pattern rather than claiming a new one', async () => {
    mocks.fetch.mockImplementation((url: string) => {
      if (url === '/api/categories/1/patterns') {
        return Promise.resolve({
          category: { id: '1', name: 'Groceries', patterns: ['market'], hidden: false, windows: [] },
          added: false,
        });
      }
      return Promise.resolve(transactions);
    });
    const wrapper = await mountTransactions();

    setSelection(purposeNode(wrapper, '1'), purposeNode(wrapper, '1'), 'Uncategorised purchase');
    await flushPromises();
    await wrapper.get('[data-testid="pattern-shortcut-category"]').setValue('1');
    await flushPromises();

    expect(wrapper.get('[data-testid="pattern-shortcut-status"]').text()).toBe('Already in Groceries');
  });

  it('keeps the bar with the captured text when the append fails', async () => {
    mocks.fetch.mockImplementation((url: string) => {
      if (url === '/api/categories/1/patterns') {
        return Promise.reject({ data: { message: 'the pattern request could not be completed' } });
      }
      return Promise.resolve({ count: 0 });
    });
    const wrapper = await mountTransactions();

    setSelection(purposeNode(wrapper, '1'), purposeNode(wrapper, '1'), 'Uncategorised purchase');
    await flushPromises();
    await wrapper.get('[data-testid="pattern-shortcut-category"]').setValue('1');
    await flushPromises();

    const status = wrapper.get('[data-testid="pattern-shortcut-status"]');
    expect(status.text()).toContain('Could not add to Groceries');
    expect(status.classes()).toContain('text-failure');
    expect(wrapper.get('[data-testid="pattern-shortcut-text"]').text()).toBe('Uncategorised purchase');
  });

  it('marks the affected row while the append is in flight and clears it after the refresh', async () => {
    const append = deferred<{ category: unknown; added: boolean }>();
    const refreshed = [
      { ...transactions[4], category: { id: '1', name: 'Groceries', hidden: false } },
      ...transactions.slice(0, 4),
    ];
    mocks.fetch.mockImplementation((url: string) => {
      if (url === '/api/categories/1/patterns') {
        return append.promise;
      }
      if (url === '/api/transactions') {
        return Promise.resolve(refreshed);
      }
      return Promise.resolve({ count: 0 });
    });
    const wrapper = await mountTransactions();

    await wrapper.get('[data-testid="category-filter"]').setValue('all');
    await flushPromises();

    setSelection(purposeNode(wrapper, '1'), purposeNode(wrapper, '1'), 'Uncategorised purchase');
    await flushPromises();
    await wrapper.get('[data-testid="pattern-shortcut-category"]').setValue('1');
    await flushPromises();

    expect(wrapper.get('[data-transaction-id="1"]').attributes('aria-busy')).toBe('true');
    expect(wrapper.get('[data-testid="row-updating"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="pattern-shortcut-status"]').text()).toBe('1 update applying…');
    expect(fetchCalls('/api/transactions')).toHaveLength(0);

    append.resolve({
      category: { id: '1', name: 'Groceries', patterns: ['market', 'Uncategorised purchase'], hidden: false, windows: [] },
      added: true,
    });
    await flushPromises();
    await wait(350);
    await flushPromises();

    expect(fetchCalls('/api/transactions')).toHaveLength(1);
    expect(wrapper.find('[data-testid="row-updating"]').exists()).toBe(false);
    expect(wrapper.get('[data-transaction-id="1"]').attributes('aria-busy')).toBeUndefined();
    expect((wrapper.get('[data-transaction-id="1"] [data-testid="row-category-select"]').element as HTMLSelectElement).value)
      .toBe('1');
  });

  it('coalesces several overlapping appends into one refresh', async () => {
    const first = deferred<{ category: unknown; added: boolean }>();
    const second = deferred<{ category: unknown; added: boolean }>();
    mocks.fetch.mockImplementation((url: string) => {
      if (url === '/api/categories/1/patterns') {
        return first.promise;
      }
      if (url === '/api/categories/2/patterns') {
        return second.promise;
      }
      return Promise.resolve(transactions);
    });
    const wrapper = await mountTransactions();

    await wrapper.get('[data-testid="category-filter"]').setValue('all');
    await flushPromises();

    setSelection(purposeNode(wrapper, '1'), purposeNode(wrapper, '1'), 'Uncategorised purchase');
    await flushPromises();
    await wrapper.get('[data-testid="pattern-shortcut-category"]').setValue('1');
    await flushPromises();
    expect(wrapper.get('[data-testid="pattern-shortcut-status"]').text()).toBe('1 update applying…');

    setSelection(purposeNode(wrapper, '3'), purposeNode(wrapper, '3'), 'February travel');
    await flushPromises();
    await wrapper.get('[data-testid="pattern-shortcut-category"]').setValue('2');
    await flushPromises();
    expect(wrapper.get('[data-testid="pattern-shortcut-status"]').text()).toBe('2 updates applying…');

    first.resolve({ category: { id: '1', name: 'Groceries', patterns: [], hidden: false, windows: [] }, added: true });
    await flushPromises();
    expect(fetchCalls('/api/transactions')).toHaveLength(0);

    second.resolve({ category: { id: '2', name: 'Travel', patterns: [], hidden: false, windows: [] }, added: true });
    await flushPromises();
    await wait(350);
    await flushPromises();

    expect(fetchCalls('/api/transactions')).toHaveLength(1);
  });

  it('ignores a superseded refresh response', async () => {
    const refreshes = [deferred<TestTransaction[]>(), deferred<TestTransaction[]>()];
    let refreshIndex = 0;
    mocks.fetch.mockImplementation((url: string) => {
      if (url === '/api/categories/1/patterns' || url === '/api/categories/2/patterns') {
        return Promise.resolve({
          category: { id: '1', name: 'Groceries', patterns: [], hidden: false, windows: [] },
          added: true,
        });
      }
      if (url === '/api/transactions') {
        return refreshes[refreshIndex++]?.promise ?? Promise.resolve(transactions);
      }
      return Promise.resolve({ count: 0 });
    });
    const wrapper = await mountTransactions();
    await wrapper.get('[data-testid="category-filter"]').setValue('all');
    await flushPromises();

    setSelection(purposeNode(wrapper, '1'), purposeNode(wrapper, '1'), 'Uncategorised purchase');
    await flushPromises();
    await wrapper.get('[data-testid="pattern-shortcut-category"]').setValue('1');
    await flushPromises();
    await wait(350);
    expect(fetchCalls('/api/transactions')).toHaveLength(1);

    setSelection(purposeNode(wrapper, '3'), purposeNode(wrapper, '3'), 'February travel');
    await flushPromises();
    await wrapper.get('[data-testid="pattern-shortcut-category"]').setValue('2');
    await flushPromises();
    await wait(350);
    expect(fetchCalls('/api/transactions')).toHaveLength(2);

    const groceries = transactions.map((transaction) =>
      transaction.id === '1'
        ? { ...transaction, category: { id: '1', name: 'Groceries', hidden: false } }
        : transaction);
    const travel = transactions.map((transaction) =>
      transaction.id === '1'
        ? { ...transaction, category: { id: '2', name: 'Travel', hidden: false } }
        : transaction);

    refreshes[1]?.resolve(groceries);
    await flushPromises();
    expect((wrapper.get('[data-transaction-id="1"] [data-testid="row-category-select"]').element as HTMLSelectElement).value)
      .toBe('1');

    refreshes[0]?.resolve(travel);
    await flushPromises();
    expect((wrapper.get('[data-transaction-id="1"] [data-testid="row-category-select"]').element as HTMLSelectElement).value)
      .toBe('1');
  });

  it('keeps the displayed rows and reports when the refresh fails', async () => {
    mocks.fetch.mockImplementation((url: string) => {
      if (url === '/api/categories/1/patterns') {
        return Promise.resolve({
          category: { id: '1', name: 'Groceries', patterns: [], hidden: false, windows: [] },
          added: true,
        });
      }
      if (url === '/api/transactions') {
        return Promise.reject(new Error('refresh failed'));
      }
      return Promise.resolve({ count: 0 });
    });
    const wrapper = await mountTransactions();

    setSelection(purposeNode(wrapper, '1'), purposeNode(wrapper, '1'), 'Uncategorised purchase');
    await flushPromises();
    await wrapper.get('[data-testid="pattern-shortcut-category"]').setValue('1');
    await flushPromises();
    await wait(350);
    await flushPromises();

    expect(wrapper.get('[data-testid="pattern-shortcut-status"]').text())
      .toBe('The transactions could not be refreshed.');
    expect(wrapper.findAll('tbody tr').map((row) => row.attributes('data-transaction-id'))).toEqual(['1']);
  });
});

describe('manual category assignment', () => {
  beforeEach(() => {
    mocks.useFetch.mockReset();
    mocks.fetch.mockReset();
    mocks.useFetch.mockImplementation((url: unknown) =>
      url === '/api/transactions' ? transactionsResponse(transactions) : categoriesResponse());
  });

  afterEach(() => {
    for (const wrapper of mountedWrappers.splice(0)) {
      wrapper.unmount();
    }
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders each row category in an assignment control offering the stored categories', async () => {
    const wrapper = await mountTransactions();
    await wrapper.get('[data-testid="category-filter"]').setValue('all');
    await flushPromises();

    const control = wrapper.get('[data-transaction-id="2"] [data-testid="row-category-select"]');
    expect((control.element as HTMLSelectElement).value).toBe('1');
    expect(control.classes()).toContain('min-h-11');
    expect(control.findAll('option').map((option) => option.text())).toEqual([
      'Uncategorised',
      'Groceries',
      'Internal (hidden)',
      'Travel',
    ]);
    expect(control.findAll('option').map((option) => option.attributes('value')))
      .toEqual(['', '1', '3', '2']);

    const uncategorised = wrapper.get('[data-transaction-id="1"] [data-testid="row-category-select"]');
    expect((uncategorised.element as HTMLSelectElement).value).toBe('');
  });

  it('choosing a category invokes the assignment with the single identity', async () => {
    mocks.fetch.mockResolvedValue({ updated: 1 });
    const wrapper = await mountTransactions();

    await wrapper.get('[data-transaction-id="1"] [data-testid="row-category-select"]').setValue('2');
    await flushPromises();

    expect(mocks.fetch).toHaveBeenCalledWith('/api/transactions/category-assignments', {
      method: 'POST',
      body: { transactionIds: ['1'], categoryId: '2' },
    });
  });

  it('choosing Uncategorised invokes the assignment with no category', async () => {
    mocks.fetch.mockResolvedValue({ updated: 1 });
    const wrapper = await mountTransactions();
    await wrapper.get('[data-testid="category-filter"]').setValue('all');
    await flushPromises();

    await wrapper.get('[data-transaction-id="2"] [data-testid="row-category-select"]').setValue('');
    await flushPromises();

    expect(mocks.fetch).toHaveBeenCalledWith('/api/transactions/category-assignments', {
      method: 'POST',
      body: { transactionIds: ['2'], categoryId: null },
    });
  });

  it('marks a manually assigned row and leaves rule-derived rows unmarked', async () => {
    const wrapper = await mountTransactions();
    await wrapper.get('[data-testid="category-filter"]').setValue('all');
    await flushPromises();

    expect(wrapper.get('[data-transaction-id="2"] [data-testid="manual-assignment-marker"]').exists()).toBe(true);
    expect(wrapper.get('[data-transaction-id="2"]').text()).toContain('Manually assigned');
    expect(wrapper.find('[data-transaction-id="3"] [data-testid="manual-assignment-marker"]').exists()).toBe(false);
  });

  it('puts the control back and reports when the assignment fails', async () => {
    mocks.fetch.mockRejectedValue({ data: { message: 'the request could not be completed' } });
    const wrapper = await mountTransactions();

    const select = wrapper.get('[data-transaction-id="1"] [data-testid="row-category-select"]');
    await select.setValue('2');
    await flushPromises();

    expect((select.element as HTMLSelectElement).value).toBe('');
    const status = wrapper.get('[data-testid="pattern-shortcut-status"]');
    expect(status.text()).toContain('Could not assign the category');
    expect(status.classes()).toContain('text-failure');
  });

  it('disables the control while its assignment is in flight and refreshes once it settles', async () => {
    const assignment = deferred<{ updated: number }>();
    mocks.fetch.mockImplementation((url: string) =>
      url === '/api/transactions' ? Promise.resolve(transactions) : assignment.promise);
    const wrapper = await mountTransactions();

    const select = wrapper.get('[data-transaction-id="1"] [data-testid="row-category-select"]');
    await select.setValue('2');
    await flushPromises();

    expect((select.element as HTMLSelectElement).disabled).toBe(true);
    expect(wrapper.get('[data-transaction-id="1"]').attributes('aria-busy')).toBe('true');

    assignment.resolve({ updated: 1 });
    await flushPromises();
    await wait(350);
    await flushPromises();

    expect(fetchCalls('/api/transactions')).toHaveLength(1);
    const refreshed = wrapper.get('[data-transaction-id="1"] [data-testid="row-category-select"]');
    expect((refreshed.element as HTMLSelectElement).disabled).toBe(false);
    expect(wrapper.get('[data-transaction-id="1"]').attributes('aria-busy')).toBeUndefined();
  });

  it('select-all selects every shown row and clears when every shown row is selected', async () => {
    const wrapper = await mountTransactions();
    await wrapper.get('[data-testid="category-filter"]').setValue('all');
    await flushPromises();

    const selectAll = wrapper.get('[data-testid="select-all-visible"]');
    await selectAll.setValue(true);

    expect(wrapper.findAll('[data-testid="row-select"]').map((box) => (box.element as HTMLInputElement).checked))
      .toEqual([true, true, true, true, true]);
    expect(wrapper.get('[data-testid="bulk-assignment-bar"]').text()).toContain('5 transactions selected');
    expect((selectAll.element as HTMLInputElement).checked).toBe(true);

    await selectAll.setValue(false);

    expect(wrapper.find('[data-testid="bulk-assignment-bar"]').exists()).toBe(false);
    expect(wrapper.findAll('[data-testid="row-select"]').every((box) => !(box.element as HTMLInputElement).checked))
      .toBe(true);
  });

  it('reflects a partial selection in the select-all control', async () => {
    const wrapper = await mountTransactions();
    await wrapper.get('[data-testid="category-filter"]').setValue('all');
    await flushPromises();

    await wrapper.findAll('[data-testid="row-select"]')[0]?.setValue(true);

    const selectAll = wrapper.get('[data-testid="select-all-visible"]').element as HTMLInputElement;
    expect(selectAll.checked).toBe(false);
    expect(selectAll.indeterminate).toBe(true);
    expect(wrapper.get('[data-testid="bulk-assignment-bar"]').text()).toContain('1 transaction selected');
  });

  it('clears the selection when either filter changes', async () => {
    const wrapper = await mountTransactions();
    await wrapper.get('[data-testid="category-filter"]').setValue('all');
    await flushPromises();
    await wrapper.findAll('[data-testid="row-select"]')[0]?.setValue(true);
    expect(wrapper.find('[data-testid="bulk-assignment-bar"]').exists()).toBe(true);

    await wrapper.get('[data-testid="period-filter"]').setValue('2026-02');
    await flushPromises();

    expect(wrapper.find('[data-testid="bulk-assignment-bar"]').exists()).toBe(false);
    expect(wrapper.findAll('[data-testid="row-select"]').every((box) => !(box.element as HTMLInputElement).checked))
      .toBe(true);
  });

  it('applies one assignment to every selected row and clears the selection on success', async () => {
    mocks.fetch.mockImplementation((url: string) =>
      url === '/api/transactions' ? Promise.resolve(transactions) : Promise.resolve({ updated: 2 }));
    const wrapper = await mountTransactions();
    await wrapper.get('[data-testid="category-filter"]').setValue('all');
    await flushPromises();

    await wrapper.findAll('[data-testid="row-select"]')[0]?.setValue(true);
    await wrapper.findAll('[data-testid="row-select"]')[1]?.setValue(true);
    await wrapper.get('[data-testid="bulk-assignment-category"]').setValue('1');
    await wrapper.get('[data-testid="bulk-assignment-apply"]').trigger('click');
    await flushPromises();

    expect(mocks.fetch).toHaveBeenCalledWith('/api/transactions/category-assignments', {
      method: 'POST',
      body: { transactionIds: ['4', '3'], categoryId: '1' },
    });
    expect(wrapper.find('[data-testid="bulk-assignment-bar"]').exists()).toBe(false);

    await wait(350);
    await flushPromises();
    expect(fetchCalls('/api/transactions')).toHaveLength(1);
  });

  it('keeps the selection and reports when a bulk assignment fails', async () => {
    mocks.fetch.mockImplementation((url: string) =>
      url === '/api/transactions'
        ? Promise.resolve(transactions)
        : Promise.reject({ data: { message: 'the request could not be completed' } }));
    const wrapper = await mountTransactions();
    await wrapper.get('[data-testid="category-filter"]').setValue('all');
    await flushPromises();

    await wrapper.findAll('[data-testid="row-select"]')[0]?.setValue(true);
    await wrapper.findAll('[data-testid="row-select"]')[1]?.setValue(true);
    await wrapper.get('[data-testid="bulk-assignment-category"]').setValue('1');
    await wrapper.get('[data-testid="bulk-assignment-apply"]').trigger('click');
    await flushPromises();

    expect(wrapper.get('[data-testid="bulk-assignment-bar"]').text()).toContain('2 transactions selected');
    const status = wrapper.get('[data-testid="pattern-shortcut-status"]');
    expect(status.text()).toContain('Could not assign the selected transactions');
    expect(status.classes()).toContain('text-failure');
  });
});
