import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ useFetch: vi.fn() }));

mockNuxtImport('useFetch', () => mocks.useFetch);

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
    error: 'the export could not be retrieved',
  },
];

describe('imports page', () => {
  beforeEach(() => {
    mocks.useFetch.mockReset();
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
    expect(rows[0]?.text()).toContain('2026-10-06 03:00:00 UTC');
    expect(rows[0]?.text()).toContain('Scheduled sync');
    expect(rows[1]?.text()).toContain('Manual import');
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
});
