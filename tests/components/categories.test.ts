import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ useFetch: vi.fn(), fetch: vi.fn() }));

mockNuxtImport('useFetch', () => mocks.useFetch);
mockNuxtImport('$fetch', () => mocks.fetch);

import Categories from '../../app/pages/categories.vue';

type PageState = {
  data: ReturnType<typeof ref>;
  error: ReturnType<typeof ref>;
  pending: ReturnType<typeof ref>;
  refresh: ReturnType<typeof vi.fn>;
};

let pageState: PageState;

function response(): PageState {
  pageState = {
    data: ref([
      { id: '10', name: 'Groceries', patterns: ['food', 'market'], hidden: false, windows: [{ from: '2026-07-01', to: '2026-07-14' }] },
      { id: '3', name: 'alpha', patterns: ['^lower$'], hidden: true, windows: [] },
      { id: '7', name: 'Alpha', patterns: ['^upper$'], hidden: false, windows: [] },
    ]),
    error: ref(null),
    pending: ref(false),
    refresh: vi.fn(),
  };
  return pageState;
}

describe('category management page', () => {
  beforeEach(() => {
    mocks.useFetch.mockReset();
    mocks.fetch.mockReset();
    mocks.useFetch.mockReturnValue(response());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sorts category rows and loads the selected category into the edit form', async () => {
    const wrapper = await mountSuspended(Categories);

    const rows = wrapper.findAll('tbody tr');
    expect(rows.map((row) => row.find('td').text())).toEqual(['alpha', 'Alpha', 'Groceries']);

    await rows[2]?.find('button').trigger('click');

    expect(wrapper.find('form h2').text()).toBe('Edit category');
    expect(wrapper.find('label input').element).toHaveProperty('value', 'Groceries');
    expect(wrapper.findAll('[data-testid="pattern-input"]').map((input) => (input.element as HTMLInputElement).value))
      .toEqual(['food', 'market']);
    expect(wrapper.get('[data-testid="window-from"]').element)
      .toHaveProperty('value', '2026-07-01');
    expect(wrapper.get('[data-testid="window-to"]').element)
      .toHaveProperty('value', '2026-07-14');
    expect((wrapper.get('[data-testid="hidden-input"]').element as HTMLInputElement).checked).toBe(false);
  });

  it('states the hidden state of every category row', async () => {
    const wrapper = await mountSuspended(Categories);

    expect(wrapper.findAll('[data-testid="category-hidden-state"]').map((cell) => cell.text()))
      .toEqual(['Hidden', 'Visible', 'Visible']);
  });

  it('shows each category window count, not its window values', async () => {
    const wrapper = await mountSuspended(Categories);

    expect(wrapper.findAll('[data-testid="category-window-count"]').map((cell) => cell.text()))
      .toEqual(['0', '0', '1']);
  });

  it('reflows category fields and provides touch-sized form controls', async () => {
    const wrapper = await mountSuspended(Categories);

    expect(wrapper.get('form').classes()).toContain('w-full');
    expect(wrapper.get('form label input').classes()).toContain('min-h-11');
    expect(wrapper.get('[data-testid="pattern-input"]').classes()).toContain('min-w-0');
    expect(wrapper.get('[data-testid="add-window"]').classes()).toContain('min-h-11');
    await wrapper.get('[data-testid="add-window"]').trigger('click');
    expect(wrapper.get('[data-testid="window-from"]').element.parentElement?.parentElement?.classList.contains('grid'))
      .toBe(true);
    expect(wrapper.get('[data-testid="hidden-input"]').classes()).toContain('size-5');
  });

  it('labels the category table scroll region and sizes row actions for touch', async () => {
    const wrapper = await mountSuspended(Categories);
    const region = wrapper.get('[data-testid="categories-scroll"]');

    expect(region.attributes('role')).toBe('region');
    expect(region.attributes('aria-label')).toBe('Category table');
    expect(region.attributes('tabindex')).toBe('0');
    expect(region.classes()).toContain('overflow-x-auto');
    expect(region.get('table').classes()).toContain('w-max');
    expect(region.get('table').classes()).not.toContain('min-w-full');
    expect(wrapper.findAll('tbody button').every((button) => button.classes().includes('min-h-11')))
      .toBe(true);
  });

  it('sizes the category table to its content and stripes its rows', async () => {
    const wrapper = await mountSuspended(Categories);

    expect(wrapper.get('table').classes()).toContain('w-max');
    expect(wrapper.get('table').classes()).not.toContain('min-w-full');
    expect(wrapper.findAll('tbody tr').every((row) =>
      row.classes().includes('odd:bg-white') && row.classes().includes('even:bg-slate-50'),
    )).toBe(true);
  });

  it('scrolls the edit form into view when an edit starts', async () => {
    const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView');
    const wrapper = await mountSuspended(Categories);

    await wrapper.findAll('tbody tr')[0]?.find('button').trigger('click');
    await flushPromises();

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });

  it('brings the edit form into view without animation when reduced motion is requested', async () => {
    const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView');
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
    const wrapper = await mountSuspended(Categories);

    await wrapper.findAll('tbody tr')[0]?.find('button').trigger('click');
    await flushPromises();

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
  });

  it('pre-populates the hidden state when editing a hidden category', async () => {
    const wrapper = await mountSuspended(Categories);
    const rows = wrapper.findAll('tbody tr');

    await rows[0]?.find('button').trigger('click');

    expect(wrapper.find('label input').element).toHaveProperty('value', 'alpha');
    expect((wrapper.get('[data-testid="hidden-input"]').element as HTMLInputElement).checked).toBe(true);
  });

  it('sends the entered hidden flag and an empty window list when creating a category', async () => {
    mocks.fetch.mockResolvedValue({});
    const wrapper = await mountSuspended(Categories);

    await wrapper.get('form label input').setValue('Internal');
    await wrapper.get('[data-testid="pattern-input"]').setValue('internal');
    await wrapper.get('[data-testid="hidden-input"]').setValue(true);
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(mocks.fetch).toHaveBeenCalledWith('/api/categories', expect.objectContaining({
      method: 'POST',
      body: { name: 'Internal', patterns: ['internal'], hidden: true, windows: [] },
    }));
  });

  it('sends an entered window with the category', async () => {
    mocks.fetch.mockResolvedValue({});
    const wrapper = await mountSuspended(Categories);

    await wrapper.get('form label input').setValue('Urlaub');
    await wrapper.get('[data-testid="pattern-input"]').setValue('holiday');
    await wrapper.get('[data-testid="add-window"]').trigger('click');
    await wrapper.get('[data-testid="window-from"]').setValue('2026-07-01');
    await wrapper.get('[data-testid="window-to"]').setValue('2026-07-14');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(mocks.fetch).toHaveBeenCalledWith('/api/categories', expect.objectContaining({
      method: 'POST',
      body: {
        name: 'Urlaub',
        patterns: ['holiday'],
        hidden: false,
        windows: [{ from: '2026-07-01', to: '2026-07-14' }],
      },
    }));
  });

  it('creates a date-only category with no expression', async () => {
    mocks.fetch.mockResolvedValue({});
    const wrapper = await mountSuspended(Categories);

    await wrapper.get('form label input').setValue('Urlaub');
    await wrapper.get('[data-testid="add-window"]').trigger('click');
    await wrapper.get('[data-testid="window-from"]').setValue('2026-07-01');
    await wrapper.get('[data-testid="window-to"]').setValue('2026-07-14');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(mocks.fetch).toHaveBeenCalledWith('/api/categories', expect.objectContaining({
      method: 'POST',
      body: {
        name: 'Urlaub',
        patterns: [],
        hidden: false,
        windows: [{ from: '2026-07-01', to: '2026-07-14' }],
      },
    }));
  });

  it('removes an existing window before submitting an edit', async () => {
    mocks.fetch.mockResolvedValue({});
    const wrapper = await mountSuspended(Categories);
    const rows = wrapper.findAll('tbody tr');

    await rows[2]?.find('button').trigger('click');
    await wrapper.get('[data-testid="remove-window"]').trigger('click');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(mocks.fetch).toHaveBeenCalledWith('/api/categories/10', expect.objectContaining({
      method: 'PUT',
      body: expect.objectContaining({ windows: [] }),
    }));
  });

  it('reports a rejected overlapping window without changing the row', async () => {
    mocks.fetch.mockRejectedValueOnce({ data: { message: "a date window overlaps another category's window" } });
    const wrapper = await mountSuspended(Categories);

    await wrapper.get('form label input').setValue('Urlaub');
    await wrapper.get('[data-testid="add-window"]').trigger('click');
    await wrapper.get('[data-testid="window-from"]').setValue('2026-07-01');
    await wrapper.get('[data-testid="window-to"]').setValue('2026-07-14');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain("a date window overlaps another category's window");
    expect(pageState.refresh).not.toHaveBeenCalled();
  });

  it('refuses to submit a category with neither an expression nor a window', async () => {
    const wrapper = await mountSuspended(Categories);

    await wrapper.get('form label input').setValue('Empty');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Enter at least one regular expression or date window.');
  });

  it('previews the transactions the entered windows claim', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    mocks.fetch.mockResolvedValue({ count: 3 });
    const wrapper = await mountSuspended(Categories);

    await wrapper.get('[data-testid="add-window"]').trigger('click');
    await wrapper.get('[data-testid="window-from"]').setValue('2026-07-01');
    await wrapper.get('[data-testid="window-to"]').setValue('2026-07-14');
    await vi.advanceTimersByTimeAsync(250);
    await flushPromises();

    expect(mocks.fetch).toHaveBeenCalledWith('/api/categories/window-match-count', expect.objectContaining({
      method: 'POST',
      body: { windows: [{ from: '2026-07-01', to: '2026-07-14' }] },
    }));
    expect(wrapper.get('[data-testid="window-match-count"]').text())
      .toContain('Windows claim 3 stored transactions');
  });

  it('refreshes the window preview as the windows change', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    mocks.fetch.mockResolvedValue({ count: 1 });
    const wrapper = await mountSuspended(Categories);

    await wrapper.get('[data-testid="add-window"]').trigger('click');
    await wrapper.get('[data-testid="window-from"]').setValue('2026-07-01');
    await wrapper.get('[data-testid="window-to"]').setValue('2026-07-14');
    await vi.advanceTimersByTimeAsync(250);
    await flushPromises();
    expect(mocks.fetch).toHaveBeenLastCalledWith('/api/categories/window-match-count', expect.objectContaining({
      body: { windows: [{ from: '2026-07-01', to: '2026-07-14' }] },
    }));

    await wrapper.get('[data-testid="window-to"]').setValue('2026-07-20');
    await vi.advanceTimersByTimeAsync(250);
    await flushPromises();
    expect(mocks.fetch).toHaveBeenLastCalledWith('/api/categories/window-match-count', expect.objectContaining({
      body: { windows: [{ from: '2026-07-01', to: '2026-07-20' }] },
    }));
  });

  it('does not preview an incomplete or empty window set', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    mocks.fetch.mockResolvedValue({ count: 1 });
    const wrapper = await mountSuspended(Categories);

    await vi.advanceTimersByTimeAsync(300);
    await flushPromises();
    expect(mocks.fetch).not.toHaveBeenCalledWith('/api/categories/window-match-count', expect.anything());

    await wrapper.get('[data-testid="add-window"]').trigger('click');
    await wrapper.get('[data-testid="window-from"]').setValue('2026-07-01');
    await vi.advanceTimersByTimeAsync(300);
    await flushPromises();
    expect(mocks.fetch).not.toHaveBeenCalledWith('/api/categories/window-match-count', expect.anything());
    expect(wrapper.get('[data-testid="window-match-count"]').text())
      .toContain('Enter a from and a to date');
  });

  it('shows an unavailable window preview without blocking a save', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    mocks.fetch.mockImplementation((url: string) => {
      if (url === '/api/categories/window-match-count') {
        return Promise.reject(new Error('unavailable'));
      }
      return Promise.resolve({});
    });
    const wrapper = await mountSuspended(Categories);

    await wrapper.get('form label input').setValue('Urlaub');
    await wrapper.get('[data-testid="add-window"]').trigger('click');
    await wrapper.get('[data-testid="window-from"]').setValue('2026-07-01');
    await wrapper.get('[data-testid="window-to"]').setValue('2026-07-14');
    await vi.advanceTimersByTimeAsync(250);
    await flushPromises();

    expect(wrapper.get('[data-testid="window-match-count"]').text()).toContain('unavailable');

    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(mocks.fetch).toHaveBeenCalledWith('/api/categories', expect.objectContaining({ method: 'POST' }));
  });

  it('shows the expression and window previews separately', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    mocks.fetch.mockImplementation((url: string) => {
      if (url === '/api/categories/match-count') {
        return Promise.resolve({ count: 2 });
      }
      if (url === '/api/categories/window-match-count') {
        return Promise.resolve({ count: 5 });
      }
      return Promise.resolve({});
    });
    const wrapper = await mountSuspended(Categories);

    await wrapper.get('[data-testid="pattern-input"]').setValue('rewe');
    await wrapper.get('[data-testid="add-window"]').trigger('click');
    await wrapper.get('[data-testid="window-from"]').setValue('2026-07-01');
    await wrapper.get('[data-testid="window-to"]').setValue('2026-07-14');
    await vi.advanceTimersByTimeAsync(250);
    await flushPromises();

    expect(wrapper.get('[data-testid="pattern-match-count"]').text()).toContain('Matches 2');
    expect(wrapper.get('[data-testid="window-match-count"]').text()).toContain('Windows claim 5');
  });
});
