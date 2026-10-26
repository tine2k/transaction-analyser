<script setup lang="ts">
// The manage hub. It is a read-only directory of the three screens that are
// configured rather than read every day: People, Categories, and Imports. Each
// row shows the current state read from that screen's own endpoint and links to
// the screen; the hub starts no import and changes no stored data.
//
// The three reads are independent, and each row renders pending before error
// before empty before value, so a default empty list is never shown as "none"
// while the request is in flight.
//
// See openspec/changes/reorganise-navigation/specs/manage-hub/spec.md
import { IconChevronRight } from '@tabler/icons-vue';
import { displayImportTime, importOutcomeLabel } from '../utils/import-format';

type Person = { id: string };
type Category = { id: string };
type ImportRun = { id: string; startedAt: string; outcome: string };

const { data: people, error: peopleError, pending: peoplePending } =
  useFetch<Person[]>('/api/people', { default: () => [] });
const { data: categories, error: categoriesError, pending: categoriesPending } =
  useFetch<Category[]>('/api/categories', { default: () => [] });
const { data: runs, error: runsError, pending: runsPending } =
  useFetch<ImportRun[]>('/api/imports', { default: () => [] });

// The endpoint returns the recent runs newest first, so the first entry is the
// latest run.
const latestRun = computed(() => runs.value?.[0] ?? null);

function peopleStatus(): string {
  if (peoplePending.value) {
    return 'Loading…';
  }
  if (peopleError.value) {
    return 'Status unavailable';
  }
  const count = people.value?.length ?? 0;
  if (count === 0) {
    return 'No people yet';
  }
  return count === 1 ? '1 person' : `${count} people`;
}

function categoriesStatus(): string {
  if (categoriesPending.value) {
    return 'Loading…';
  }
  if (categoriesError.value) {
    return 'Status unavailable';
  }
  const count = categories.value?.length ?? 0;
  if (count === 0) {
    return 'No categories yet';
  }
  return count === 1 ? '1 category' : `${count} categories`;
}

function importsStatus(): string {
  if (runsPending.value) {
    return 'Loading…';
  }
  if (runsError.value) {
    return 'Status unavailable';
  }
  if (latestRun.value === null) {
    return 'No import has run yet';
  }
  return `Last run: ${importOutcomeLabel(latestRun.value.outcome)} · ${displayImportTime(latestRun.value.startedAt)}`;
}

// A failed run is both worded and coloured, so the failure does not depend on
// colour alone.
const importsFailed = computed(() =>
  !runsPending.value && !runsError.value && latestRun.value?.outcome === 'failed',
);
</script>

<template>
  <div>
    <h1 class="font-display text-2xl font-extrabold text-ink sm:text-3xl">Manage</h1>
    <p class="mt-2 max-w-2xl text-sm text-muted">
      The people, categories, and import runs you configure, with their current state.
    </p>

    <div
      class="mt-6 overflow-hidden rounded-panel-mobile bg-surface shadow-sheet sm:rounded-panel"
      data-testid="manage-sheet"
    >
      <NuxtLink
        to="/people"
        data-testid="manage-link-people"
        class="flex min-h-16 flex-col gap-1 px-4 py-4 transition-colors hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand sm:flex-row sm:items-center sm:gap-4 sm:px-6"
      >
        <span class="min-w-0 flex-1">
          <span class="block font-semibold text-ink">People</span>
          <span class="mt-0.5 block text-sm text-muted">The owners of transactions.</span>
        </span>
        <span class="flex min-w-0 items-center justify-between gap-3 sm:justify-end">
          <span class="min-w-0 text-sm text-muted sm:text-right" data-testid="manage-status-people">
            {{ peopleStatus() }}
          </span>
          <AppIcon :icon="IconChevronRight" class="text-muted" />
        </span>
      </NuxtLink>

      <NuxtLink
        to="/categories"
        data-testid="manage-link-categories"
        class="flex min-h-16 flex-col gap-1 border-t border-rule px-4 py-4 transition-colors hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand sm:flex-row sm:items-center sm:gap-4 sm:px-6"
      >
        <span class="min-w-0 flex-1">
          <span class="block font-semibold text-ink">Categories</span>
          <span class="mt-0.5 block text-sm text-muted">Matching rules and date windows.</span>
        </span>
        <span class="flex min-w-0 items-center justify-between gap-3 sm:justify-end">
          <span class="min-w-0 text-sm text-muted sm:text-right" data-testid="manage-status-categories">
            {{ categoriesStatus() }}
          </span>
          <AppIcon :icon="IconChevronRight" class="text-muted" />
        </span>
      </NuxtLink>

      <NuxtLink
        to="/imports"
        data-testid="manage-link-imports"
        class="flex min-h-16 flex-col gap-1 border-t border-rule px-4 py-4 transition-colors hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand sm:flex-row sm:items-center sm:gap-4 sm:px-6"
      >
        <span class="min-w-0 flex-1">
          <span class="block font-semibold text-ink">Imports</span>
          <span class="mt-0.5 block text-sm text-muted">
            Manual sync, re-categorisation, and the run log.
          </span>
        </span>
        <span class="flex min-w-0 items-center justify-between gap-3 sm:justify-end">
          <span
            class="min-w-0 break-words text-sm sm:text-right"
            :class="importsFailed ? 'text-failure' : 'text-muted'"
            data-testid="manage-status-imports"
          >
            {{ importsStatus() }}
          </span>
          <AppIcon :icon="IconChevronRight" class="text-muted" />
        </span>
      </NuxtLink>
    </div>
  </div>
</template>
