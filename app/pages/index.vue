<script setup lang="ts">
import { formatEuroAmount, sumSignedAmountStrings } from '../utils/category-spending';

// The index route reads stored transactions from the read-only GET
// /api/transactions endpoint. Category and booking-period filters are derived
// from that response and represented in the route query. The values are
// presented exactly as returned: amounts remain signed decimal strings, and
// dates remain day-precise strings.
//
// `useFetch` is not awaited: the page is rendered in the browser, so the read
// runs on the client and the template's pending state shows while it is in
// flight.
//
// The page also carries the transaction pattern shortcut. A selection of at
// least three characters inside one table cell raises a fixed action bar that
// names the captured text, previews the stored transactions the text matches,
// and offers the stored categories. Choosing a category appends the text as a
// literal pattern through the category management surface; the browser never
// evaluates an expression and never assigns a category itself. Appends may
// overlap: each affected row carries a marker until one coalesced background
// read reflects the result, and the table's own loading state is never used for
// a refresh.
//
// The page also offers manual category assignment. Every row's category cell
// hosts a select that pins the row to a chosen category or clears the pin by
// choosing Uncategorised; a selection column with a select-all control backs the
// fixed bulk bar, which assigns one category to every selected row. The
// assignment writes go through the manual-category-assignment endpoint, share
// the row markers and the coalesced refresh with the shortcut, and the two fixed
// bars render in one bottom stack so they never overlap.
//
// See openspec/changes/add-transactions-table/specs/transaction-table/spec.md,
// openspec/changes/disable-server-side-rendering/specs/frontend-shell/spec.md,
// openspec/changes/add-transaction-pattern-shortcut/specs/transaction-pattern-shortcut/spec.md,
// and openspec/changes/add-manual-category-assignment/specs/manual-category-assignment/spec.md
type Category = { id: string; name: string };

type Transaction = {
  id: string;
  bookingDate: string;
  valueDate: string;
  amount: string;
  purpose: string;
  counterpartyName: string;
  counterpartyAccount: string | null;
  categoryAssignment: 'manual' | 'automatic';
  category: Category | null;
};

// A category as the management surface returns it. The shortcut only offers the
// name and marks the hidden flag; the full shape is kept so an append response
// can replace the entry in place without another read.
type StoredCategory = {
  id: string;
  name: string;
  patterns: string[];
  hidden: boolean;
  windows: Array<{ from: string; to: string }>;
};

type CapturedSelection = { text: string; transactionId: string };

const { data: transactions, error, pending } = useFetch<Transaction[]>('/api/transactions');
const { data: storedCategories } = useFetch<StoredCategory[]>('/api/categories', {
  default: () => [],
});
const router = useRouter();
const route = router.currentRoute;

