import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import Categories from '../../app/pages/categories.vue';

mockNuxtImport('useFetch', () => () => ({
  data: ref([
    { id: '10', name: 'Groceries', patterns: ['food', 'market'] },
    { id: '3', name: 'alpha', patterns: ['^lower$'] },
    { id: '7', name: 'Alpha', patterns: ['^upper$'] },
  ]),
  error: ref(null),
  pending: ref(false),
  refresh: vi.fn(),
}));

describe('category management page', () => {
  it('sorts category rows and loads the selected category into the edit form', async () => {
    const wrapper = await mountSuspended(Categories);

    const rows = wrapper.findAll('tbody tr');
    expect(rows.map((row) => row.find('td').text())).toEqual(['alpha', 'Alpha', 'Groceries']);

    await rows[2]?.find('button').trigger('click');

    expect(wrapper.find('form h2').text()).toBe('Edit category');
    expect(wrapper.find('label input').element).toHaveProperty('value', 'Groceries');
    expect(wrapper.findAll('fieldset input').map((input) => (input.element as HTMLInputElement).value))
      .toEqual(['food', 'market']);
  });
});
