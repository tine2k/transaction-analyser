<script setup lang="ts">
// The import log screen. It reads GET /api/imports and shows the most recent
// import runs, newest first: when each ran, whether it was the scheduled sync or a
// manual import, the person it imported into, whether it wrote, what it read /
// already stored / wrote, and the reason when it failed. A run recorded before the
// person extension reads as not recorded. It derives nothing from transactions and
// invents no run; it shows only what the endpoint returned.
//
// Its Sync now control starts the same sync the nightly schedule runs through
// POST /api/easybank/sync, waits for the answer, then refreshes the log so the
// run it recorded appears.
//
// Its Re-categorise all control re-evaluates every stored transaction through
// POST /api/categories/recategorise and shows the returned number of changed
// transactions. The operation records no run, so the log is not refreshed, and
// the count is a transient message rather than stored data.
//
// Its Send test notification control asks the server to send one fixed test
// message through Pushover, so the configured credentials can be verified
// without waiting for a sync. It shows the returned outcome — sent, not
// configured, or a failure with its reason — and starts no import, so the log
// is not refreshed.
//
// See openspec/changes/add-easybank-sync-button/specs/easybank-sync/spec.md
// and openspec/changes/match-counterparty-and-recategorise/specs/category-recategorisation/spec.md
// and openspec/changes/add-pushover-test-button/specs/import-notification/spec.md
import { IconRefresh, IconSend, IconSparkles } from '@tabler/icons-vue';
import { displayImportTime, importOutcomeLabel } from '../utils/import-format';

type ImportRun = {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  source: string;
  person: { id: string; name: string } | null;
  nonWriting: boolean;
  outcome: string;
  rowsRead: number;
  rowsAlreadyStored: number;
  rowsWritten: number;
  rowsCategorised: number;
  error: string | null;
};

const { data: runs, error, pending, refresh } = useFetch<ImportRun[]>('/api/imports', {
  default: () => [],
});

const syncing = ref(false);
const syncMessage = ref<string | null>(null);
const recategorising = ref(false);
const recategoriseMessage = ref<string | null>(null);
const testing = ref(false);
const testMessage = ref<string | null>(null);

// The server refuses overlapping runs and answers with the run's outcome; a
// click while a request is in flight is ignored here as well.
async function startSync(): Promise<void> {
  if (syncing.value) {
    return;
  }
  syncing.value = true;
  syncMessage.value = null;
  try {
    const answer = await $fetch<{ status: string }>('/api/easybank/sync', { method: 'POST' });
    if (answer.status === 'success') {
      syncMessage.value = 'The sync finished. The newest run is below.';
    } else if (answer.status === 'failed') {
      syncMessage.value = 'The sync failed. The newest run below states the reason.';
    } else if (answer.status === 'unconfigured') {
      syncMessage.value = 'The sync is not configured on the server.';
    } else {
      syncMessage.value = 'The sync answered an unknown outcome.';
    }
  } catch {
    syncMessage.value = 'The sync could not be started.';
  } finally {
    syncing.value = false;
    await refresh();
  }
}

// The server re-evaluates every stored transaction and answers with the number
// whose category changed. The operation records no run, so the log is not
// refreshed; the count is a transient message and is never stored.
async function recategorise(): Promise<void> {
  if (recategorising.value) {
    return;
  }
  recategorising.value = true;
  recategoriseMessage.value = null;
  try {
    const answer = await $fetch<{ changed: number }>('/api/categories/recategorise', { method: 'POST' });
    recategoriseMessage.value = answer.changed === 1
      ? '1 transaction changed.'
      : `${answer.changed} transactions changed.`;
  } catch {
    recategoriseMessage.value = 'The re-categorisation could not be completed.';
  } finally {
    recategorising.value = false;
  }
}

// The server sends one fixed test message through Pushover using the
// environment credentials and answers whether it was sent, whether the
// configuration is absent, or why it failed. A click while a request is in
// flight is ignored here as well.
async function testNotification(): Promise<void> {
  if (testing.value) {
    return;
  }
  testing.value = true;
  testMessage.value = null;
  try {
    const answer = await $fetch<{ status: string; reason?: string }>(
      '/api/imports/test-notification',
      { method: 'POST' },
    );
    if (answer.status === 'sent') {
      testMessage.value = 'The test message was sent.';
    } else if (answer.status === 'unconfigured') {
      testMessage.value = 'Pushover is not configured on the server.';
    } else if (answer.status === 'failed') {
      testMessage.value = `The test failed: ${answer.reason ?? 'no reason was given'}.`;
    } else {
      testMessage.value = 'The test answered an unknown outcome.';
    }
  } catch {
    testMessage.value = 'The test message could not be sent.';
  } finally {
    testing.value = false;
  }
}

function sourceLabel(source: string): string {
  if (source === 'scheduled') {
    return 'Scheduled sync';
  }
  if (source === 'manual') {
    return 'Manual import';
  }
  if (source === 'ui') {
    return 'Manual sync';
  }
  return source;
}

</script>