function queryString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function isMonthKey(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function monthLabel(key: string): string {
  return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${key}-01T00:00:00Z`));
}

const categories = computed(() => {
  const byId = new Map<string, Category>();
  for (const transaction of transactions.value ?? []) {
    if (transaction.category !== null) {
      byId.set(transaction.category.id, transaction.category);
    }
  }
  return [...byId.values()].sort((left, right) =>
    left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
    || left.id.localeCompare(right.id, undefined, { numeric: true }),
  );
});

type PeriodOption = { value: string; label: string };
type PeriodGroups = { years: PeriodOption[]; months: PeriodOption[] };

function isYearKey(value: string): boolean {
  return /^\d{4}$/.test(value);
}

// The period choices come from the returned transactions alone: represented
// calendar years newest first under a years group, and represented calendar
// months newest first under a months group.
const periods = computed<PeriodGroups>(() => {
  const monthsByYear = new Map<string, Set<string>>();
  for (const { bookingDate } of transactions.value ?? []) {
    const year = bookingDate.slice(0, 4);
    const month = bookingDate.slice(0, 7);
    if (!isYearKey(year) || !isMonthKey(month)) {
      continue;
    }
    let months = monthsByYear.get(year);
    if (months === undefined) {
      months = new Set();
      monthsByYear.set(year, months);
    }
    months.add(month);
  }

  const years: PeriodOption[] = [];
  const months: PeriodOption[] = [];
  for (const year of [...monthsByYear.keys()].sort((left, right) => right.localeCompare(left))) {
    years.push({ value: year, label: year });
    for (const month of [...(monthsByYear.get(year) ?? [])].sort((left, right) => right.localeCompare(left))) {
      months.push({ value: month, label: monthLabel(month) });
    }
  }
  return { years, months };
});

function categoryFromQuery(): string {
  const requested = queryString(route.value.query.category);
  if (requested === 'all' || requested === 'uncategorised') {
    return requested;
  }
  return requested !== undefined && categories.value.some(({ id }) => id === requested)
    ? requested
    : 'uncategorised';
}

function periodFromQuery(): string {
  const options = [...periods.value.years, ...periods.value.months];
  for (const key of ['month', 'year'] as const) {
    const requested = queryString(route.value.query[key]);
    if (requested !== undefined && options.some(({ value }) => value === requested)) {
      return requested;
    }
  }
  return 'all';
}

const selectedCategory = ref('uncategorised');
const selectedPeriod = ref('all');

const categoryFilter = computed({
  get: () => selectedCategory.value,
  set(value: string) {
    selectedCategory.value = value;
    setCategoryQuery(value);
  },
});

const periodFilter = computed({
  get: () => selectedPeriod.value,
  set(value: string) {
    selectedPeriod.value = value;
    setPeriodQuery(value);
  },
});

function setCategoryQuery(value: string): void {
  const query = { ...route.value.query, category: value };
  void router.replace({ path: '/', query });
}

function setPeriodQuery(value: string): void {
  const query = { ...route.value.query };
  delete query.month;
  delete query.year;
  if (isYearKey(value)) {
    query.year = value;
  } else if (value !== 'all') {
    query.month = value;
  }
  void router.replace({ path: '/', query });
}

watch(
  () => [
    route.value.query.category,
    route.value.query.month,
    route.value.query.year,
    categories.value,
    periods.value,
  ],
  () => {
    selectedCategory.value = categoryFromQuery();
    selectedPeriod.value = periodFromQuery();
  },
  { immediate: true },
);

const uncategorisedTransactions = computed(() =>
  (transactions.value ?? []).filter((transaction) => transaction.category === null),
);

function matchesPeriod(bookingDate: string, period: string): boolean {
  if (period === 'all') {
    return true;
  }
  return isYearKey(period)
    ? bookingDate.slice(0, 4) === period
    : bookingDate.slice(0, 7) === period;
}

const visibleTransactions = computed(() =>
  (transactions.value ?? []).filter((transaction) => {
    const categoryMatches = categoryFilter.value === 'all'
      || (categoryFilter.value === 'uncategorised'
        ? transaction.category === null
        : transaction.category?.id === categoryFilter.value);
    return categoryMatches && matchesPeriod(transaction.bookingDate, periodFilter.value);
  }),
);

const visibleTotal = computed(() =>
  sumSignedAmountStrings(visibleTransactions.value.map(({ amount }) => amount)),
);

// The shortcut's own state. `captured` holds the current single-cell selection;
// `markers` counts, per transaction row, the writes whose result is not yet
// reflected; `inFlight` names, per unsettled request, the transaction rows it
// writes. `selectedIds` holds the rows the bulk bar would assign to, and
// `bulkPending` states that a bulk assignment is in flight.
const tableRegion = ref<HTMLElement | null>(null);
const captured = ref<CapturedSelection | null>(null);
const previewState = ref<'idle' | 'loading' | 'ready' | 'unavailable'>('idle');
const previewCount = ref<number | null>(null);
const statusMessage = ref<string | null>(null);
const statusKind = ref<'info' | 'error'>('info');
const inFlight = ref(new Map<number, string[]>());
const markers = ref(new Map<string, number>());
const selectedIds = ref(new Set<string>());
const bulkPending = ref(false);
let appendSequence = 0;

const pickerCategories = computed(() =>
  [...(storedCategories.value ?? [])].sort((left, right) =>
    left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
    || left.id.localeCompare(right.id, undefined, { numeric: true }),
  ),
);

const inFlightCount = computed(() => inFlight.value.size);

// The rows an unsettled write names, so a row's control can be disabled while
// its result is on its way and its marker can clear once the refresh reflects it.
const rowsInFlight = computed(() => new Set([...inFlight.value.values()].flat()));

function rowInFlight(transactionId: string): boolean {
  return rowsInFlight.value.has(transactionId);
}

// A failure is never hidden behind the in-flight count; otherwise the count is
// what the bar reports while writes run.
const barStatus = computed(() => {
  if (statusKind.value === 'error' && statusMessage.value !== null) {
    return statusMessage.value;
  }
  if (inFlightCount.value > 0) {
    return `${inFlightCount.value} update${inFlightCount.value === 1 ? '' : 's'} applying…`;
  }
  return statusMessage.value;
});

const shortcutVisible = computed(() => captured.value !== null || barStatus.value !== null);

// The selection holds only shown rows: the select-all control covers the rows the
// filters currently show, and changing either filter clears the selection so a
// row that is no longer shown cannot remain selected.
const allVisibleSelected = computed(() =>
  visibleTransactions.value.length > 0
  && visibleTransactions.value.every(({ id }) => selectedIds.value.has(id)));

const someVisibleSelected = computed(() =>
  visibleTransactions.value.some(({ id }) => selectedIds.value.has(id)));

const bulkBarVisible = computed(() => selectedIds.value.size > 0);

const bottomBarsVisible = computed(() =>
  (shortcutVisible.value ? 1 : 0) + (bulkBarVisible.value ? 1 : 0));

function toggleSelected(transactionId: string): void {
  const next = new Set(selectedIds.value);
  if (next.has(transactionId)) {
    next.delete(transactionId);
  } else {
    next.add(transactionId);
  }
  selectedIds.value = next;
}

function toggleAllVisible(): void {
  selectedIds.value = allVisibleSelected.value
    ? new Set()
    : new Set(visibleTransactions.value.map(({ id }) => id));
}

function clearSelection(): void {
  selectedIds.value = new Set();
}

watch([categoryFilter, periodFilter], () => {
  clearSelection();
});

let previewGeneration = 0;
let previewTimer: ReturnType<typeof setTimeout> | null = null;

function resetPreview(): void {
  previewGeneration += 1;
  if (previewTimer !== null) {
    clearTimeout(previewTimer);
    previewTimer = null;
  }
  previewState.value = 'idle';
  previewCount.value = null;
}

// The preview is debounced like the category form's, and a superseded request
// can never overwrite a newer one.
function loadPreview(text: string): void {
  const generation = ++previewGeneration;
  if (previewTimer !== null) {
    clearTimeout(previewTimer);
  }
  previewState.value = 'loading';
  previewCount.value = null;
  previewTimer = setTimeout(() => {
    previewTimer = null;
    void fetchPreview(generation, text);
  }, 250);
}

async function fetchPreview(generation: number, text: string): Promise<void> {
  try {
    const result = await $fetch<{ count: number }>('/api/categories/literal-match-count', {
      method: 'POST',
      body: { text },
    });
    if (generation !== previewGeneration) {
      return;
    }
    if (!Number.isSafeInteger(result.count) || result.count < 0) {
      previewState.value = 'unavailable';
      return;
    }
    previewCount.value = result.count;
    previewState.value = 'ready';
  } catch {
    if (generation === previewGeneration) {
      previewCount.value = null;
      previewState.value = 'unavailable';
    }
  }
}

function elementOf(node: Node): Element | null {
  return node.nodeType === 1 ? node as Element : node.parentElement;
}

// A selection only counts when both of its ends sit in the same table cell, so
// a drag across cells cannot produce a pattern.
function selectedCell(selection: Selection): HTMLElement | null {
  if (selection.rangeCount === 0) {
    return null;
  }
  const range = selection.getRangeAt(0);
  const startCell = elementOf(range.startContainer)?.closest('td') ?? null;
  const endCell = elementOf(range.endContainer)?.closest('td') ?? null;
  return startCell !== null && startCell === endCell ? startCell : null;
}

function focusWithinBar(): boolean {
  return document.activeElement !== null
    && document.activeElement.closest('[data-testid="pattern-shortcut-bar"]') !== null;
}

function clearCaptured(): void {
  captured.value = null;
  resetPreview();
}

function handleSelectionChange(): void {
  const selection = window.getSelection();
  const cell = selection === null ? null : selectedCell(selection);
  const insideTable = cell !== null && tableRegion.value !== null && tableRegion.value.contains(cell);
  const text = insideTable ? (selection?.toString() ?? '').trim() : '';
  const transactionId = insideTable
    ? cell?.closest('tr')?.getAttribute('data-transaction-id') ?? null
    : null;

  if (!insideTable || [...text].length < 3 || transactionId === null) {
    // Focusing the bar's own control collapses the document selection, so the
    // captured text must survive that.
    if (!focusWithinBar()) {
      clearCaptured();
    }
    return;
  }

  captured.value = { text, transactionId };
  loadPreview(text);
}

function dismissShortcut(): void {
  clearCaptured();
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && captured.value !== null) {
    clearCaptured();
  }
}

let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let refreshGeneration = 0;
let statusTimer: ReturnType<typeof setTimeout> | null = null;

function clearStatus(): void {
  statusMessage.value = null;
  statusKind.value = 'info';
  if (statusTimer !== null) {
    clearTimeout(statusTimer);
    statusTimer = null;
  }
}

function showStatus(message: string, kind: 'info' | 'error', transient: boolean): void {
  clearStatus();
  statusMessage.value = message;
  statusKind.value = kind;
  if (transient) {
    statusTimer = setTimeout(() => {
      statusTimer = null;
      statusMessage.value = null;
    }, 4000);
  }
}

function messageOf(failure: unknown): string {
  const message = (failure as { data?: { message?: unknown } }).data?.message;
  return typeof message === 'string' && message !== '' ? message : 'The request could not be completed.';
}

function markRow(transactionId: string): void {
  markers.value.set(transactionId, (markers.value.get(transactionId) ?? 0) + 1);
}

function unmarkRow(transactionId: string): void {
  const count = markers.value.get(transactionId) ?? 0;
  if (count <= 1) {
    markers.value.delete(transactionId);
  } else {
    markers.value.set(transactionId, count - 1);
  }
}

function updateStoredCategory(category: StoredCategory): void {
  const list = storedCategories.value ?? [];
  const index = list.findIndex((entry) => entry.id === category.id);
  storedCategories.value = index === -1
    ? [...list, category]
    : [...list.slice(0, index), category, ...list.slice(index + 1)];
}

async function chooseCategory(categoryId: string): Promise<void> {
  const selection = captured.value;
  if (selection === null) {
    return;
  }
  const chosen = pickerCategories.value.find((category) => category.id === categoryId);
  const preview = { state: previewState.value, count: previewCount.value };
  const requestId = ++appendSequence;

  captured.value = null;
  resetPreview();
  clearStatus();
  inFlight.value.set(requestId, [selection.transactionId]);
  markRow(selection.transactionId);

  try {
    const result = await $fetch<{ category: StoredCategory; added: boolean }>(
      `/api/categories/${categoryId}/patterns`,
      { method: 'POST', body: { text: selection.text } },
    );
    updateStoredCategory(result.category);
    showStatus(
      result.added ? `Added to ${result.category.name}` : `Already in ${result.category.name}`,
      'info',
      true,
    );
  } catch (failure) {
    showStatus(`Could not add to ${chosen?.name ?? 'the category'}: ${messageOf(failure)}`, 'error', false);
    unmarkRow(selection.transactionId);
    // The bar returns with the captured text unless a newer selection has
    // already replaced it, so a retry needs no re-selection.
    if (captured.value === null) {
      captured.value = selection;
      if (preview.state === 'ready') {
        previewState.value = preview.state;
        previewCount.value = preview.count;
      } else {
        loadPreview(selection.text);
      }
    }
  } finally {
    inFlight.value.delete(requestId);
    if (inFlight.value.size === 0) {
      scheduleRefresh();
    }
  }
}

// The manual assignment write shared by the per-row select and the bulk bar. It
// names every written row in flight, marks each of them until the coalesced
// refresh reflects the result, and a failure reports through the shared status
// region, clears the in-flight markers, and changes no displayed value.
async function submitAssignment(transactionIds: string[], categoryId: string | null): Promise<boolean> {
  const requestId = ++appendSequence;
  clearStatus();
  inFlight.value.set(requestId, transactionIds);
  for (const transactionId of transactionIds) {
    markRow(transactionId);
  }

  try {
    await $fetch('/api/transactions/category-assignments', {
      method: 'POST',
      body: { transactionIds, categoryId },
    });
    return true;
  } catch (failure) {
    const subject = transactionIds.length === 1 ? 'the category' : 'the selected transactions';
    showStatus(`Could not assign ${subject}: ${messageOf(failure)}`, 'error', false);
    for (const transactionId of transactionIds) {
      unmarkRow(transactionId);
    }
    return false;
  } finally {
    inFlight.value.delete(requestId);
    if (inFlight.value.size === 0) {
      scheduleRefresh();
    }
  }
}

// The per-row control is put back to the category the row still holds when its
// assignment fails, so the select never shows a value the server did not accept.
async function chooseRowCategory(transaction: Transaction, event: Event): Promise<void> {
  const select = event.target as HTMLSelectElement;
  const categoryId = select.value === '' ? null : select.value;
  const applied = await submitAssignment([transaction.id], categoryId);
  if (!applied) {
    select.value = transaction.category?.id ?? '';
  }
}

async function applyBulkAssignment(categoryId: string | null): Promise<void> {
  const transactionIds = [...selectedIds.value];
  if (transactionIds.length === 0 || bulkPending.value) {
    return;
  }
  bulkPending.value = true;
  try {
    if (await submitAssignment(transactionIds, categoryId)) {
      clearSelection();
    }
  } finally {
    bulkPending.value = false;
  }
}

// One read after the last append settles collapses a burst of appends into a
// single background refresh. The response is assigned to the existing data ref,
// so the table's own loading state is never raised.
function scheduleRefresh(): void {
  if (refreshTimer !== null) {
    clearTimeout(refreshTimer);
  }
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    void refreshTransactions();
  }, 300);
}

async function refreshTransactions(): Promise<void> {
  const generation = ++refreshGeneration;
  try {
    const fresh = await $fetch<Transaction[]>('/api/transactions');
    if (generation !== refreshGeneration) {
      return;
    }
    transactions.value = fresh;
    const inFlightRows = new Set([...inFlight.value.values()].flat());
    for (const transactionId of [...markers.value.keys()]) {
      if (!inFlightRows.has(transactionId)) {
        markers.value.delete(transactionId);
      }
    }
  } catch {
    if (generation !== refreshGeneration) {
      return;
    }
    showStatus('The transactions could not be refreshed.', 'error', false);
  }
}

onMounted(() => {
  document.addEventListener('selectionchange', handleSelectionChange);
  document.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener('selectionchange', handleSelectionChange);
  document.removeEventListener('keydown', handleKeydown);
  previewGeneration += 1;
  refreshGeneration += 1;
  if (previewTimer !== null) {
    clearTimeout(previewTimer);
  }
  if (refreshTimer !== null) {
    clearTimeout(refreshTimer);
  }
  if (statusTimer !== null) {
    clearTimeout(statusTimer);
  }
});
</script>

<template>
  <div :class="{ 'pb-28': bottomBarsVisible === 1, 'pb-56': bottomBarsVisible === 2 }">
    <h1 class="font-display text-2xl font-semibold text-ink sm:text-3xl">Transactions</h1>

    <p v-if="error" class="mt-4 text-muted">
      The transactions could not be loaded. They are not shown, and this is not an empty result.
    </p>

    <p v-else-if="pending" class="mt-4 text-muted">Loading transactions…</p>

    <template v-else-if="transactions">
      <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
        <label class="grid w-full gap-1 text-sm font-medium text-muted sm:w-auto">
          Category
          <select
            v-model="categoryFilter"
            data-testid="category-filter"
            class="min-h-11 w-full max-w-full rounded-sheet border border-rule-strong bg-surface px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:w-auto"
          >
            <option value="all">All categories ({{ transactions.length }})</option>
            <option value="uncategorised">Uncategorised ({{ uncategorisedTransactions.length }})</option>
            <option v-for="category in categories" :key="category.id" :value="category.id">
              {{ category.name }}
            </option>
          </select>
        </label>
        <label class="grid w-full gap-1 text-sm font-medium text-muted sm:w-auto">
          Period
          <select
            v-model="periodFilter"
            data-testid="period-filter"
            class="min-h-11 w-full max-w-full rounded-sheet border border-rule-strong bg-surface px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:w-auto"
          >
            <option value="all">All periods</option>
            <optgroup v-if="periods.years.length > 0" label="Years">
              <option v-for="period in periods.years" :key="period.value" :value="period.value">
                {{ period.label }}
              </option>
            </optgroup>
            <optgroup v-if="periods.months.length > 0" label="Months">
              <option v-for="period in periods.months" :key="period.value" :value="period.value">
                {{ period.label }}
              </option>
            </optgroup>
          </select>
        </label>
      </div>

      <p class="mt-4 text-sm text-muted" data-testid="visible-total">
        Sum of displayed transactions:
        <span class="text-xl font-semibold tabular-nums text-ink">{{ formatEuroAmount(visibleTotal) }}</span>
        (<span class="tabular-nums" data-testid="visible-count">{{ visibleTransactions.length }} transaction{{ visibleTransactions.length === 1 ? '' : 's' }}</span>)
      </p>

      <p v-if="transactions.length === 0" class="mt-4 text-muted">
        There are no transactions to show.
      </p>

      <p v-else-if="visibleTransactions.length === 0" class="mt-4 text-muted">
        There are no transactions matching the selected filters.
      </p>

      <div v-else class="mt-4">
        <p id="transactions-scroll-help" class="mb-2 text-xs text-muted sm:hidden">
          Scroll horizontally to view all transaction columns.
        </p>
        <div
          ref="tableRegion"
          role="region"
          aria-label="Transactions table"
          aria-describedby="transactions-scroll-help"
          tabindex="0"
          data-testid="transactions-scroll"
          class="max-w-full overflow-x-auto rounded-sheet border border-rule-strong bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
        <table class="w-max min-w-full border-collapse text-left text-sm">
          <thead>
            <tr class="border-b border-rule-strong">
              <th scope="col" class="px-3 py-2 font-semibold text-ink">
                <label class="flex min-h-11 items-center justify-center">
                  <input
                    type="checkbox"
                    data-testid="select-all-visible"
                    :checked="allVisibleSelected"
                    :indeterminate="someVisibleSelected && !allVisibleSelected"
                    class="size-5 rounded-sheet border-rule-strong text-ink focus:ring-ink"
                    @change="toggleAllVisible"
                  >
                  <span class="sr-only">Select all shown transactions</span>
                </label>
              </th>
              <th scope="col" class="px-3 py-2 font-semibold text-ink">Booking date</th>
              <th scope="col" class="px-3 py-2 font-semibold text-ink">Value date</th>
              <th scope="col" class="px-3 py-2 text-right font-semibold text-ink">Amount</th>
              <th scope="col" class="px-3 py-2 font-semibold text-ink">Purpose</th>
              <th scope="col" class="px-3 py-2 font-semibold text-ink">Counterparty</th>
              <th scope="col" class="px-3 py-2 font-semibold text-ink">Account</th>
              <th scope="col" class="px-3 py-2 font-semibold text-ink">Category</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="transaction in visibleTransactions"
              :key="transaction.id"
              :data-transaction-id="transaction.id"
              :aria-busy="markers.has(transaction.id) ? 'true' : undefined"
              class="border-b border-rule"
            >
              <td class="px-3 py-2">
                <label class="flex min-h-11 items-center justify-center">
                  <input
                    type="checkbox"
                    data-testid="row-select"
                    :checked="selectedIds.has(transaction.id)"
                    class="size-5 rounded-sheet border-rule-strong text-ink focus:ring-ink"
                    @change="toggleSelected(transaction.id)"
                  >
                  <span class="sr-only">Select {{ transaction.purpose }}</span>
                </label>
              </td>
              <td class="px-3 py-2 whitespace-nowrap tabular-nums text-ink">
                <time :datetime="transaction.bookingDate">{{ transaction.bookingDate }}</time>
              </td>
              <td class="px-3 py-2 whitespace-nowrap tabular-nums text-ink">
                <time :datetime="transaction.valueDate">{{ transaction.valueDate }}</time>
              </td>
              <td class="px-3 py-2 text-right font-medium tabular-nums text-ink">{{ transaction.amount }}</td>
              <td class="px-3 py-2 text-ink">{{ transaction.purpose }}</td>
              <td class="px-3 py-2 text-ink">{{ transaction.counterpartyName }}</td>
              <td class="px-3 py-2 text-ink">
                <template v-if="transaction.counterpartyAccount !== null">
                  {{ transaction.counterpartyAccount }}
                </template>
                <template v-else>
                  <span aria-hidden="true" class="text-muted">—</span>
                  <span class="sr-only">No counterparty account</span>
                </template>
              </td>
              <td class="px-3 py-2 text-ink">
                <span
                  v-if="markers.has(transaction.id)"
                  aria-hidden="true"
                  data-testid="row-updating"
                  class="mr-1 inline-block size-2 rounded-full bg-muted align-middle"
                ></span>
                <span
                  v-if="transaction.categoryAssignment === 'manual'"
                  data-testid="manual-assignment-marker"
                  class="mr-1 inline-flex text-muted align-middle"
                >
                  <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" class="size-3.5">
                    <path d="M8 1.5a4.5 4.5 0 0 1 4.5 4.5c0 3.3-4.5 8.5-4.5 8.5S3.5 9.3 3.5 6A4.5 4.5 0 0 1 8 1.5Zm0 3a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
                  </svg>
                  <span class="sr-only">Manually assigned</span>
                </span>
                <select
                  data-testid="row-category-select"
                  :value="transaction.category?.id ?? ''"
                  :disabled="rowInFlight(transaction.id)"
                  :aria-label="`Category for ${transaction.purpose}`"
                  class="min-h-11 max-w-full rounded-sheet border border-rule-strong bg-surface px-2 py-1 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  @change="chooseRowCategory(transaction, $event)"
                >
                  <option value="">Uncategorised</option>
                  <option v-for="category in pickerCategories" :key="category.id" :value="category.id">
                    {{ category.hidden ? `${category.name} (hidden)` : category.name }}
                  </option>
                </select>
                <span v-if="markers.has(transaction.id)" class="sr-only">Updating category</span>
              </td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>
    </template>

    <div v-if="shortcutVisible || bulkBarVisible" class="fixed inset-x-0 bottom-0 z-20">
      <BulkAssignmentBar
        v-if="bulkBarVisible"
        :count="selectedIds.size"
        :categories="pickerCategories"
        :disabled="bulkPending"
        @assign="applyBulkAssignment"
        @clear="clearSelection"
      />
      <PatternShortcutBar
        :text="captured?.text ?? null"
        :categories="pickerCategories"
        :preview-state="previewState"
        :preview-count="previewCount"
        :status="barStatus"
        :status-kind="statusKind"
        @choose="chooseCategory"
        @dismiss="dismissShortcut"
      />
    </div>
  </div>
</template>
