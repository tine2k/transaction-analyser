<script setup lang="ts">
// The category management screen. It reads GET /api/categories and writes through
// the same surface, refreshing the list from the server after every successful
// change. It never assumes a write succeeded: the list only changes when the server
// confirms it, and a failure is reported in its own place. No regular expression is
// evaluated here — matching is done by the server.
//
// A category carries one or more regular expressions, so the form holds a list of
// expression inputs with add and remove controls. The form is shared by create and
// edit: with no category being edited it creates, and with one it replaces that
// category's name and expressions.
//
// See openspec/changes/allow-multiple-category-expressions/specs/category-management-screen/spec.md
type Category = { id: string; name: string; patterns: string[] };

const { data: categories, error, pending, refresh } = useFetch<Category[]>('/api/categories', {
  default: () => [],
});

const name = ref('');
const patterns = ref<string[]>(['']);
const editingId = ref<string | null>(null);
const saving = ref(false);
const formError = ref<string | null>(null);
const listError = ref<string | null>(null);

function messageOf(failure: unknown): string {
  const message = (failure as { data?: { message?: unknown } }).data?.message;
  return typeof message === 'string' && message !== '' ? message : 'The request could not be completed.';
}

function startEdit(category: Category): void {
  editingId.value = category.id;
  name.value = category.name;
  patterns.value = category.patterns.length > 0 ? [...category.patterns] : [''];
  formError.value = null;
}

function cancelEdit(): void {
  editingId.value = null;
  name.value = '';
  patterns.value = [''];
  formError.value = null;
}

function addPattern(): void {
  patterns.value.push('');
}

function removePattern(index: number): void {
  // Keep at least one expression field, so the form never submits an empty list.
  if (patterns.value.length > 1) {
    patterns.value.splice(index, 1);
  }
}

// The expressions the user actually entered. A blank field that was never filled
// in is not an expression, so it is not sent; every entered expression is sent
// exactly as typed.
function enteredPatterns(): string[] {
  return patterns.value.filter((pattern) => pattern !== '');
}

async function submit(): Promise<void> {
  formError.value = null;
  const submitted = enteredPatterns();
  if (submitted.length === 0) {
    formError.value = 'Enter at least one regular expression.';
    return;
  }
  saving.value = true;
  try {
    if (editingId.value === null) {
      await $fetch('/api/categories', {
        method: 'POST',
        body: { name: name.value, patterns: submitted },
      });
    } else {
      await $fetch(`/api/categories/${editingId.value}`, {
        method: 'PUT',
        body: { name: name.value, patterns: submitted },
      });
    }
    cancelEdit();
    await refresh();
  } catch (failure) {
    formError.value = messageOf(failure);
  } finally {
    saving.value = false;
  }
}

async function remove(category: Category): Promise<void> {
  const confirmed = window.confirm(
    `Delete "${category.name}"? Transactions it matches may be re-categorised.`,
  );
  if (!confirmed) {
    return;
  }
  listError.value = null;
  try {
    await $fetch(`/api/categories/${category.id}`, { method: 'DELETE' });
    await refresh();
  } catch (failure) {
    listError.value = messageOf(failure);
  }
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-slate-900">Categories</h1>
    <p class="mt-2 text-slate-600">
      A category is a name and one or more regular expressions matched against a transaction's
      purpose line. A transaction is categorised when any one of them matches.
    </p>

    <form class="mt-6 max-w-2xl rounded-lg border border-slate-200 bg-white p-4" @submit.prevent="submit">
      <h2 class="text-sm font-semibold text-slate-700">
        {{ editingId === null ? 'Add a category' : 'Edit category' }}
      </h2>

      <label class="mt-3 flex flex-col text-sm text-slate-700">
        Name
        <input
          v-model="name"
          type="text"
          class="mt-1 rounded-md border border-slate-300 px-3 py-2 text-slate-900"
        />
      </label>

      <fieldset class="mt-3">
        <legend class="text-sm text-slate-700">Regular expressions</legend>
        <div
          v-for="(_, index) in patterns"
          :key="index"
          class="mt-2 flex items-center gap-2"
        >
          <input
            v-model="patterns[index]"
            type="text"
            class="flex-1 rounded-md border border-slate-300 px-3 py-2 font-mono text-slate-900"
          />
          <button
            type="button"
            :disabled="patterns.length === 1"
            class="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 disabled:opacity-50"
            @click="removePattern(index)"
          >
            Remove
          </button>
        </div>
        <button
          type="button"
          class="mt-2 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700"
          @click="addPattern"
        >
          Add expression
        </button>
      </fieldset>

      <p v-if="formError" class="mt-3 text-sm text-red-700">{{ formError }}</p>

      <div class="mt-3 flex gap-2">
        <button
          type="submit"
          :disabled="saving"
          class="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {{ editingId === null ? 'Add category' : 'Save changes' }}
        </button>
        <button
          v-if="editingId !== null"
          type="button"
          class="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
          @click="cancelEdit"
        >
          Cancel
        </button>
      </div>
    </form>

    <p v-if="error" class="mt-6 text-slate-600">
      The categories could not be loaded. They are not shown, and this is not an empty result.
    </p>

    <p v-else-if="pending" class="mt-6 text-slate-600">Loading categories…</p>

    <p v-else-if="categories.length === 0" class="mt-6 text-slate-600">
      There are no categories to show.
    </p>

    <div v-else class="mt-6">
      <p v-if="listError" class="mb-3 text-sm text-red-700">{{ listError }}</p>
      <table class="w-full border-collapse text-left text-sm">
        <thead>
          <tr class="border-b border-slate-200">
            <th scope="col" class="px-3 py-2 font-semibold text-slate-700">Name</th>
            <th scope="col" class="px-3 py-2 font-semibold text-slate-700">Regular expressions</th>
            <th scope="col" class="px-3 py-2 font-semibold text-slate-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="category in categories" :key="category.id" class="border-b border-slate-100">
            <td class="px-3 py-2 align-top text-slate-900">{{ category.name }}</td>
            <td class="px-3 py-2 align-top font-mono text-slate-900">
              <div v-for="(pattern, index) in category.patterns" :key="index">{{ pattern }}</div>
            </td>
            <td class="px-3 py-2 align-top">
              <div class="flex gap-2">
                <button
                  type="button"
                  class="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700"
                  @click="startEdit(category)"
                >
                  Edit
                </button>
                <button
                  type="button"
                  class="rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-700"
                  @click="remove(category)"
                >
                  Delete
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
