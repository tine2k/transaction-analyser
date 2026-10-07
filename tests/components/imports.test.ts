import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ useFetch: vi.fn(), fetch: vi.fn() }));

mockNuxtImport('useFetch', () => mocks.useFetch);
mockNuxtImport('$fetch', () => mocks.fetch);

import Imports from '../../app/pages/imports.vue';

type Run = {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  source: string;
  nonWriting: boolean;
  outcome: string;
  rowsRead: number;
  rowsAlreadyStored: number;
  rowsWritten: number;
  rowsCategorised: number;
  error: string | null;
};

function response(runs: Run[], error: unknown = null) {
  return {
    data: ref(runs),
    error: ref(error),
    pending: ref(false),
    refresh: vi.fn(),
  };
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

const runs: Run[] = [
  {
    id: '3',
    startedAt: '2026-10-06T03:00:00Z',
    finishedAt: '2026-10-06T03:00:05Z',
    source: 'scheduled',
    nonWriting: false,
    outcome: 'success',
    rowsRead: 12,
    rowsAlreadyStored: 9,
    rowsWritten: 3,
    rowsCategorised: 2,
    error: null,
  },
  {
    id: '2',
    startedAt: '2026-10-05T18:00:00Z',
    finishedAt: '2026-10-05T18:00:02Z',
    source: 'manual',
    nonWriting: true,
    outcome: 'success',
    rowsRead: 5,
    rowsAlreadyStored: 5,
    rowsWritten: 0,
    rowsCategorised: 0,
    error: null,
  },
  {
    id: '1',
    startedAt: '2026-10-05T17:00:00Z',
    finishedAt: '2026-10-05T17:00:01Z',
    source: 'scheduled',
    nonWriting: false,
    outcome: 'failed',
    rowsRead: 0,
    rowsAlreadyStored: 0,
    rowsWritten: 0,
    rowsCategorised: 0,
    error: 'the export could not be retrieved',
  },
];

const uiRun: Run = {
  id: '4',
  startedAt: '2026-10-06T09:00:00Z',
  finishedAt: '2026-10-06T09:00:03Z',
  source: 'ui',
  nonWriting: true,
  outcome: 'success',
  rowsRead: 7,
  rowsAlreadyStored: 7,
  rowsWritten: 0,
  rowsCategorised: 0,
  error: null,
};

describe('imports page', () => {
  beforeEach(() => {
    mocks.useFetch.mockReset();
    mocks.fetch.mockReset();
  });

  it('shows one row per returned run with its source, mode, outcome, and counts', async () => {
    mocks.useFetch.mockReturnValue(response(runs));

    const wrapper = await mountSuspended(Imports);

    const rows = wrapper.findAll('[data-testid="import-run"]');
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.find('[data-testid="import-run-mode"]').text()))
      .toEqual(['Writing', 'Non-writing', 'Writing']);
    expect(rows.map((row) => row.find('[data-testid="import-run-outcome"]').text()))
      .toEqual(['Success', 'Success', 'Failed']);
    expect(rows.map((row) => row.find('[data-testid="import-run-read"]').text()))
      .toEqual(['12', '5', '0']);
    expect(rows.map((row) => row.find('[data-testid="import-run-already-stored"]').text()))
      .toEqual(['9', '5', '0']);
    expect(rows.map((row) => row.find('[data-testid="import-run-written"]').text()))
      .toEqual(['3', '0', '0']);
    expect(rows.map((row) => row.find('[data-testid="import-run-categorised"]').text()))
      .toEqual(['2', '0', '0']);
    expect(rows[0]?.text()).toContain('2026-10-06 03:00:00 UTC');
    expect(rows[0]?.text()).toContain('Scheduled sync');
    expect(rows[1]?.text()).toContain('Manual import');
  });

  it('shows a screen-started run as a manual sync', async () => {
    mocks.useFetch.mockReturnValue(response([uiRun]));

    const wrapper = await mountSuspended(Imports);

    expect(wrapper.get('[data-testid="import-run"]').text()).toContain('Manual sync');
  });

  it('shows the failure reason of a failed run and nothing for a run without one', async () => {
    mocks.useFetch.mockReturnValue(response(runs));

    const wrapper = await mountSuspended(Imports);

    const reasons = wrapper.findAll('[data-testid="import-run-error"]');
    expect(reasons.map((cell) => cell.text())).toEqual([
      '',
      '',
      'the export could not be retrieved',
    ]);
  });

  it('states that no import has run when the log is empty', async () => {
    mocks.useFetch.mockReturnValue(response([]));

    const wrapper = await mountSuspended(Imports);

    expect(wrapper.find('[data-testid="imports-empty"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="import-run"]').exists()).toBe(false);
  });

  it('states that the log could not be loaded when the request fails', async () => {
    mocks.useFetch.mockReturnValue(response([], new Error('request failed')));

    const wrapper = await mountSuspended(Imports);

    expect(wrapper.find('[data-testid="imports-error"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="import-run"]').exists()).toBe(false);
  });

  it('posts to the sync endpoint, waits for the answer, and refreshes the log', async () => {
    const log = response(runs);
    mocks.useFetch.mockReturnValue(log);
    const answer = deferred<{ status: string }>();
    mocks.fetch.mockReturnValue(answer.promise);

    const wrapper = await mountSuspended(Imports);
    const button = wrapper.get('[data-testid="sync-button"]');
    expect(button.text()).toBe('Sync now');

    await button.trigger('click');

    expect(mocks.fetch).toHaveBeenCalledWith('/api/easybank/sync', { method: 'POST' });
    expect(button.attributes('disabled')).toBeDefined();
    expect(button.text()).toBe('Syncing…');
    expect(wrapper.find('[data-testid="sync-status"]').exists()).toBe(false);

    answer.resolve({ status: 'success' });
    await flushPromises();

    expect(button.attributes('disabled')).toBeUndefined();
    expect(button.text()).toBe('Sync now');
    expect(wrapper.get('[data-testid="sync-status"]').text()).toContain('The sync finished');
    expect(log.refresh).toHaveBeenCalledTimes(1);
  });

  it('ignores a second click while a request is in flight', async () => {
    mocks.useFetch.mockReturnValue(response(runs));
    const answer = deferred<{ status: string }>();
    mocks.fetch.mockReturnValue(answer.promise);

    const wrapper = await mountSuspended(Imports);
    const button = wrapper.get('[data-testid="sync-button"]');

    await button.trigger('click');
    await button.trigger('click');

    expect(mocks.fetch).toHaveBeenCalledTimes(1);

    answer.resolve({ status: 'success' });
    await flushPromises();

    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });

  it('states a failed sync and still refreshes the log', async () => {
    const log = response(runs);
    mocks.useFetch.mockReturnValue(log);
    mocks.fetch.mockResolvedValue({ status: 'failed' });

    const wrapper = await mountSuspended(Imports);
    await wrapper.get('[data-testid="sync-button"]').trigger('click');
    await flushPromises();

    expect(wrapper.get('[data-testid="sync-status"]').text()).toContain('The sync failed');
    expect(log.refresh).toHaveBeenCalledTimes(1);
  });

  it('states that the sync is not configured on the server', async () => {
    mocks.useFetch.mockReturnValue(response(runs));
    mocks.fetch.mockResolvedValue({ status: 'unconfigured' });

    const wrapper = await mountSuspended(Imports);
    await wrapper.get('[data-testid="sync-button"]').trigger('click');
    await flushPromises();

    expect(wrapper.get('[data-testid="sync-status"]').text()).toContain('not configured');
  });

  it('states that the sync could not be started when the request fails', async () => {
    mocks.useFetch.mockReturnValue(response(runs));
    mocks.fetch.mockRejectedValue(new Error('request failed'));

    const wrapper = await mountSuspended(Imports);
    await wrapper.get('[data-testid="sync-button"]').trigger('click');
    await flushPromises();

    expect(wrapper.get('[data-testid="sync-status"]').text()).toContain('could not be started');
  });

  it('posts to the re-categorise endpoint, waits for the answer, and shows the changed count', async () => {
    const log = response(runs);
    mocks.useFetch.mockReturnValue(log);
    const answer = deferred<{ changed: number }>();
    mocks.fetch.mockReturnValue(answer.promise);

    const wrapper = await mountSuspended(Imports);
    const button = wrapper.get('[data-testid="recategorise-button"]');
    expect(button.text()).toBe('Re-categorise all');

    await button.trigger('click');

    expect(mocks.fetch).toHaveBeenCalledWith('/api/categories/recategorise', { method: 'POST' });
    expect(button.attributes('disabled')).toBeDefined();
    expect(button.text()).toBe('Re-categorising…');
    expect(wrapper.find('[data-testid="recategorise-status"]').exists()).toBe(false);

    answer.resolve({ changed: 3 });
    await flushPromises();

    expect(button.attributes('disabled')).toBeUndefined();
    expect(button.text()).toBe('Re-categorise all');
    expect(wrapper.get('[data-testid="recategorise-status"]').text()).toContain('3 transactions changed');
    expect(log.refresh).not.toHaveBeenCalled();
  });

  it('ignores a second re-categorisation click while a request is in flight', async () => {
    mocks.useFetch.mockReturnValue(response(runs));
    const answer = deferred<{ changed: number }>();
    mocks.fetch.mockReturnValue(answer.promise);

    const wrapper = await mountSuspended(Imports);
    const button = wrapper.get('[data-testid="recategorise-button"]');

    await button.trigger('click');
    await button.trigger('click');

    expect(mocks.fetch).toHaveBeenCalledTimes(1);

    answer.resolve({ changed: 1 });
    await flushPromises();

    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });

  it('shows a count of zero changed transactions rather than a failure', async () => {
    mocks.useFetch.mockReturnValue(response(runs));
    mocks.fetch.mockResolvedValue({ changed: 0 });

    const wrapper = await mountSuspended(Imports);
    await wrapper.get('[data-testid="recategorise-button"]').trigger('click');
    await flushPromises();

    expect(wrapper.get('[data-testid="recategorise-status"]').text()).toContain('0 transactions changed');
  });

  it('reports a failed re-categorisation rather than a zero count', async () => {
    mocks.useFetch.mockReturnValue(response(runs));
    mocks.fetch.mockRejectedValue(new Error('request failed'));

    const wrapper = await mountSuspended(Imports);
    await wrapper.get('[data-testid="recategorise-button"]').trigger('click');
    await flushPromises();

    const status = wrapper.get('[data-testid="recategorise-status"]');
    expect(status.text()).toContain('could not be completed');
    expect(status.text()).not.toContain('0 transactions changed');
  });
});