<template>
  <div>
    <h1 class="font-display text-2xl font-extrabold text-ink sm:text-3xl">Imports</h1>
    <p class="mt-2 max-w-2xl text-sm text-muted">
      The most recent import runs, newest first, whether they wrote or only checked.
    </p>

    <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-3">
      <div class="flex flex-wrap items-center gap-3">
        <button
          type="button"
          class="inline-flex min-h-11 items-center gap-2 rounded-sheet bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="sync-button"
          :disabled="syncing"
          @click="startSync"
        >
          <AppIcon :icon="IconRefresh" />
          {{ syncing ? 'Syncing…' : 'Sync now' }}
        </button>
        <p
          v-if="syncMessage !== null"
          class="text-sm text-muted"
          data-testid="sync-status"
          role="status"
        >
          {{ syncMessage }}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <button
          type="button"
          class="inline-flex min-h-11 items-center gap-2 rounded-sheet border border-rule-strong bg-surface px-4 py-2 text-sm font-medium text-ink hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="recategorise-button"
          :disabled="recategorising"
          @click="recategorise"
        >
          <AppIcon :icon="IconSparkles" />
          {{ recategorising ? 'Re-categorising…' : 'Re-categorise all' }}
        </button>
        <p
          v-if="recategoriseMessage !== null"
          class="text-sm text-muted"
          data-testid="recategorise-status"
          role="status"
        >
          {{ recategoriseMessage }}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <button
          type="button"
          class="inline-flex min-h-11 items-center gap-2 rounded-sheet border border-rule-strong bg-surface px-4 py-2 text-sm font-medium text-ink hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="test-notification-button"
          :disabled="testing"
          @click="testNotification"
        >
          <AppIcon :icon="IconSend" />
          {{ testing ? 'Sending…' : 'Send test notification' }}
        </button>
        <p
          v-if="testMessage !== null"
          class="text-sm text-muted"
          data-testid="test-notification-status"
          role="status"
        >
          {{ testMessage }}
        </p>
      </div>
    </div>

    <p v-if="error" class="mt-4 text-muted" data-testid="imports-error">
      The import log could not be loaded.
    </p>
    <p v-else-if="pending" class="mt-4 text-muted">Loading the import log…</p>
    <p v-else-if="runs.length === 0" class="mt-4 text-muted" data-testid="imports-empty">
      No import has run yet.
    </p>
    <div
      v-else
      role="region"
      aria-label="Import log"
      tabindex="0"
      class="mt-6 max-w-full overflow-x-auto rounded-sheet border border-rule-strong bg-surface shadow-sheet focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      data-testid="imports-scroll"
    >
      <table class="w-max min-w-full border-collapse text-left text-sm" data-testid="imports-table">
        <caption class="sr-only">
          The most recent import runs with their source, person, outcome, and row counts
        </caption>
        <thead>
          <tr class="border-b border-rule-strong">
            <th scope="col" class="whitespace-nowrap px-3 py-2 font-semibold text-ink">Started</th>
            <th scope="col" class="whitespace-nowrap px-3 py-2 font-semibold text-ink">Source</th>
            <th scope="col" class="whitespace-nowrap px-3 py-2 font-semibold text-ink">Person</th>
            <th scope="col" class="whitespace-nowrap px-3 py-2 font-semibold text-ink">Mode</th>
            <th scope="col" class="whitespace-nowrap px-3 py-2 font-semibold text-ink">Outcome</th>
            <th scope="col" class="whitespace-nowrap px-3 py-2 text-right font-semibold text-ink">Read</th>
            <th scope="col" class="whitespace-nowrap px-3 py-2 text-right font-semibold text-ink">
              Already stored
            </th>
            <th scope="col" class="whitespace-nowrap px-3 py-2 text-right font-semibold text-ink">Written</th>
            <th scope="col" class="whitespace-nowrap px-3 py-2 text-right font-semibold text-ink">
              Categorised
            </th>
            <th scope="col" class="px-3 py-2 font-semibold text-ink">Reason</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="run in runs"
            :key="run.id"
            class="border-b border-rule"
            data-testid="import-run"
          >
            <th scope="row" class="whitespace-nowrap px-3 py-2 font-mono font-medium text-ink">
              {{ displayImportTime(run.startedAt) }}
            </th>
            <td class="whitespace-nowrap px-3 py-2 text-ink">{{ sourceLabel(run.source) }}</td>
            <td class="whitespace-nowrap px-3 py-2 text-ink" data-testid="import-run-person">
              {{ run.person?.name ?? 'Not recorded' }}
            </td>
            <td class="whitespace-nowrap px-3 py-2 text-ink" data-testid="import-run-mode">
              {{ run.nonWriting ? 'Non-writing' : 'Writing' }}
            </td>
            <td
              class="whitespace-nowrap px-3 py-2"
              :class="run.outcome === 'failed' ? 'text-failure' : 'text-ink'"
              data-testid="import-run-outcome"
            >
              {{ importOutcomeLabel(run.outcome) }}
            </td>
            <td
              class="whitespace-nowrap px-3 py-2 text-right tabular-nums text-ink"
              data-testid="import-run-read"
            >
              {{ run.rowsRead }}
            </td>
            <td
              class="whitespace-nowrap px-3 py-2 text-right tabular-nums text-ink"
              data-testid="import-run-already-stored"
            >
              {{ run.rowsAlreadyStored }}
            </td>
            <td
              class="whitespace-nowrap px-3 py-2 text-right tabular-nums text-ink"
              data-testid="import-run-written"
            >
              {{ run.rowsWritten }}
            </td>
            <td
              class="whitespace-nowrap px-3 py-2 text-right tabular-nums text-ink"
              data-testid="import-run-categorised"
            >
              {{ run.rowsCategorised }}
            </td>
            <td
              class="px-3 py-2"
              :class="run.error !== null ? 'text-failure' : 'text-muted'"
              data-testid="import-run-error"
            >{{ run.error ?? '' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
