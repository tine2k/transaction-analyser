<script setup lang="ts">
import {
  compareDecimalStrings,
  formatEuroAmount,
  sumSignedAmountStrings,
} from '../utils/category-spending';
import { IconMapPin } from '@tabler/icons-vue';
import { matchesTransactionSearch } from '../utils/transaction-search';

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
// Column headers sort the filtered rows, and the active column and direction are
// carried in the route query. A route without a sort keeps the endpoint's order,
// and equal values keep their relative endpoint order.
//
// The all-transactions search matches the descriptive fields. A non-empty search
// bypasses the category and period filters, which stay visible with their values
// but are disabled until the search is cleared. The trimmed search text is
// carried in the route query as `q`; typing filters immediately while the query
// write is debounced.
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
// openspec/changes/add-transaction-table-sorting/specs/transaction-table/spec.md,
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

const SORTABLE_COLUMNS = [
  'bookingDate',
  'valueDate',
  'amount',
  'purpose',
  'counterpartyName',
  'counterpartyAccount',
  'category',
] as const;

type SortColumn = (typeof SORTABLE_COLUMNS)[number];
type SortDirection = 'asc' | 'desc';
type TransactionSort = { column: SortColumn; direction: SortDirection };
type SortableColumn = { column: SortColumn; label: string; align: 'left' | 'right' };

const sortableColumns: SortableColumn[] = [
  { column: 'bookingDate', label: 'Booking date', align: 'left' },
  { column: 'valueDate', label: 'Value date', align: 'left' },
  { column: 'amount', label: 'Amount', align: 'right' },
  { column: 'purpose', label: 'Purpose', align: 'left' },
  { column: 'counterpartyName', label: 'Counterparty', align: 'left' },
  { column: 'counterpartyAccount', label: 'Account', align: 'left' },
  { column: 'category', label: 'Category', align: 'left' },
];

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

function isSortColumn(value: string): value is SortColumn {
  return (SORTABLE_COLUMNS as readonly string[]).includes(value);
}

