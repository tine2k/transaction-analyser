import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { ref, type Ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ useFetch: vi.fn() }));

mockNuxtImport('useFetch', () => mocks.useFetch);

import Manage from '../../app/pages/manage.vue';

type State = {
  data: Ref<unknown[]>;
  error: Ref<unknown>;
  pending: Ref<boolean>;
  refresh: ReturnType<typeof vi.fn>;
};

let states: Record<string, State>;

function state(
  data: unknown[],
  options: { error?: unknown; pending?: boolean } = {},
): State {
  return {
    data: ref(data),
    error: ref(options.error ?? null),
    pending: ref(options.pending ?? false),
    refresh: vi.fn(),
  };
}

function defaultStates(): Record<string, State> {
  return {
    '/api/people': state([{ id: '1' }, { id: '2' }]),
    '/api/categories': state([{ id: '1' }]),
    '/api/imports': state([
      { id: '2', startedAt: '2026-10-26T06:00:00Z', outcome: 'success' },
      { id: '1', startedAt: '2026-10-25T06:00:00Z', outcome: 'failed' },
    ]),
  };
}

describe('manage hub', () => {
  beforeEach(() => {
    mocks.useFetch.mockReset();
    states = defaultStates();
    mocks.useFetch.mockImplementation((url: string) => states[url]);
  });

  it('lists the three management screens, their links, and their counts', async () => {
    const wrapper = await mountSuspended(Manage);

    expect(wrapper.get('h1').text()).toBe('Manage');
    expect(wrapper.findAll('a').map((link) => link.attributes('href')))
      .toEqual(['/people', '/categories', '/imports']);

    expect(wrapper.get('[data-testid="manage-status-people"]').text()).toBe('2 people');
    expect(wrapper.get('[data-testid="manage-status-categories"]').text()).toBe('1 category');
    expect(wrapper.get('[data-testid="manage-status-imports"]').text())
      .toBe('Last run: Success · 2026-10-26 06:00:00 UTC');
  });

  it('offers no form, sync control, or destructive action', async () => {
    const wrapper = await mountSuspended(Manage);

    expect(wrapper.findAll('form')).toHaveLength(0);
    expect(wrapper.findAll('button')).toHaveLength(0);
    expect(wrapper.text()).not.toContain('Sync now');
    expect(wrapper.text()).not.toContain('Delete');
  });

  it('shows loading rather than an empty result while a request is in flight', async () => {
    states = {
      '/api/people': state([], { pending: true }),
      '/api/categories': state([], { pending: true }),
      '/api/imports': state([], { pending: true }),
    };
    const wrapper = await mountSuspended(Manage);

    expect(wrapper.findAll('[data-testid^="manage-status-"]').map((status) => status.text()))
      .toEqual(['Loading…', 'Loading…', 'Loading…']);
    expect(wrapper.text()).not.toContain('No people yet');
    expect(wrapper.text()).not.toContain('No categories yet');
    expect(wrapper.text()).not.toContain('No import has run yet');
  });

  it('states each empty list without inventing a value', async () => {
    states = {
      '/api/people': state([]),
      '/api/categories': state([]),
      '/api/imports': state([]),
    };
    const wrapper = await mountSuspended(Manage);

    expect(wrapper.get('[data-testid="manage-status-people"]').text()).toBe('No people yet');
    expect(wrapper.get('[data-testid="manage-status-categories"]').text()).toBe('No categories yet');
    expect(wrapper.get('[data-testid="manage-status-imports"]').text()).toBe('No import has run yet');
  });

  it('keeps one failed read unknown without hiding the other rows', async () => {
    states = {
      '/api/people': state([], { error: new Error('unavailable') }),
      '/api/categories': state([{ id: '1' }, { id: '2' }]),
      '/api/imports': state([
        { id: '1', startedAt: '2026-10-26T06:00:00Z', outcome: 'success' },
      ]),
    };
    const wrapper = await mountSuspended(Manage);

    expect(wrapper.get('[data-testid="manage-status-people"]').text()).toBe('Status unavailable');
    expect(wrapper.get('[data-testid="manage-status-categories"]').text()).toBe('2 categories');
    expect(wrapper.get('[data-testid="manage-status-imports"]').text())
      .toBe('Last run: Success · 2026-10-26 06:00:00 UTC');
    expect(wrapper.get('[data-testid="manage-link-people"]').attributes('href')).toBe('/people');
  });

  it('marks a failed latest run as a failure while still linking to the log', async () => {
    states = {
      '/api/people': state([{ id: '1' }]),
      '/api/categories': state([{ id: '1' }]),
      '/api/imports': state([
        { id: '2', startedAt: '2026-10-26T06:00:00Z', outcome: 'failed' },
        { id: '1', startedAt: '2026-10-25T06:00:00Z', outcome: 'success' },
      ]),
    };
    const wrapper = await mountSuspended(Manage);

    const status = wrapper.get('[data-testid="manage-status-imports"]');
    expect(status.text()).toContain('Failed');
    expect(status.classes()).toContain('text-failure');
    expect(wrapper.get('[data-testid="manage-link-imports"]').attributes('href')).toBe('/imports');
  });

  it('uses the newest returned run and does not mark an older failure', async () => {
    states = {
      '/api/people': state([{ id: '1' }]),
      '/api/categories': state([{ id: '1' }]),
      '/api/imports': state([
        { id: '2', startedAt: '2026-10-26T06:00:00Z', outcome: 'success' },
        { id: '1', startedAt: '2026-10-25T06:00:00Z', outcome: 'failed' },
      ]),
    };
    const wrapper = await mountSuspended(Manage);

    const status = wrapper.get('[data-testid="manage-status-imports"]');
    expect(status.text()).toContain('Success');
    expect(status.text()).not.toContain('Failed');
    expect(status.classes()).not.toContain('text-failure');
  });
});
