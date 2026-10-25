import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ useFetch: vi.fn(), fetch: vi.fn() }));

mockNuxtImport('useFetch', () => mocks.useFetch);
mockNuxtImport('$fetch', () => mocks.fetch);

import People from '../../app/pages/people.vue';

type PageState = {
  data: ReturnType<typeof ref>;
  error: ReturnType<typeof ref>;
  pending: ReturnType<typeof ref>;
  refresh: ReturnType<typeof vi.fn>;
};

let pageState: PageState;

function response(
  people = [
    { id: '10', name: 'zoe', transactionCount: 3 },
    { id: '3', name: 'Anna', transactionCount: 0 },
    { id: '7', name: 'alpha', transactionCount: 12 },
  ],
): PageState {
  pageState = {
    data: ref(people),
    error: ref(null),
    pending: ref(false),
    refresh: vi.fn(),
  };
  return pageState;
}

describe('people management page', () => {
  beforeEach(() => {
    mocks.useFetch.mockReset();
    mocks.fetch.mockReset();
    mocks.useFetch.mockReturnValue(response());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('orders the rows by name ignoring case and shows every count, including zero', async () => {
    const wrapper = await mountSuspended(People);

    const rows = wrapper.findAll('[data-testid="person-row"]');
    expect(rows.map((row) => row.find('[data-testid="person-name"]').text()))
      .toEqual(['alpha', 'Anna', 'zoe']);
    expect(rows.map((row) => row.find('[data-testid="person-count"]').text()))
      .toEqual(['12', '0', '3']);
  });

  it('shows an empty state only when the endpoint returned no person', async () => {
    mocks.useFetch.mockReturnValue(response([]));
    const empty = await mountSuspended(People);

    expect(empty.get('[data-testid="people-empty"]').text()).toContain('no people');
    expect(empty.findAll('[data-testid="person-row"]')).toHaveLength(0);

    mocks.useFetch.mockReturnValue({
      data: ref([]),
      error: ref(new Error('unavailable')),
      pending: ref(false),
      refresh: vi.fn(),
    });
    const failed = await mountSuspended(People);

    expect(failed.get('[data-testid="people-error"]').text()).toContain('could not be loaded');
    expect(failed.find('[data-testid="people-empty"]').exists()).toBe(false);
  });

  it('creates a person, sends the trimmed name, and refreshes the list', async () => {
    mocks.fetch.mockResolvedValue({ id: '11', name: 'Zoe', transactionCount: 0 });
    const wrapper = await mountSuspended(People);

    await wrapper.get('[data-testid="person-name-input"]').setValue('  Zoe  ');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(mocks.fetch).toHaveBeenCalledWith('/api/people', {
      method: 'POST',
      body: { name: 'Zoe' },
    });
    expect(pageState.refresh).toHaveBeenCalledTimes(1);
    expect((wrapper.get('[data-testid="person-name-input"]').element as HTMLInputElement).value).toBe('');
    expect(wrapper.findAll('[data-testid="person-row"]')).toHaveLength(3);

    pageState.data.value = [
      ...pageState.data.value,
      { id: '11', name: 'Zoe', transactionCount: 0 },
    ];
    await flushPromises();

    const rows = wrapper.findAll('[data-testid="person-row"]');
    expect(rows.map((row) => row.find('[data-testid="person-name"]').text()))
      .toEqual(['alpha', 'Anna', 'zoe', 'Zoe']);
    expect(rows.at(-1)?.find('[data-testid="person-count"]').text()).toBe('0');
  });

  it('does not send an empty name and reports that one is required', async () => {
    const wrapper = await mountSuspended(People);

    await wrapper.get('[data-testid="person-name-input"]').setValue('   ');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(wrapper.get('[data-testid="person-form-error"]').text()).toContain('Enter a name');
    expect(wrapper.findAll('[data-testid="person-row"]')).toHaveLength(3);
  });

  it('reports a duplicate creation and adds no row', async () => {
    mocks.fetch.mockRejectedValue({ data: { message: 'a person with that name already exists' } });
    const wrapper = await mountSuspended(People);

    await wrapper.get('[data-testid="person-name-input"]').setValue('anna');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(wrapper.get('[data-testid="person-form-error"]').text())
      .toContain('a person with that name already exists');
    expect(wrapper.findAll('[data-testid="person-row"]')).toHaveLength(3);
    expect(pageState.refresh).not.toHaveBeenCalled();
  });

  it('loads a person into the form and renames in place', async () => {
    mocks.fetch.mockResolvedValue({ id: '3', name: 'Zoe', transactionCount: 0 });
    const wrapper = await mountSuspended(People);

    await wrapper.get('[data-person-id="3"] [data-testid="person-edit"]').trigger('click');

    expect(wrapper.find('form h2').text()).toBe('Rename person');
    const input = wrapper.get('[data-testid="person-name-input"]').element as HTMLInputElement;
    expect(input.value).toBe('Anna');

    await wrapper.get('[data-testid="person-name-input"]').setValue('Zoe');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(mocks.fetch).toHaveBeenCalledWith('/api/people/3', {
      method: 'PUT',
      body: { name: 'Zoe' },
    });
    expect(pageState.refresh).toHaveBeenCalledTimes(1);
    expect(wrapper.find('form h2').text()).toBe('Add a person');
    expect((wrapper.get('[data-testid="person-name-input"]').element as HTMLInputElement).value).toBe('');
  });

  it('cancelling leaves the stored name and the list unchanged', async () => {
    const wrapper = await mountSuspended(People);

    await wrapper.get('[data-person-id="3"] [data-testid="person-edit"]').trigger('click');
    await wrapper.get('[data-testid="person-name-input"]').setValue('Someone else');
    await wrapper.get('[data-testid="person-cancel"]').trigger('click');
    await flushPromises();

    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(pageState.refresh).not.toHaveBeenCalled();
    expect(wrapper.find('[data-person-id="3"] [data-testid="person-name"]').text()).toBe('Anna');
    expect((wrapper.get('[data-testid="person-name-input"]').element as HTMLInputElement).value).toBe('');
  });

  it('keeps the previous name and reports a failed rename', async () => {
    mocks.fetch.mockRejectedValue({ data: { message: 'the person request could not be completed' } });
    const wrapper = await mountSuspended(People);

    await wrapper.get('[data-person-id="3"] [data-testid="person-edit"]').trigger('click');
    await wrapper.get('[data-testid="person-name-input"]').setValue('Zoe');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(wrapper.get('[data-testid="person-form-error"]').text())
      .toContain('the person request could not be completed');
    expect(wrapper.find('[data-person-id="3"] [data-testid="person-name"]').text()).toBe('Anna');
    expect(pageState.refresh).not.toHaveBeenCalled();
  });

  it('offers no deletion control', async () => {
    const wrapper = await mountSuspended(People);

    expect(wrapper.text()).not.toContain('Delete');
    expect(wrapper.find('[data-testid="person-delete"]').exists()).toBe(false);
    for (const row of wrapper.findAll('[data-testid="person-row"]')) {
      const buttons = row.findAll('button');
      expect(buttons).toHaveLength(1);
      expect(buttons[0]?.text()).toContain('Rename');
    }
  });

  it('labels the people table scroll region and sizes controls for touch', async () => {
    const wrapper = await mountSuspended(People);
    const region = wrapper.get('[data-testid="people-scroll"]');

    expect(region.attributes('role')).toBe('region');
    expect(region.attributes('aria-label')).toBe('People table');
    expect(region.attributes('tabindex')).toBe('0');
    expect(region.classes()).toContain('overflow-x-auto');
    expect(region.get('table').classes()).toContain('w-max');
    expect(wrapper.findAll('tbody button').every((button) => button.classes().includes('min-h-11')))
      .toBe(true);
    expect(wrapper.get('[data-testid="person-name-input"]').classes()).toContain('min-h-11');
  });

  it('rests the form and people table on the sheet elevation', async () => {
    const wrapper = await mountSuspended(People);

    expect(wrapper.get('form').classes()).toContain('shadow-sheet');
    expect(wrapper.get('[data-testid="people-scroll"]').classes()).toContain('shadow-sheet');
  });
});
