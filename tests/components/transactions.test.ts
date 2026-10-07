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

const storedCategories = [
  { id: '1', name: 'Groceries', patterns: ['market'], hidden: false, windows: [] },
  { id: '2', name: 'Travel', patterns: ['travel'], hidden: false, windows: [] },
  { id: '3', name: 'Internal', patterns: ['internal'], hidden: true, windows: [] },
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
  return wrapper.get(`[data-transaction-id="${transactionId}"] td:nth-child(4)`).element.firstChild as Node;
}

function counterpartyNode(wrapper: Awaited<ReturnType<typeof mountTransactions>>, transactionId: string): Node {
  return wrapper.get(`[data-transaction-id="${transactionId}"] td:nth-child(5)`).element.firstChild as Node;
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
    expect((wrapper.get('[data-testid="month-filter"]').element as HTMLSelectElement).value)
      .toBe('all');
    expect(wrapper.findAll('tbody tr').map((row) => row.attributes('data-transaction-id')))
      .toEqual(['1']);
    expect(wrapper.get('[data-testid="visible-total"]').text()).toContain(formatEuroAmount('-0.25'));
    expect(wrapper.get('[data-testid="category-filter"]').text()).toContain('All categories (5)');
    expect(wrapper.get('[data-testid="category-filter"]').text()).toContain('Uncategorised (1)');
    expect(mocks.useFetch).toHaveBeenCalledTimes(2);
  });

  it('gives both filters a full-width mobile layout and touch-sized control height', async () => {
    const wrapper = await mountTransactions();

    for (const selector of ['[data-testid="category-filter"]', '[data-testid="month-filter"]']) {
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
    expect((wrapper.get('[data-testid="month-filter"]').element as HTMLSelectElement).value)
      .toBe('2026-02');
    expect(wrapper.findAll('tbody tr').map((row) => row.attributes('data-transaction-id')))
      .toEqual(['2']);
    expect(wrapper.get('[data-testid="visible-total"]').text()).toContain(formatEuroAmount('-12.50'));
    expect(wrapper.findAll('tbody tr')[0]?.findAll('td')[2]?.text()).toBe('-12.50');
    expect(mocks.useFetch).toHaveBeenCalledTimes(2);
  });

  it('composes filter selections, preserves row order, and reflects them in the route query', async () => {
    const wrapper = await mountTransactions();
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
    expect(mocks.useFetch).toHaveBeenCalledTimes(2);

    await categoryFilter.setValue('1');
    await flushPromises();
    await monthFilter.setValue('2026-03');
    await flushPromises();
    expect(wrapper.findAll('tbody tr')).toHaveLength(0);
    expect(wrapper.get('[data-testid="visible-total"]').text()).toContain(formatEuroAmount('0'));
  });

  it('falls back safely for unknown query values', async () => {
    const wrapper = await mountTransactions({ route: '/?category=missing&month=2026-13' });

    expect((wrapper.get('[data-testid="category-filter"]').element as HTMLSelectElement).value)
      .toBe('uncategorised');
    expect((wrapper.get('[data-testid="month-filter"]').element as HTMLSelectElement).value)
      .toBe('all');
    expect(wrapper.findAll('tbody tr').map((row) => row.attributes('data-transaction-id')))
      .toEqual(['1']);
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
    expect(status.classes()).toContain('text-red-700');
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
    expect(wrapper.get('[data-transaction-id="1"] td:nth-child(7)').text()).toContain('Groceries');
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
    expect(wrapper.get('[data-transaction-id="1"] td:nth-child(7)').text()).toContain('Groceries');

    refreshes[0]?.resolve(travel);
    await flushPromises();
    expect(wrapper.get('[data-transaction-id="1"] td:nth-child(7)').text()).toContain('Groceries');
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