// The route carries the active sort as a column and a direction. An unknown
// column means no sort, while a recognized column without a valid direction
// sorts ascending.
function sortFromQuery(): TransactionSort | null {
  const column = queryString(route.value.query.sort);
  if (column === undefined || !isSortColumn(column)) {
    return null;
  }
  return {
    column,
    direction: queryString(route.value.query.direction) === 'desc' ? 'desc' : 'asc',
  };
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

// The period default prefers the browser's current calendar year when the
// response represents it, then the newest represented year, and all periods
// when the response is empty. Only represented periods can be offered by the
// control, so an unrepresented current year cannot be selected.
const defaultPeriod = computed(() => {
  const year = String(new Date().getFullYear());
  if (periods.value.years.some((option) => option.value === year)) {
    return year;
  }
  return periods.value.years[0]?.value ?? 'all';
});

// The effective period is an offered query month or year when the route names
// one, otherwise the period default. The category default follows it: it is
// uncategorised only when that period holds an uncategorised transaction, so a
// fully categorised period opens on all categories instead of an empty table.
function effectivePeriod(): string {
  const options = [...periods.value.years, ...periods.value.months];
  for (const key of ['month', 'year'] as const) {
    const requested = queryString(route.value.query[key]);
    if (requested !== undefined && options.some(({ value }) => value === requested)) {
      return requested;
    }
  }
  return defaultPeriod.value;
}

function matchesPeriod(bookingDate: string, period: string): boolean {
  if (period === 'all') {
    return true;
  }
  return isYearKey(period)
    ? bookingDate.slice(0, 4) === period
    : bookingDate.slice(0, 7) === period;
}

function categoryFromQuery(): string {
  const requested = queryString(route.value.query.category);
  if (requested === 'all' || requested === 'uncategorised') {
    return requested;
  }
  if (requested !== undefined && categories.value.some(({ id }) => id === requested)) {
    return requested;
  }
  const period = effectivePeriod();
  return (transactions.value ?? []).some(
    (transaction) => transaction.category === null && matchesPeriod(transaction.bookingDate, period),
  )
    ? 'uncategorised'
    : 'all';
}

function periodFromQuery(): string {
  return effectivePeriod();
}

const selectedCategory = ref('uncategorised');
const selectedPeriod = ref('all');
// An explicit all-periods selection has no query value to read back, so it is
// held locally; otherwise a later filter change would reapply the period
// default and silently narrow the view again.
const allPeriodsSelected = ref(false);
const activeSort = ref<TransactionSort | null>(null);
const searchText = ref('');
const searchQuery = computed(() => searchText.value.trim());
const searchActive = computed(() => searchQuery.value !== '');

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

// The local sort is authoritative until the router reflects it, so a filter
// change made right after a header activation does not drop the new sort.
function queryWithActiveSort() {
  const query = { ...route.value.query };
  if (activeSort.value === null) {
    delete query.sort;
    delete query.direction;
  } else {
    query.sort = activeSort.value.column;
    query.direction = activeSort.value.direction;
  }
  return query;
}

function setCategoryQuery(value: string): void {
  const query = { ...queryWithActiveSort(), category: value };
  void router.replace({ path: '/', query });
}

function setPeriodQuery(value: string): void {
  allPeriodsSelected.value = value === 'all';
  const query = queryWithActiveSort();
  delete query.month;
  delete query.year;
  if (isYearKey(value)) {
    query.year = value;
  } else if (value !== 'all') {
    query.month = value;
  }
  void router.replace({ path: '/', query });
}

function setSortQuery(sort: TransactionSort): void {
  void router.replace({
    path: '/',
    query: {
      ...route.value.query,
      sort: sort.column,
      direction: sort.direction,
    },
  });
}

const SEARCH_QUERY_DEBOUNCE_MS = 250;
let searchWriteTimer: ReturnType<typeof setTimeout> | null = null;
// The trimmed value the component last wrote, so a route change caused by its
// own debounced write is never mistaken for an external navigation.
let lastWrittenSearchQuery: string | null = null;

function routeSearchQuery(): string {
  return (queryString(route.value.query.q) ?? '').trim();
}

// The route carries the trimmed search text. The write is debounced so typing
// filters immediately without turning every keystroke into a navigation, and it
// preserves the category, period, and sort values already in the query.
function writeSearchQuery(): void {
  const trimmed = searchQuery.value;
  lastWrittenSearchQuery = trimmed;
  const query = { ...queryWithActiveSort() };
  if (trimmed === '') {
    delete query.q;
  } else {
    query.q = trimmed;
  }
  void router.replace({ path: '/', query });
}

watch(searchQuery, (value) => {
  if (searchWriteTimer !== null) {
    clearTimeout(searchWriteTimer);
    searchWriteTimer = null;
  }
  // The route already describes this text; writing it again would only add a
  // navigation, for example when the text was just adopted from the route.
  if (value === routeSearchQuery()) {
    return;
  }
  searchWriteTimer = setTimeout(() => {
    searchWriteTimer = null;
    writeSearchQuery();
  }, SEARCH_QUERY_DEBOUNCE_MS);
});

watch(
  () => queryString(route.value.query.q),
  (value) => {
    const fromRoute = (value ?? '').trim();
    // An own write that resolves after the user typed again must not roll the
    // field back or cancel the newer pending write.
    if (fromRoute === lastWrittenSearchQuery) {
      lastWrittenSearchQuery = null;
      return;
    }
    if (fromRoute === searchQuery.value) {
      return;
    }
    if (searchWriteTimer !== null) {
      clearTimeout(searchWriteTimer);
      searchWriteTimer = null;
    }
    searchText.value = fromRoute;
  },
  { immediate: true },
);

// A different column starts ascending; the active column alternates. The route
// query is updated alongside the local state so the sorted view is linkable.
function activateSort(column: SortColumn): void {
  const current = activeSort.value;
  const next: TransactionSort = current?.column === column
    ? { column, direction: current.direction === 'asc' ? 'desc' : 'asc' }
    : { column, direction: 'asc' };
  activeSort.value = next;
  setSortQuery(next);
}

function ariaSortFor(column: SortColumn): 'ascending' | 'descending' | 'none' {
  if (activeSort.value?.column !== column) {
    return 'none';
  }
  return activeSort.value.direction === 'asc' ? 'ascending' : 'descending';
}

watch(
  () => [
    route.value.query.category,
    route.value.query.month,
    route.value.query.year,
    route.value.query.sort,
    route.value.query.direction,
    categories.value,
    periods.value,
  ],
  () => {
    selectedCategory.value = categoryFromQuery();
    const queryPeriod = queryString(route.value.query.month) ?? queryString(route.value.query.year);
    if (queryPeriod !== undefined || !allPeriodsSelected.value) {
      selectedPeriod.value = periodFromQuery();
    }
    activeSort.value = sortFromQuery();
  },
  { immediate: true },
);

const uncategorisedTransactions = computed(() =>
  (transactions.value ?? []).filter((transaction) => transaction.category === null),
);

// A non-empty search covers every returned transaction and overrides the
// category and period filters; an empty search keeps the filtered view.
const visibleTransactions = computed(() => {
  if (searchQuery.value !== '') {
    return (transactions.value ?? []).filter((transaction) =>
      matchesTransactionSearch(transaction, searchQuery.value));
  }
  return (transactions.value ?? []).filter((transaction) => {
    const categoryMatches = categoryFilter.value === 'all'
      || (categoryFilter.value === 'uncategorised'
        ? transaction.category === null
        : transaction.category?.id === categoryFilter.value);
    return categoryMatches && matchesPeriod(transaction.bookingDate, periodFilter.value);
  });
});

// Sorting is a presentation concern layered on the filtered rows. The endpoint's
// response index is kept so rows that compare equal keep their relative order,
// and so a route without a sort keeps the endpoint's order untouched.
const endpointOrder = computed(() => {
  const order = new Map<string, number>();
  (transactions.value ?? []).forEach((transaction, index) => {
    order.set(transaction.id, index);
  });
  return order;
});

function sortValue(transaction: Transaction, column: SortColumn): string | null {
  switch (column) {
    case 'bookingDate': return transaction.bookingDate;
    case 'valueDate': return transaction.valueDate;
    case 'amount': return transaction.amount;
    case 'purpose': return transaction.purpose;
    case 'counterpartyName': return transaction.counterpartyName;
    case 'counterpartyAccount': return transaction.counterpartyAccount;
    case 'category': return transaction.category?.name ?? null;
  }
}

function compareSortValues(left: string, right: string, column: SortColumn): number {
  if (column === 'amount') {
    return compareDecimalStrings(left, right);
  }
  if (column === 'bookingDate' || column === 'valueDate') {
    return left < right ? -1 : left > right ? 1 : 0;
  }
  return left.localeCompare(right, undefined, { sensitivity: 'base' });
}

const sortedVisibleTransactions = computed(() => {
  const sort = activeSort.value;
  const rows = visibleTransactions.value;
  if (sort === null) {
    return rows;
  }

  const order = endpointOrder.value;
  const endpointIndex = (transaction: Transaction): number => order.get(transaction.id) ?? 0;

  return [...rows].sort((left, right) => {
    const leftValue = sortValue(left, sort.column);
    const rightValue = sortValue(right, sort.column);

    // An absent account or category sorts last in both directions; the
    // direction only applies to rows that both carry a value.
    if (leftValue === null || rightValue === null) {
      if (leftValue === null && rightValue === null) {
        return endpointIndex(left) - endpointIndex(right);
      }
      return leftValue === null ? 1 : -1;
    }

    const comparison = compareSortValues(leftValue, rightValue, sort.column);
    if (comparison !== 0) {
      return sort.direction === 'asc' ? comparison : -comparison;
    }
    return endpointIndex(left) - endpointIndex(right);
  });
});

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

watch([categoryFilter, periodFilter, searchQuery], () => {
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
  if (searchWriteTimer !== null) {
    clearTimeout(searchWriteTimer);
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
        <div class="grid w-full gap-1 text-sm font-medium text-muted sm:w-auto">
          <label for="transaction-search">Search all transactions</label>
          <div class="flex min-w-0 items-center gap-2">
            <input
              id="transaction-search"
              v-model="searchText"
              type="search"
              data-testid="transaction-search"
              autocomplete="off"
              :aria-describedby="searchActive ? 'filters-paused-note' : undefined"
              placeholder="Purpose, counterparty, account"
              class="min-h-11 w-full min-w-0 rounded-sheet border border-rule-strong bg-surface px-3 py-2 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:w-80"
            >
            <button
              v-if="searchText !== ''"
              type="button"
              data-testid="clear-search"
              aria-label="Clear search"
              class="inline-flex min-h-11 shrink-0 items-center justify-center rounded-sheet border border-rule-strong bg-surface px-3 text-xs font-medium text-ink hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              @click="searchText = ''"
            >
              Clear
            </button>
          </div>
        </div>
        <label class="grid w-full gap-1 text-sm font-medium text-muted sm:w-auto">
          Category
          <select
            v-model="categoryFilter"
            data-testid="category-filter"
            :disabled="searchActive"
            :aria-describedby="searchActive ? 'filters-paused-note' : undefined"
            class="min-h-11 w-full max-w-full rounded-sheet border border-rule-strong bg-surface px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60 sm:w-auto"
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
            :disabled="searchActive"
            :aria-describedby="searchActive ? 'filters-paused-note' : undefined"
            class="min-h-11 w-full max-w-full rounded-sheet border border-rule-strong bg-surface px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60 sm:w-auto"
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

      <p
        v-if="searchActive"
        id="filters-paused-note"
        data-testid="filters-paused-note"
        class="mt-2 text-sm text-muted"
      >
        Filters are paused while searching. Clear the search to use them again.
      </p>

      <p class="mt-4 text-sm text-muted" data-testid="visible-total">
        Sum of displayed transactions:
        <span class="text-xl font-semibold tabular-nums text-ink">{{ formatEuroAmount(visibleTotal) }}</span>
        (<span class="tabular-nums" data-testid="visible-count">{{ visibleTransactions.length }} transaction{{ visibleTransactions.length === 1 ? '' : 's' }}</span>)
      </p>

      <p v-if="transactions.length === 0" class="mt-4 text-muted">
        There are no transactions to show.
      </p>

      <p v-else-if="visibleTransactions.length === 0 && searchActive" class="mt-4 text-muted">
        There are no transactions matching “{{ searchQuery }}”.
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
              <th
                v-for="column in sortableColumns"
                :key="column.column"
                scope="col"
                :aria-sort="ariaSortFor(column.column)"
                class="px-3 py-2 font-semibold text-ink"
              >
                <button
                  type="button"
                  :data-testid="`sort-${column.column}`"
                  :class="[
                    'flex min-h-11 w-full items-center gap-1 rounded-sheet font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
                    column.align === 'right' ? 'justify-end' : 'justify-start',
                  ]"
                  @click="activateSort(column.column)"
                >
                  <span>{{ column.label }}</span>
                  <span
                    v-if="activeSort?.column === column.column"
                    aria-hidden="true"
                    class="text-muted"
                  >{{ activeSort.direction === 'asc' ? '↑' : '↓' }}</span>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="transaction in sortedVisibleTransactions"
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
                  <AppIcon :icon="IconMapPin" :size="14" />
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
