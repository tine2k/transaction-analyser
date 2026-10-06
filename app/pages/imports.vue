<script setup lang="ts">
// The import log screen. It reads GET /api/imports and shows the most recent
// import runs, newest first: when each ran, whether it was the scheduled sync or a
// manual import, whether it wrote, what it read / already stored / wrote, and the
// reason when it failed. It derives nothing from transactions and invents no run;
// it shows only what the endpoint returned.
//
// See openspec/changes/add-easybank-sync/specs/import-log/spec.md
type ImportRun = {
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

const { data: runs, error, pending } = useFetch<ImportRun[]>('/api/imports', {
  default: () => [],
});

// The endpoint writes UTC instants in a fixed form, so the screen renders them
// without a locale-dependent Date parse.
function displayTime(value: string | null): string {
  if (value === null) {
    return '—';
  }
  return value.replace('T', ' ').replace('Z', ' UTC');
}

function sourceLabel(source: string): string {
  if (source === 'scheduled') {
    return 'Scheduled sync';
  }
  if (source === 'manual') {
    return 'Manual import';
  }
  return source;
}

function outcomeLabel(run: ImportRun): string {
  if (run.outcome === 'in_progress') {
    return 'In progress';
  }
  if (run.outcome === 'success') {
    return 'Success';
  }
  if (run.outcome === 'failed') {
    return 'Failed';
  }
  return run.outcome;
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-slate-900">Imports</h1>
    <p class="mt-2 text-sm text-slate-600">
      The most recent import runs, newest first, whether they wrote or only checked.
    </p>

    <p v-if="error" class="mt-4 text-slate-600" data-testid="imports-error">
      The import log could not be loaded.
    </p>
    <p v-else-if="pending" class="mt-4 text-slate-600">Loading the import log…</p>
    <p v-else-if="runs.length === 0" class="mt-4 text-slate-600" data-testid="imports-empty">
      No import has run yet.
    </p>
    <div
      v-else
      role="region"
      aria-label="Import log"
      tabindex="0"
      class="mt-6 max-w-full overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
      data-testid="imports-scroll"
    >
      <table class="w-max min-w-full border-collapse text-left text-sm" data-testid="imports-table">
        <caption class="sr-only">
          The most recent import runs with their source, outcome, and row counts
        </caption>
        <thead>
          <tr class="border-b border-slate-300">
            <th scope="col" class="whitespace-nowrap px-3 py-2 font-semibold text-slate-900">Started</th>
            <th scope="col" class="whitespace-nowrap px-3 py-2 font-semibold text-slate-900">Source</th>
            <th scope="col" class="whitespace-nowrap px-3 py-2 font-semibold text-slate-900">Mode</th>
            <th scope="col" class="whitespace-nowrap px-3 py-2 font-semibold text-slate-900">Outcome</th>
            <th scope="col" class="whitespace-nowrap px-3 py-2 text-right font-semibold text-slate-900">Read</th>
            <th scope="col" class="whitespace-nowrap px-3 py-2 text-right font-semibold text-slate-900">
              Already stored
            </th>
            <th scope="col" class="whitespace-nowrap px-3 py-2 text-right font-semibold text-slate-900">Written</th>
            <th scope="col" class="px-3 py-2 font-semibold text-slate-900">Reason</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="run in runs"
            :key="run.id"
            class="border-b border-slate-100 odd:bg-white even:bg-slate-50"
            data-testid="import-run"
          >
            <th scope="row" class="whitespace-nowrap px-3 py-2 font-medium tabular-nums text-slate-700">
              {{ displayTime(run.startedAt) }}
            </th>
            <td class="whitespace-nowrap px-3 py-2 text-slate-900">{{ sourceLabel(run.source) }}</td>
            <td class="whitespace-nowrap px-3 py-2 text-slate-900" data-testid="import-run-mode">
              {{ run.nonWriting ? 'Non-writing' : 'Writing' }}
            </td>
            <td class="whitespace-nowrap px-3 py-2 text-slate-900" data-testid="import-run-outcome">
              {{ outcomeLabel(run) }}
            </td>
            <td
              class="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-900"
              data-testid="import-run-read"
            >
              {{ run.rowsRead }}
            </td>
            <td
              class="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-900"
              data-testid="import-run-already-stored"
            >
              {{ run.rowsAlreadyStored }}
            </td>
            <td
              class="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-900"
              data-testid="import-run-written"
            >
              {{ run.rowsWritten }}
            </td>
            <td class="px-3 py-2 text-slate-700" data-testid="import-run-error">{{ run.error ?? '' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
