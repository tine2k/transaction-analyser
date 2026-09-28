import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ useFetch: vi.fn(), fetch: vi.fn() }));

mockNuxtImport('useFetch', () => mocks.useFetch);
mockNuxtImport('$fetch', () => mocks.fetch);

import Categories from '../../app/pages/categories.vue';

function response() {
  return {
    data: ref([
      { id: '10', name: 'Groceries', patterns: ['food', 'market'], hidden: false },
      { id: '3', name: 'alpha', patterns: ['^lower$'], hidden: true },
      { id: '7', name: 'Alpha', patterns: ['^upper$'], hidden: false },
    ]),
    error: ref(null),
    pending: ref(false),
    refresh: vi.fn(),
  };
}

describe('category management page', () => {
  beforeEach(() => {
    mocks.useFetch.mockReset();
    mocks.fetch.mockReset();
    mocks.useFetch.mockReturnValue(response());
  });

  it('sorts category rows and loads the selected category into the edit form', async () => {
    const wrapper = await mountSuspended(Categories);

    const rows = wrapper.findAll('tbody tr');
    expect(rows.map((row) => row.find('td').text())).toEqual(['alpha', 'Alpha', 'Groceries']);

    await rows[2]?.find('button').trigger('click');

    expect(wrapper.find('form h2').text()).toBe('Edit category');
    expect(wrapper.find('label input').element).toHaveProperty('value', 'Groceries');
    expect(wrapper.findAll('fieldset input').map((input) => (input.element as HTMLInputElement).value))
      .toEqual(['food', 'market']);
    expect((wrapper.get('[data-testid="hidden-input"]').element as HTMLInputElement).checked).toBe(false);
  });

  it('states the hidden state of every category row', async () => {
    const wrapper = await mountSuspended(Categories);

    expect(wrapper.findAll('[data-testid="category-hidden-state"]').map((cell) => cell.text()))
      .toEqual(['Hidden', 'Visible', 'Visible']);
  });

  it('pre-populates the hidden state when editing a hidden category', async () => {
    const wrapper = await mountSuspended(Categories);
    const rows = wrapper.findAll('tbody tr');

    await rows[0]?.find('button').trigger('click');

    expect(wrapper.find('label input').element).toHaveProperty('value', 'alpha');
    expect((wrapper.get('[data-testid="hidden-input"]').element as HTMLInputElement).checked).toBe(true);
  });

  it('sends the entered hidden flag when creating a category', async () => {
    mocks.fetch.mockResolvedValue({});
    const wrapper = await mountSuspended(Categories);

    await wrapper.get('form label input').setValue('Internal');
    await wrapper.get('fieldset input').setValue('internal');
    await wrapper.get('[data-testid="hidden-input"]').setValue(true);
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(mocks.fetch).toHaveBeenCalledWith('/api/categories', expect.objectContaining({
      method: 'POST',
      body: { name: 'Internal', patterns: ['internal'], hidden: true },
    }));
  });
});
