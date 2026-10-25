<script setup lang="ts">
// The people screen. It reads GET /api/people and writes through the same surface,
// refreshing the list from the server after every successful change. The list is
// the only source of people and counts: every row and number comes from the
// endpoint, and a failure is reported as a failure rather than as an empty list.
//
// The form is shared by create and rename. With no person being edited it creates;
// with one it renames that person, keeping its identity and every transaction that
// references it. Cancelling leaves the stored name and the list unchanged. There is
// no delete control, because a person is permanent.
//
// See openspec/changes/add-people/specs/person-management-screen/spec.md
import { IconCheck, IconPencil, IconPlus, IconX } from '@tabler/icons-vue';

type Person = {
  id: string;
  name: string;
  transactionCount: number;
};

const { data: people, error, pending, refresh } = useFetch<Person[]>('/api/people', {
  default: () => [],
});

// The screen orders its rows itself, case-insensitively by name and then by
// identity, so it does not depend on the endpoint's order.
const sortedPeople = computed(() =>
  [...(people.value ?? [])].sort((left, right) => {
    const byName = left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
    if (byName !== 0) {
      return byName;
    }
    const leftId = BigInt(left.id);
    const rightId = BigInt(right.id);
    return leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
  }),
);

const formElement = ref<HTMLFormElement | null>(null);
const name = ref('');
const editingId = ref<string | null>(null);
const saving = ref(false);
const formError = ref<string | null>(null);
const listError = ref<string | null>(null);

function messageOf(failure: unknown): string {
  const message = (failure as { data?: { message?: unknown } }).data?.message;
  return typeof message === 'string' && message !== '' ? message : 'The request could not be completed.';
}

function startEdit(person: Person): void {
  editingId.value = person.id;
  name.value = person.name;
  formError.value = null;
  void nextTick(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    formElement.value?.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  });
}

function cancelEdit(): void {
  editingId.value = null;
  name.value = '';
  formError.value = null;
}

async function submit(): Promise<void> {
  formError.value = null;
  if (name.value.trim() === '') {
    formError.value = 'Enter a name for the person.';
    return;
  }

  saving.value = true;
  try {
    const body = { name: name.value.trim() };
    if (editingId.value === null) {
      await $fetch('/api/people', { method: 'POST', body });
    } else {
      await $fetch(`/api/people/${editingId.value}`, { method: 'PUT', body });
    }
    cancelEdit();
    listError.value = null;
    await refresh();
  } catch (failure) {
    formError.value = messageOf(failure);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div>
    <h1 class="font-display text-2xl font-extrabold text-ink sm:text-3xl">People</h1>
    <p class="mt-2 max-w-2xl text-muted">
      Every transaction belongs to one person. A person is a name and a stable identity;
      renaming one keeps every transaction it owns, and there is no delete.
    </p>

    <form
      ref="formElement"
      class="mt-6 w-full min-w-0 max-w-2xl rounded-sheet border border-rule-strong bg-surface p-4"
      @submit.prevent="submit"
    >
      <h2 class="font-display text-lg font-semibold text-ink">
        {{ editingId === null ? 'Add a person' : 'Rename person' }}
      </h2>

      <label class="mt-3 flex min-w-0 flex-col text-sm text-muted">
        Name
        <input
          v-model="name"
          type="text"
          data-testid="person-name-input"
          autocomplete="off"
          class="mt-1 min-h-11 w-full min-w-0 rounded-sheet border border-rule-strong px-3 py-2 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        />
      </label>

      <p v-if="formError" class="mt-3 text-sm text-failure" data-testid="person-form-error" role="alert">
        {{ formError }}
      </p>

      <div class="mt-3 flex flex-wrap gap-2">
        <button
          type="submit"
          :disabled="saving"
          data-testid="person-submit"
          class="inline-flex min-h-11 items-center gap-2 rounded-sheet bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50"
        >
          <AppIcon :icon="editingId === null ? IconPlus : IconCheck" />
          {{ editingId === null ? 'Add person' : 'Save changes' }}
        </button>
        <button
          v-if="editingId !== null"
          type="button"
          data-testid="person-cancel"
          class="inline-flex min-h-11 items-center gap-2 rounded-sheet border border-rule-strong bg-surface px-3 py-2 text-sm font-medium text-ink hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          @click="cancelEdit"
        >
          <AppIcon :icon="IconX" />
          Cancel
        </button>
      </div>
    </form>

    <p v-if="error" class="mt-6 text-muted" data-testid="people-error">
      The people could not be loaded. They are not shown, and this is not an empty result.
    </p>

    <p v-else-if="pending" class="mt-6 text-muted">Loading people…</p>

    <p v-else-if="people.length === 0" class="mt-6 text-muted" data-testid="people-empty">
      There are no people to show.
    </p>

    <div v-else class="mt-6">
      <p v-if="listError" class="mb-3 text-sm text-failure" data-testid="people-list-error">{{ listError }}</p>
      <p id="people-scroll-help" class="mb-2 text-xs text-muted sm:hidden">
        Scroll horizontally to view every person and action.
      </p>
      <div
        role="region"
        aria-label="People table"
        aria-describedby="people-scroll-help"
        tabindex="0"
        data-testid="people-scroll"
        class="max-w-full overflow-x-auto rounded-sheet border border-rule-strong bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <table class="w-max min-w-full border-collapse text-left text-sm" data-testid="people-table">
          <caption class="sr-only">
            Every person with the number of transactions that reference them
          </caption>
          <thead>
            <tr class="border-b border-rule-strong">
              <th scope="col" class="px-3 py-2 align-middle font-semibold text-ink">Name</th>
              <th scope="col" class="px-3 py-2 align-middle text-right font-semibold text-ink">
                Transactions
              </th>
              <th scope="col" class="px-3 py-2 align-middle font-semibold text-ink">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="person in sortedPeople"
              :key="person.id"
              class="border-b border-rule"
              data-testid="person-row"
              :data-person-id="person.id"
            >
              <td class="px-3 py-2 align-middle text-ink" data-testid="person-name">
                {{ person.name }}
              </td>
              <td
                class="px-3 py-2 align-middle text-right tabular-nums text-ink"
                data-testid="person-count"
              >
                {{ person.transactionCount }}
              </td>
              <td class="px-3 py-2 align-middle">
                <button
                  type="button"
                  data-testid="person-edit"
                  class="inline-flex min-h-11 items-center justify-center gap-2 rounded-sheet border border-rule-strong bg-surface px-3 text-xs font-medium text-ink hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  @click="startEdit(person)"
                >
                  <AppIcon :icon="IconPencil" />
                  Rename
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
