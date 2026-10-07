<script setup lang="ts">
// The category management screen. It reads GET /api/categories and writes through
// the same surface, refreshing the list from the server after every successful
// change. It never assumes a write succeeded: the list only changes when the server
// confirms it, and a failure is reported in its own place. No regular expression is
// evaluated here — matching is done by the server.
//
// A category carries regular expressions and date windows, so the form holds a list
// of expression inputs and a list of windows with add and remove controls. A window
// is entered with two native date inputs, which produce a full YYYY-MM-DD date with
// no time of day and no time-zone shift. The form is shared by create and edit: with
// no category being edited it creates, and with one it replaces that category's name,
// expressions, and windows.
//
// See openspec/changes/allow-multiple-category-expressions/specs/category-management-screen/spec.md
// and openspec/changes/add-category-date-windows/specs/category-management-screen/spec.md
type CategoryWindow = { from: string; to: string };
type Category = {
  id: string;
  name: string;
  patterns: string[];
  hidden: boolean;
  windows: CategoryWindow[];
};

const { data: categories, error, pending, refresh } = useFetch<Category[]>('/api/categories', {
  default: () => [],
});

const sortedCategories = computed(() =>
  [...(categories.value ?? [])].sort((left, right) => {
    const byName = left.name.localeCompare(right.name, undefined, { sensitivity: 'accent' });
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
const patterns = ref<string[]>(['']);
const windows = ref<CategoryWindow[]>([]);
const hidden = ref(false);
const editingId = ref<string | null>(null);
const saving = ref(false);
const formError = ref<string | null>(null);
const listError = ref<string | null>(null);
const matchCount = ref<number | null>(null);
const matchCountState = ref<'empty' | 'loading' | 'ready' | 'unavailable'>('empty');
const windowMatchCount = ref<number | null>(null);
const windowMatchState = ref<'empty' | 'loading' | 'ready' | 'unavailable'>('empty');
let previewGeneration = 0;
let previewTimer: ReturnType<typeof setTimeout> | null = null;
let windowPreviewGeneration = 0;
let windowPreviewTimer: ReturnType<typeof setTimeout> | null = null;

function messageOf(failure: unknown): string {
  const message = (failure as { data?: { message?: unknown } }).data?.message;
  return typeof message === 'string' && message !== '' ? message : 'The request could not be completed.';
}

function startEdit(category: Category): void {
  editingId.value = category.id;
  name.value = category.name;
  patterns.value = category.patterns.length > 0 ? [...category.patterns] : [''];
  windows.value = category.windows.map((window) => ({ ...window }));
  hidden.value = category.hidden;
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
  patterns.value = [''];
  windows.value = [];
  hidden.value = false;
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

function addWindow(): void {
  windows.value.push({ from: '', to: '' });
}

function removeWindow(index: number): void {
  windows.value.splice(index, 1);
}

// The expressions the user actually entered. A blank field that was never filled
// in is not an expression, so it is not sent; every entered expression is sent
// exactly as typed.
function enteredPatterns(): string[] {
  return patterns.value.filter((pattern) => pattern !== '');
}

// The windows the user actually entered. A window row that was never filled in at
// all is not a window, so it is not sent; a partially filled row is sent as entered
// and the server reports it as invalid rather than the browser guessing.
function enteredWindows(): CategoryWindow[] {
  return windows.value
    .filter((window) => window.from !== '' || window.to !== '')
    .map((window) => ({ from: window.from, to: window.to }));
}

// The complete windows, both dates entered, which the window-claim preview sends.
// A partial window is not previewed, because the server would only reject it.
function completeWindows(): CategoryWindow[] {
  return windows.value
    .filter((window) => window.from !== '' && window.to !== '')
    .map((window) => ({ from: window.from, to: window.to }));
}

async function loadMatchCount(generation: number, submitted: string[]): Promise<void> {
  try {
    const result = await $fetch<{ count: number }>('/api/categories/match-count', {
      method: 'POST',
      body: { patterns: submitted },
    });
    if (generation !== previewGeneration) {
      return;
    }
    if (!Number.isSafeInteger(result.count) || result.count < 0) {
      matchCount.value = null;
      matchCountState.value = 'unavailable';
      return;
    }
    matchCount.value = result.count;
    matchCountState.value = 'ready';
  } catch {
    if (generation === previewGeneration) {
      matchCount.value = null;
      matchCountState.value = 'unavailable';
    }
  }
}

watch(patterns, (currentPatterns) => {
  const generation = ++previewGeneration;
  if (previewTimer !== null) {
    clearTimeout(previewTimer);
    previewTimer = null;
  }

  const submitted = currentPatterns.filter((pattern) => pattern !== '');
  matchCount.value = null;
  if (submitted.length === 0) {
    matchCountState.value = 'empty';
    return;
  }

  matchCountState.value = 'loading';
  previewTimer = setTimeout(() => {
    previewTimer = null;
    void loadMatchCount(generation, [...submitted]);
  }, 250);
}, { deep: true, flush: 'sync' });

// The window-claim preview is separate from the expression preview. It sends only
// the complete windows the user entered and shows the server's combined count of
// the transactions those windows would claim — those whose booking date falls in a
// window and whose purpose line no stored expression matches. The browser tests no
// date and evaluates no expression.
async function loadWindowMatchCount(generation: number, submitted: CategoryWindow[]): Promise<void> {
  try {
    const result = await $fetch<{ count: number }>('/api/categories/window-match-count', {
      method: 'POST',
      body: { windows: submitted },
    });
    if (generation !== windowPreviewGeneration) {
      return;
    }
    if (!Number.isSafeInteger(result.count) || result.count < 0) {
      windowMatchCount.value = null;
      windowMatchState.value = 'unavailable';
      return;
    }
    windowMatchCount.value = result.count;
    windowMatchState.value = 'ready';
  } catch {
    if (generation === windowPreviewGeneration) {
      windowMatchCount.value = null;
      windowMatchState.value = 'unavailable';
    }
  }
}

watch(windows, (currentWindows) => {
  const generation = ++windowPreviewGeneration;
  if (windowPreviewTimer !== null) {
    clearTimeout(windowPreviewTimer);
    windowPreviewTimer = null;
  }

  const submitted = currentWindows.filter((window) => window.from !== '' && window.to !== '');
  windowMatchCount.value = null;
  if (submitted.length === 0) {
    windowMatchState.value = 'empty';
    return;
  }

  windowMatchState.value = 'loading';
  windowPreviewTimer = setTimeout(() => {
    windowPreviewTimer = null;
    void loadWindowMatchCount(generation, submitted.map((window) => ({ ...window })));
  }, 250);
}, { deep: true, flush: 'sync' });

onBeforeUnmount(() => {
  previewGeneration += 1;
  windowPreviewGeneration += 1;
  if (previewTimer !== null) {
    clearTimeout(previewTimer);
  }
  if (windowPreviewTimer !== null) {
    clearTimeout(windowPreviewTimer);
  }
});

async function submit(): Promise<void> {
  formError.value = null;
  const submitted = enteredPatterns();
  const submittedWindows = enteredWindows();
  if (submitted.length === 0 && submittedWindows.length === 0) {
    formError.value = 'Enter at least one regular expression or date window.';
    return;
  }
  saving.value = true;
  try {
    if (editingId.value === null) {
      await $fetch('/api/categories', {
        method: 'POST',
        body: { name: name.value, patterns: submitted, hidden: hidden.value, windows: submittedWindows },
      });
    } else {
      await $fetch(`/api/categories/${editingId.value}`, {
        method: 'PUT',
        body: { name: name.value, patterns: submitted, hidden: hidden.value, windows: submittedWindows },
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
      A category is a name with regular expressions matched against a transaction's purpose line
      and optional from/to date windows matched against its booking date. An expression is applied
      first; a date window is applied only when no expression matches. Both window dates are
      inclusive.
    </p>

    <form
      ref="formElement"
      class="mt-6 w-full min-w-0 max-w-2xl rounded-lg border border-slate-200 bg-white p-4"
      @submit.prevent="submit"
    >
      <h2 class="text-sm font-semibold text-slate-700">
        {{ editingId === null ? 'Add a category' : 'Edit category' }}
      </h2>

      <label class="mt-3 flex min-w-0 flex-col text-sm text-slate-700">
        Name
        <input
          v-model="name"
          type="text"
          class="mt-1 min-h-11 w-full min-w-0 rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
        />
      </label>

      <fieldset class="mt-3 min-w-0">
        <legend class="text-sm text-slate-700">Regular expressions</legend>
        <div
          v-for="(_, index) in patterns"
          :key="index"
          class="mt-2 flex min-w-0 items-center gap-2"
        >
          <input
            v-model="patterns[index]"
            type="text"
            data-testid="pattern-input"
            class="min-h-11 min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 font-mono text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
          />
          <button
            type="button"
            :disabled="patterns.length === 1"
            class="min-h-11 shrink-0 rounded-md border border-slate-300 px-3 text-xs font-medium text-slate-700 disabled:opacity-50"
            @click="removePattern(index)"
          >
            Remove
          </button>
        </div>
        <button
          type="button"
          class="mt-2 min-h-11 rounded-md border border-slate-300 px-3 text-xs font-medium text-slate-700"
          @click="addPattern"
        >
          Add expression
        </button>
      </fieldset>

      <fieldset class="mt-3 min-w-0">
        <legend class="text-sm text-slate-700">Date windows</legend>
        <p class="mt-1 text-xs text-slate-500">
          A transaction whose booking date falls on or between the two dates is assigned to this
          category when no regular expression matches it.
        </p>
        <div
          v-for="(_, index) in windows"
          :key="index"
          class="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
        >
          <label class="flex min-w-0 flex-col gap-1 text-xs text-slate-600">
            From
            <input
              v-model="windows[index].from"
              type="date"
              data-testid="window-from"
              class="min-h-11 w-full min-w-0 rounded-md border border-slate-300 px-2 py-1 text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
            >
          </label>
          <label class="flex min-w-0 flex-col gap-1 text-xs text-slate-600">
            To
            <input
              v-model="windows[index].to"
              type="date"
              data-testid="window-to"
              class="min-h-11 w-full min-w-0 rounded-md border border-slate-300 px-2 py-1 text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
            >
          </label>
          <button
            type="button"
            data-testid="remove-window"
            class="min-h-11 rounded-md border border-slate-300 px-3 text-xs font-medium text-slate-700"
            @click="removeWindow(index)"
          >
            Remove
          </button>
        </div>
        <button
          type="button"
          data-testid="add-window"
          class="mt-2 min-h-11 rounded-md border border-slate-300 px-3 text-xs font-medium text-slate-700"
          @click="addWindow"
        >
          Add window
        </button>
      </fieldset>

      <label class="mt-3 flex min-h-11 items-center gap-3 py-2 text-sm text-slate-700">
        <input
          v-model="hidden"
          type="checkbox"
          data-testid="hidden-input"
          class="size-5 rounded border-slate-300 text-slate-700 focus:ring-slate-500"
        >
        Hidden from the analysis
      </label>

      <p class="mt-3 text-sm text-slate-600" role="status" aria-live="polite" data-testid="pattern-match-count">
        <template v-if="matchCountState === 'empty'">
          Enter an expression to preview matching transactions.
        </template>
        <template v-else-if="matchCountState === 'loading'">
          Checking matching transactions…
        </template>
        <template v-else-if="matchCountState === 'ready'">
          Matches {{ matchCount }} stored transaction{{ matchCount === 1 ? '' : 's' }}.
        </template>
        <template v-else>
          Match count unavailable. You can still save this category.
        </template>
      </p>

      <p class="mt-2 text-sm text-slate-600" role="status" aria-live="polite" data-testid="window-match-count">
        <template v-if="windowMatchState === 'empty'">
          Enter a from and a to date to preview transactions the windows would claim.
        </template>
        <template v-else-if="windowMatchState === 'loading'">
          Checking transactions the windows claim…
        </template>
        <template v-else-if="windowMatchState === 'ready'">
          Windows claim {{ windowMatchCount }} stored transaction{{ windowMatchCount === 1 ? '' : 's' }}.
        </template>
        <template v-else>
          Window claim count unavailable. You can still save this category.
        </template>
      </p>

      <p v-if="formError" class="mt-3 text-sm text-red-700">{{ formError }}</p>

      <div class="mt-3 flex flex-wrap gap-2">
        <button
          type="submit"
          :disabled="saving"
          class="min-h-11 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {{ editingId === null ? 'Add category' : 'Save changes' }}
        </button>
        <button
          v-if="editingId !== null"
          type="button"
          class="min-h-11 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
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
      <p id="categories-scroll-help" class="mb-2 text-xs text-slate-500 sm:hidden">
        Scroll horizontally to view all category columns and actions.
      </p>
      <div
        role="region"
        aria-label="Category table"
        aria-describedby="categories-scroll-help"
        tabindex="0"
        data-testid="categories-scroll"
        class="max-w-full overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
      >
      <table class="w-max border-collapse text-left text-sm">
        <thead>
          <tr class="border-b border-slate-200">
            <th scope="col" class="px-3 py-2 align-middle font-semibold text-slate-700">Name</th>
            <th scope="col" class="px-3 py-2 align-middle font-semibold text-slate-700">Expression count</th>
            <th scope="col" class="px-3 py-2 align-middle font-semibold text-slate-700">Window count</th>
            <th scope="col" class="px-3 py-2 align-middle font-semibold text-slate-700">Analysis</th>
            <th scope="col" class="px-3 py-2 align-middle font-semibold text-slate-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="category in sortedCategories"
            :key="category.id"
            class="border-b border-slate-100 odd:bg-white even:bg-slate-50"
          >
            <td class="px-3 py-2 align-middle text-slate-900">{{ category.name }}</td>
            <td class="px-3 py-2 align-middle text-slate-900">{{ category.patterns.length }}</td>
            <td class="px-3 py-2 align-middle text-slate-900" data-testid="category-window-count">
              {{ category.windows.length }}
            </td>
            <td class="px-3 py-2 align-middle text-slate-900" data-testid="category-hidden-state">
              {{ category.hidden ? 'Hidden' : 'Visible' }}
            </td>
            <td class="px-3 py-2 align-middle">
              <div class="flex gap-2">
                <button
                  type="button"
                  class="min-h-11 rounded-md border border-slate-300 px-3 text-xs font-medium text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
                  @click="startEdit(category)"
                >
                  Edit
                </button>
                <button
                  type="button"
                  class="min-h-11 rounded-md border border-red-300 px-3 text-xs font-medium text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
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
  </div>
</template>
