<script setup lang="ts">
import {
  compareDecimalStrings,
  createCategoryColorMap,
  formatEuroAmount,
  sumSignedAmountStrings,
  CATEGORY_COLOR_PALETTE,
} from '../utils/category-spending';
import { IconChevronDown, IconMapPin } from '@tabler/icons-vue';
import {
  createTransactionSearchIndex,
  matchesTransactionSearchTerms,
  searchTerms,
} from '../utils/transaction-search';

// The index route reads stored transactions from the read-only GET
// /api/transactions endpoint. The person, category, and booking-period filters
// are derived from that response and represented in the route query. The person
// filter scopes the period choices and defaults, the category choices, defaults,
// and counts, and the search; changing it clears the row selection. The values are
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
// The transactions search matches the descriptive fields within the selected
// person. The field holds a draft that takes effect only when the form is
// submitted; a non-empty applied search bypasses the category and period filters,
// which stay visible with their values but are disabled until the search is
// cleared, while the person filter remains active. The trimmed applied text is
// carried in the route query as `q`.
//
// The page also offers manual category assignment. Every row's category cell
// hosts a select that pins the row to a chosen category or clears the pin by
// choosing Uncategorised; a selection column with a select-all control backs the
// fixed bulk bar, which assigns one category to every selected row. The
// assignment writes go through the manual-category-assignment endpoint, share
// the row markers and the coalesced refresh with the shortcut, and the two fixed
// bars render in one bottom stack so they never overlap.
//
// The table is presented as a growing prefix of the view. The first rows are
// rendered before the rest are constructed, so a large list becomes readable
// while it is still being built. Later batches are built only as the reader
// scrolls near the end of the presented rows; each is appended after the rows
// already on screen and never reorders or replaces them. A change of view — the
// category filter, the period filter, the applied search, or the sort —
// abandons the presented rows and starts again from the first batch, while the
// refresh that follows an assignment keeps the presented rows and re-arms the
// observation, because resetting there would blank a table that is already
// complete.
//
// The sum, the count, the select-all state, and the row selection all describe
// the whole view, never the prefix that has been presented so far.
//
// A refresh replaces the response only where it differs. A transaction whose
// displayed values are unchanged keeps its previous object, so the row's
// memoisation — which compares those values by identity — treats it as
// unchanged and the row is not re-presented. This is what keeps an assignment
// from rebuilding the table around the row it wrote, as the in-place refresh of
// manual-category-assignment requires.
//
// See openspec/changes/add-transactions-table/specs/transaction-table/spec.md,
// openspec/changes/add-transaction-table-sorting/specs/transaction-table/spec.md,
// openspec/changes/disable-server-side-rendering/specs/frontend-shell/spec.md,
// openspec/changes/add-transaction-pattern-shortcut/specs/transaction-pattern-shortcut/spec.md,
// and openspec/changes/add-manual-category-assignment/specs/manual-category-assignment/spec.md
type Category = { id: string; name: string };
type Person = { id: string; name: string };

type Transaction = {
  id: string;
  bookingDate: string;
  valueDate: string;
  amount: string;
  purpose: string;
  counterpartyName: string;
  counterpartyAccount: string | null;
  person: Person;
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
  'person',
  'category',
] as const;

type SortColumn = (typeof SORTABLE_COLUMNS)[number];
type SortDirection = 'asc' | 'desc';
type TransactionSort = { column: SortColumn; direction: SortDirection };
type SortableColumn = { column: SortColumn; label: string; align: 'left' | 'right' };

const sortableColumns: SortableColumn[] = [
  { column: 'bookingDate', label: 'Booking date', align: 'left' },
  { column: 'valueDate', label: 'Value date', align: 'left' },
  { column: 'purpose', label: 'Purpose', align: 'left' },
  { column: 'counterpartyName', label: 'Counterparty', align: 'left' },
  { column: 'counterpartyAccount', label: 'Account', align: 'left' },
  { column: 'person', label: 'Person', align: 'left' },
  { column: 'category', label: 'Category', align: 'left' },
  { column: 'amount', label: 'Amount', align: 'right' },
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

// The phone presentation matches Tailwind's `sm` breakpoint from below. One
// presentation is rendered at a time: the card list is not a second hidden copy
// of the table, so a transaction, its category select, and its test id exist once.
const PHONE_MEDIA_QUERY = '(max-width: 639.98px)';

function phoneMediaQuery(): MediaQueryList | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(PHONE_MEDIA_QUERY)
    : null;
}

const phoneQuery = phoneMediaQuery();
const phoneViewport = ref(phoneQuery?.matches ?? false);

function syncPhoneViewport(event?: MediaQueryListEvent): void {
  phoneViewport.value = event?.matches ?? phoneQuery?.matches ?? false;
}

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

// The person filter is client-side and URL-backed. An absent or unknown value
// means all people, and the selection scopes every derivation below.
const selectedPerson = ref('all');

const scopedTransactions = computed(() => {
  const rows = transactions.value ?? [];
  if (selectedPerson.value === 'all') {
    return rows;
  }
  return rows.filter((transaction) => transaction.person.id === selectedPerson.value);
});

function isMonthKey(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}
function monthLabel(key: string): string {
  return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${key}-01T00:00:00Z`));
}

// The table shows the day-precise calendar date in the mock's readable form.
// The raw value stays on <time datetime>, and an unexpected value falls back to
// itself rather than showing an invalid date.
const calendarDateFormat = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

function formatCalendarDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : calendarDateFormat.format(date);
}

const categories = computed(() => {
  const byId = new Map<string, Category>();
  for (const transaction of scopedTransactions.value) {
    if (transaction.category !== null) {
      byId.set(transaction.category.id, transaction.category);
    }
  }
  return [...byId.values()].sort((left, right) =>
    left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
    || left.id.localeCompare(right.id, undefined, { numeric: true }),
  );
});

// The person choices come from the returned transactions alone, so only people
// the filter can actually show are offered. A person with no transaction is shown
// on the People screen instead.
const personOptions = computed(() => {
  const byId = new Map<string, Person>();
  for (const transaction of transactions.value ?? []) {
    byId.set(transaction.person.id, transaction.person);
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
  for (const { bookingDate } of scopedTransactions.value) {
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
  return scopedTransactions.value.some(
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
// The field is a draft. The route's q is the applied search, so typing alone
// cannot change the rows, filters, summary, selection, or URL.
const appliedSearch = computed(() => (queryString(route.value.query.q) ?? '').trim());
const searchActive = computed(() => appliedSearch.value !== '');

const categoryFilter = computed({
  get: () => selectedCategory.value,
  set(value: string) {
    selectedCategory.value = value;
    setCategoryQuery(value);
  },
});

const personFilter = computed({
  get: () => selectedPerson.value,
  set(value: string) {
    selectedPerson.value = value;
    setPersonQuery(value);
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

function setPersonQuery(value: string): void {
  const query = { ...queryWithActiveSort() };
  if (value === 'all') {
    delete query.person;
  } else {
    query.person = value;
  }
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

function setSortQuery(sort: TransactionSort | null): void {
  const query = { ...route.value.query };
  if (sort === null) {
    delete query.sort;
    delete query.direction;
  } else {
    query.sort = sort.column;
    query.direction = sort.direction;
  }
  void router.replace({ path: '/', query });
}

// The form's submit path and the Clear control both end here. Applying is an
// immediate route write: the applied search is the route's q, which keeps the
// view linkable and lets the field, filters, and selection follow one value.
function applySearch(): void {
  const trimmed = searchText.value.trim();
  searchText.value = trimmed;
  if (trimmed === appliedSearch.value) {
    return;
  }
  const query = { ...queryWithActiveSort() };
  if (trimmed === '') {
    delete query.q;
  } else {
    query.q = trimmed;
  }
  void router.replace({ path: '/', query });
}

function clearSearch(): void {
  searchText.value = '';
  applySearch();
}

// Initial load and back/forward navigation restore the draft from the applied
// search. Typing changes only the draft, so the field is not written back while
// the user is editing.
watch(appliedSearch, (value) => {
  searchText.value = value;
}, { immediate: true });

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

// The phone sort control writes the same route values as a table header. A
// different column starts ascending; choosing the active column again keeps its
// direction. Default order removes both values.
function chooseSortColumn(value: string): void {
  if (value === '') {
    activeSort.value = null;
    setSortQuery(null);
    return;
  }
  if (!isSortColumn(value)) {
    return;
  }
  const next: TransactionSort = {
    column: value,
    direction: activeSort.value?.column === value ? activeSort.value.direction : 'asc',
  };
  activeSort.value = next;
  setSortQuery(next);
}

function toggleSortDirection(): void {
  const current = activeSort.value;
  if (current === null) {
    return;
  }
  const next: TransactionSort = {
    column: current.column,
    direction: current.direction === 'asc' ? 'desc' : 'asc',
  };
  activeSort.value = next;
  setSortQuery(next);
}

watch(
  () => [
    route.value.query.person,
    route.value.query.category,
    route.value.query.month,
    route.value.query.year,
    route.value.query.sort,
    route.value.query.direction,
    personOptions.value,
    categories.value,
    periods.value,
  ],
  () => {
    const requestedPerson = queryString(route.value.query.person);
    selectedPerson.value =
      requestedPerson !== undefined && personOptions.value.some(({ id }) => id === requestedPerson)
        ? requestedPerson
        : 'all';
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
  scopedTransactions.value.filter((transaction) => transaction.category === null),
);

// The category pill uses the same category palette and the same category identity
// keys as the analysis views, over the categories this screen can show.
const categoryColorMap = computed(() => createCategoryColorMap([
  ...categories.value.map(({ id }) => `category:${id}`),
  ...(uncategorisedTransactions.value.length > 0 ? ['uncategorised'] : []),
]));

function categoryColor(category: Category | null): string {
  const key = category === null ? 'uncategorised' : `category:${category.id}`;
  return categoryColorMap.value.get(key) ?? CATEGORY_COLOR_PALETTE[0];
}

// The pastel ground, border, and text keep the category's hue while leaving the
// label readable. Uncategorised keeps the neutral surface and rule styling.
function categoryPillStyle(category: Category | null): Record<string, string> {
  if (category === null) {
    return {};
  }
  const color = categoryColor(category);
  return {
    backgroundColor: `color-mix(in srgb, ${color} 16%, white)`,
    borderColor: `color-mix(in srgb, ${color} 32%, white)`,
    color: `color-mix(in srgb, ${color} 72%, var(--color-ink))`,
  };
}

// The descriptive text is normalised once per loaded response, so applying a
// search only parses its terms and compares against already-normalised rows.
const searchIndex = computed(() => createTransactionSearchIndex(scopedTransactions.value));

// An applied search covers every returned transaction of the selected person and
// overrides the category and period filters, never the person filter; no applied
// search keeps the filtered view.
const visibleTransactions = computed(() => {
  const rows = scopedTransactions.value;
  if (appliedSearch.value !== '') {
    const terms = searchTerms(appliedSearch.value);
    const index = searchIndex.value;
    return rows.filter((transaction) =>
      matchesTransactionSearchTerms(index.get(transaction.id) ?? '', terms));
  }
  return rows.filter((transaction) => {
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
    case 'person': return transaction.person.name;
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

// The table presents a growing prefix of the sorted view rather than building
// all of it. The first batch is small so the table becomes readable within a
// frame or two. Further batches are built only when the reader scrolls near the
// end of the rows already presented: the observation element after the table
// reports that approach, and each later batch is appended after the rows already
// on screen without reordering or replacing them. The preload margin is one
// viewport height, so a batch is ready before the reader reaches the end. The
// batch sizes are starting points taken from the measurement in the archived
// responsiveness design, not derived values.
const FIRST_BATCH_ROWS = 50;
const NEXT_BATCH_ROWS = 250;

const presentedCount = ref(FIRST_BATCH_ROWS);
const presentationGeneration = ref(0);
const batchSentinel = ref<HTMLElement | null>(null);
let batchObserver: IntersectionObserver | null = null;

const presentedTransactions = computed(() =>
  sortedVisibleTransactions.value.slice(0, presentedCount.value));

function canObserveProximity(): boolean {
  return typeof IntersectionObserver === 'function';
}

function hasMoreRows(): boolean {
  return presentedCount.value < sortedVisibleTransactions.value.length;
}

function appendBatch(): void {
  presentedCount.value = Math.min(
    sortedVisibleTransactions.value.length,
    presentedCount.value + NEXT_BATCH_ROWS,
  );
}

// An environment without the observer cannot report the reader's approach, so
// every matching row is presented at once. That is the previous behaviour, kept
// as a correctness fallback rather than leaving the tail unreachable.
function presentAllRows(): void {
  presentedCount.value = sortedVisibleTransactions.value.length;
}

// rootMargin accepts pixels or percentages, not viewport units, so the
// one-viewport preload distance is resolved to pixels when the observer is
// created.
function batchRootMargin(): string {
  return `0px 0px ${window.innerHeight}px 0px`;
}

function ensureBatchObserver(): void {
  if (batchObserver !== null || !canObserveProximity()) {
    return;
  }
  batchObserver = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      extendPresentation();
    }
  }, { rootMargin: batchRootMargin() });
}

// Starting to observe a target reports its current state. Re-observing the
// sentinel after a batch therefore re-checks the new position: if the appended
// rows did not push it out of the preload margin yet, the next batch follows;
// otherwise the observer waits for the reader to scroll again.
function watchBatchPosition(): void {
  const generation = presentationGeneration.value;
  void nextTick(() => {
    if (generation !== presentationGeneration.value) {
      return;
    }
    const sentinel = batchSentinel.value;
    if (sentinel === null) {
      return;
    }
    ensureBatchObserver();
    if (batchObserver === null) {
      return;
    }
    batchObserver.unobserve(sentinel);
    batchObserver.observe(sentinel);
  });
}

function extendPresentation(): void {
  if (!hasMoreRows()) {
    return;
  }
  appendBatch();
  watchBatchPosition();
}

// A view change abandons the previous view's remaining rows and starts the new
// view from its first batch, so a row from the previous view can never be
// appended to it. The generation guard also discards a position check queued by
// the superseded view.
function restartPresentation(): void {
  presentationGeneration.value += 1;
  batchObserver?.disconnect();
  presentedCount.value = FIRST_BATCH_ROWS;
  if (!canObserveProximity()) {
    presentAllRows();
    return;
  }
  watchBatchPosition();
}

// New or refreshed data is not a view change: the rows already on screen stay,
// and the observation is re-armed so a reader already near the end sees the
// rows the response introduced. A reader at the start is not extended.
function continuePresentation(): void {
  const total = sortedVisibleTransactions.value.length;
  if (presentedCount.value > total) {
    presentedCount.value = total;
  }
  if (!canObserveProximity()) {
    presentAllRows();
    return;
  }
  watchBatchPosition();
}

watch(
  [
    personFilter,
    categoryFilter,
    periodFilter,
    appliedSearch,
    () => activeSort.value?.column ?? '',
    () => activeSort.value?.direction ?? '',
  ],
  restartPresentation,
);

watch(() => transactions.value, continuePresentation);

// The two presentations have different batch triggers: the desktop sentinel
// must not keep observing while cards are shown, and returning to the table
// re-arms the reader's position.
watch(phoneViewport, (phone) => {
  if (phone) {
    batchObserver?.disconnect();
    return;
  }
  if (canObserveProximity()) {
    watchBatchPosition();
  }
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

// The stored categories as every picker offers them. The hidden suffix is
// computed once here rather than inside each row's option, so it is evaluated
// once per stored category instead of once per row and category.
const pickerCategories = computed(() =>
  [...(storedCategories.value ?? [])]
    .sort((left, right) =>
      left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
      || left.id.localeCompare(right.id, undefined, { numeric: true }),
    )
    .map((category) => ({
      ...category,
      label: category.hidden ? `${category.name} (hidden)` : category.name,
    })),
);

const inFlightCount = computed(() => inFlight.value.size);

// The rows an unsettled write names, so a row's control can be disabled while
// its result is on its way and its marker can clear once the refresh reflects it.
const rowsInFlight = computed(() => new Set([...inFlight.value.values()].flat()));

function rowInFlight(transactionId: string): boolean {
  return rowsInFlight.value.has(transactionId);
}

// Everything a row renders, so the row is re-presented exactly when one of those
// values changes and left alone otherwise. The category list is part of it
// because every row's select offers that list.
function rowMemo(transaction: Transaction): unknown[] {
  return [
    transaction,
    transaction.person.id,
    transaction.person.name,
    pickerCategories.value,
    markers.value.has(transaction.id),
    rowsInFlight.value.has(transaction.id),
    selectedIds.value.has(transaction.id),
  ];
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

watch([personFilter, categoryFilter, periodFilter, appliedSearch], () => {
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

// A selection only counts when both of its ends sit in the same field: one
// table cell or one labelled region of a phone card. A drag across fields cannot
// produce a pattern.
function selectedField(selection: Selection): HTMLElement | null {
  if (selection.rangeCount === 0) {
    return null;
  }
  const range = selection.getRangeAt(0);
  const startField = elementOf(range.startContainer)?.closest('td, [data-transaction-field]') ?? null;
  const endField = elementOf(range.endContainer)?.closest('td, [data-transaction-field]') ?? null;
  return startField !== null && startField === endField ? startField : null;
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
  const field = selection === null ? null : selectedField(selection);
  const insideList = field !== null && tableRegion.value !== null && tableRegion.value.contains(field);
  const text = insideList ? (selection?.toString() ?? '').trim() : '';
  const transactionId = insideList
    ? field?.closest('[data-transaction-id]')?.getAttribute('data-transaction-id') ?? null
    : null;

  if (!insideList || [...text].length < 3 || transactionId === null) {
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

// Whether the table would present the two rows identically. Only the values the
// row renders are compared: the row's memoisation keys off this object, so a
// difference here is exactly what makes a row worth re-presenting.
function sameDisplayedTransaction(left: Transaction, right: Transaction): boolean {
  return left.bookingDate === right.bookingDate
    && left.valueDate === right.valueDate
    && left.amount === right.amount
    && left.purpose === right.purpose
    && left.counterpartyName === right.counterpartyName
    && left.counterpartyAccount === right.counterpartyAccount
    && left.person.id === right.person.id
    && left.person.name === right.person.name
    && left.categoryAssignment === right.categoryAssignment
    && left.category?.id === right.category?.id
    && left.category?.name === right.category?.name;
}

// The read endpoint answers with a fresh object per transaction on every call.
// Reusing the previous object when nothing the table shows has changed keeps the
// refresh from re-presenting rows the assignment did not touch.
function reconcileTransactions(fresh: Transaction[]): Transaction[] {
  const previous = new Map(
    (transactions.value ?? []).map((transaction) => [transaction.id, transaction] as const),
  );
  return fresh.map((transaction) => {
    const current = previous.get(transaction.id);
    return current !== undefined && sameDisplayedTransaction(current, transaction)
      ? current
      : transaction;
  });
}

async function refreshTransactions(): Promise<void> {
  const generation = ++refreshGeneration;
  try {
    const fresh = await $fetch<Transaction[]>('/api/transactions');
    if (generation !== refreshGeneration) {
      return;
    }
    transactions.value = reconcileTransactions(fresh);
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
  phoneQuery?.addEventListener('change', syncPhoneViewport);
  syncPhoneViewport();
  // The data can already be present at mount, which the data watcher alone
  // would not report, so the fill is started here as well.
  continuePresentation();
});

onBeforeUnmount(() => {
  document.removeEventListener('selectionchange', handleSelectionChange);
  document.removeEventListener('keydown', handleKeydown);
  phoneQuery?.removeEventListener('change', syncPhoneViewport);
  presentationGeneration.value += 1;
  batchObserver?.disconnect();
  batchObserver = null;
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
  <div
    class="text-sm"
    :class="{ 'pb-28': bottomBarsVisible === 1, 'pb-56': bottomBarsVisible === 2 }"
  >
    <h1 class="font-display text-[28px] font-extrabold tracking-[-0.02em] text-ink sm:text-[34px]">Transactions</h1>

    <p v-if="error" class="mt-4 text-muted">
      The transactions could not be loaded. They are not shown, and this is not an empty result.
    </p>

    <p v-else-if="pending" class="mt-4 text-muted">Loading transactions…</p>

    <template v-else-if="transactions">
      <p class="mt-1 text-sm text-muted sm:mt-1.5 sm:text-[15px]" data-testid="visible-total">
        <span class="font-medium text-ink" data-testid="visible-count">
          {{ visibleTransactions.length }} transaction{{ visibleTransactions.length === 1 ? '' : 's' }}
        </span>
        <span aria-hidden="true" class="px-1.5 text-rule-strong">·</span>
        <span class="tabular-nums">
          Sum of displayed transactions: {{ formatEuroAmount(visibleTotal) }}
        </span>
      </p>

      <div
        class="mt-3.5 rounded-panel-mobile bg-surface p-3.5 shadow-sheet sm:mt-6 sm:rounded-panel sm:px-6 sm:py-5"
        data-testid="filter-sheet"
      >
        <div class="grid w-full grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))] xl:items-end">
          <div class="col-span-2 grid min-w-0 gap-1.5 text-xs font-bold text-muted xl:col-span-1">
            <label for="transaction-search">Search transactions</label>
            <form class="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center" @submit.prevent="applySearch">
              <div class="flex w-full min-w-0 items-center gap-2 sm:flex-1">
                <input
                  id="transaction-search"
                  v-model="searchText"
                  type="search"
                  data-testid="transaction-search"
                  autocomplete="off"
                  :aria-describedby="searchActive ? 'filters-paused-note' : undefined"
                  placeholder="Purpose, counterparty, account"
                  class="min-h-12 min-w-0 flex-1 rounded-control border border-rule-strong bg-surface px-3.5 py-2 text-[15px] text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:min-h-11 sm:px-4 sm:text-sm"
                >
                <button
                  type="submit"
                  data-testid="search-submit"
                  class="inline-flex min-h-12 shrink-0 items-center justify-center rounded-control bg-brand px-[18px] py-2 text-sm font-bold text-white hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:min-h-11 sm:px-[22px]"
                >
                  Search
                </button>
              </div>
              <button
                v-if="searchText !== '' || searchActive"
                type="button"
                data-testid="clear-search"
                aria-label="Clear search"
                class="inline-flex min-h-12 shrink-0 items-center justify-center rounded-control border border-rule-strong bg-surface px-3 text-xs font-medium text-ink hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:min-h-11"
                @click="clearSearch"
              >
                Clear
              </button>
            </form>
          </div>
          <label class="grid min-w-0 gap-1.5 text-xs font-bold text-muted">
            Person
            <select
              v-model="personFilter"
              data-testid="person-filter"
              class="min-h-12 w-full min-w-0 rounded-control border border-rule-strong bg-surface px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:min-h-11 sm:px-3.5"
            >
              <option value="all">All people</option>
              <option v-for="person in personOptions" :key="person.id" :value="person.id">
                {{ person.name }}
              </option>
            </select>
          </label>
          <label class="grid min-w-0 gap-1.5 text-xs font-bold text-muted">
            Period
            <select
              v-model="periodFilter"
              data-testid="period-filter"
              :disabled="searchActive"
              :aria-describedby="searchActive ? 'filters-paused-note' : undefined"
              class="min-h-12 w-full min-w-0 rounded-control border border-rule-strong bg-surface px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:min-h-11 sm:px-3.5 disabled:opacity-60"
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
          <label class="col-span-2 grid min-w-0 gap-1.5 text-xs font-bold text-muted xl:col-span-1">
            Category
            <select
              v-model="categoryFilter"
              data-testid="category-filter"
              :disabled="searchActive"
              :aria-describedby="searchActive ? 'filters-paused-note' : undefined"
              class="min-h-12 w-full min-w-0 rounded-control border border-rule-strong bg-surface px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:min-h-11 sm:px-3.5 disabled:opacity-60"
            >
              <option value="all">All categories ({{ scopedTransactions.length }})</option>
              <option value="uncategorised">Uncategorised ({{ uncategorisedTransactions.length }})</option>
              <option v-for="category in categories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
          </label>
        </div>
      </div>

      <p
        v-if="searchActive"
        id="filters-paused-note"
        data-testid="filters-paused-note"
        class="mt-3.5 text-sm text-muted sm:mt-6"
      >
        Filters are paused while searching. Category and period filtering is off, the person filter still applies. Clear the search to use them again.
      </p>

      <div
        v-if="transactions.length === 0"
        data-testid="table-sheet"
        class="mt-3.5 rounded-panel-mobile bg-surface px-4 py-10 shadow-sheet sm:mt-6 sm:rounded-panel sm:px-6"
      >
        <p class="text-center text-sm text-muted">
          There are no transactions to show.
        </p>
      </div>

      <div
        v-else-if="visibleTransactions.length === 0 && searchActive"
        data-testid="table-sheet"
        class="mt-3.5 rounded-panel-mobile bg-surface px-4 py-10 shadow-sheet sm:mt-6 sm:rounded-panel sm:px-6"
      >
        <p class="text-center text-sm text-muted">
          There are no transactions matching “{{ appliedSearch }}”.
        </p>
      </div>

      <div
        v-else-if="visibleTransactions.length === 0"
        data-testid="table-sheet"
        class="mt-3.5 rounded-panel-mobile bg-surface px-4 py-10 shadow-sheet sm:mt-6 sm:rounded-panel sm:px-6"
      >
        <p class="text-center text-sm text-muted">
          There are no transactions matching the selected filters.
        </p>
      </div>

      <div
        v-else
        data-testid="table-sheet"
        :class="phoneViewport
          ? 'mt-3.5'
          : 'mt-3.5 overflow-hidden rounded-panel-mobile bg-surface shadow-sheet sm:mt-6 sm:rounded-panel sm:px-6 sm:pb-4 sm:pt-2'"
      >
        <div
          v-if="phoneViewport"
          ref="tableRegion"
          data-testid="transaction-cards"
          class="flex flex-col gap-3.5"
        >
          <div class="flex flex-col gap-2" data-testid="phone-transactions-toolbar">
            <label class="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-muted">
              <input
                type="checkbox"
                data-testid="select-all-visible"
                :checked="allVisibleSelected"
                :indeterminate="someVisibleSelected && !allVisibleSelected"
                class="size-5 rounded-sheet border-rule-strong text-brand focus:ring-brand"
                @change="toggleAllVisible"
              >
              Select all shown transactions
            </label>
            <div class="flex min-w-0 items-center gap-2">
              <label for="mobile-sort" class="sr-only">Sort by</label>
              <select
                id="mobile-sort"
                data-testid="mobile-sort"
                :value="activeSort?.column ?? ''"
                class="min-h-12 min-w-0 flex-1 rounded-control border border-rule-strong bg-surface px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                @change="chooseSortColumn(($event.target as HTMLSelectElement).value)"
              >
                <option value="">Default order</option>
                <option v-for="column in sortableColumns" :key="column.column" :value="column.column">
                  {{ column.label }}
                </option>
              </select>
              <button
                type="button"
                data-testid="mobile-sort-direction"
                :disabled="activeSort === null"
                :aria-label="`Sort direction: ${activeSort?.direction === 'desc' ? 'descending' : 'ascending'}`"
                class="inline-flex min-h-12 shrink-0 items-center justify-center rounded-control border border-rule-strong bg-surface px-3 text-xs font-bold text-ink hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50"
                @click="toggleSortDirection"
              >
                {{ activeSort?.direction === 'desc' ? 'Descending' : 'Ascending' }}
              </button>
            </div>
          </div>

          <article
            v-for="transaction in presentedTransactions"
            :key="transaction.id"
            v-memo="rowMemo(transaction)"
            data-testid="transaction-card"
            :data-transaction-id="transaction.id"
            :aria-busy="markers.has(transaction.id) ? 'true' : undefined"
            class="flex flex-col gap-2.5 rounded-panel-mobile bg-surface p-4 shadow-sheet"
          >
            <div class="flex items-start gap-2">
              <label class="flex min-h-11 min-w-11 items-center justify-center">
                <input
                  type="checkbox"
                  data-testid="row-select"
                  :checked="selectedIds.has(transaction.id)"
                  class="size-5 rounded-sheet border-rule-strong text-brand focus:ring-brand"
                  @change="toggleSelected(transaction.id)"
                >
                <span class="sr-only">Select {{ transaction.purpose }}</span>
              </label>
              <div class="flex min-w-0 flex-1 items-start justify-between gap-3">
                <span
                  data-transaction-field="purpose"
                  class="min-w-0 break-words text-[15px] font-bold text-ink"
                >{{ transaction.purpose }}</span>
                <span
                  data-transaction-field="amount"
                  class="shrink-0 whitespace-nowrap text-[15px] font-extrabold tabular-nums text-ink"
                >{{ transaction.amount }}</span>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-1.5">
              <span
                v-if="markers.has(transaction.id)"
                aria-hidden="true"
                data-testid="row-updating"
                class="inline-block size-2 shrink-0 rounded-full bg-muted align-middle"
              ></span>
              <span
                v-if="transaction.categoryAssignment === 'manual'"
                data-testid="manual-assignment-marker"
                class="inline-flex shrink-0 text-muted align-middle"
              >
                <AppIcon :icon="IconMapPin" :size="14" />
                <span class="sr-only">Manually assigned</span>
              </span>
              <label class="relative inline-flex min-h-11 min-w-0 items-center">
                <select
                  data-testid="row-category-select"
                  :value="transaction.category?.id ?? ''"
                  :disabled="rowInFlight(transaction.id)"
                  :aria-label="`Category for ${transaction.purpose}`"
                  class="max-w-full min-w-0 appearance-none truncate rounded-pill border py-[5px] pl-3 pr-8 text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60"
                  :class="transaction.category === null ? 'border-rule-strong bg-surface text-ink' : ''"
                  :style="categoryPillStyle(transaction.category)"
                  @change="chooseRowCategory(transaction, $event)"
                >
                  <option value="">Uncategorised</option>
                  <option v-for="category in pickerCategories" :key="category.id" :value="category.id">
                    {{ category.label }}
                  </option>
                </select>
                <AppIcon
                  :icon="IconChevronDown"
                  :size="14"
                  class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted"
                />
              </label>
              <span v-if="markers.has(transaction.id)" class="sr-only">Updating category</span>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-1 text-xs text-muted">
              <span data-transaction-field="bookingDate">
                Booked
                <time :datetime="transaction.bookingDate">{{ formatCalendarDate(transaction.bookingDate) }}</time>
              </span>
              <span data-transaction-field="valueDate">
                Value
                <time :datetime="transaction.valueDate">{{ formatCalendarDate(transaction.valueDate) }}</time>
              </span>
            </div>

            <dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 border-t border-rule pt-2 text-xs text-muted">
              <dt class="font-bold">Counterparty</dt>
              <dd data-transaction-field="counterpartyName" class="min-w-0 break-words text-right text-ink">
                {{ transaction.counterpartyName }}
              </dd>
              <dt class="font-bold">Account</dt>
              <dd data-transaction-field="counterpartyAccount" class="min-w-0 break-words text-right text-ink">
                <template v-if="transaction.counterpartyAccount !== null">
                  {{ transaction.counterpartyAccount }}
                </template>
                <template v-else>
                  <span aria-hidden="true">—</span>
                  <span class="sr-only">No counterparty account</span>
                </template>
              </dd>
              <dt class="font-bold">Person</dt>
              <dd data-transaction-field="person" class="min-w-0 break-words text-right text-ink">
                {{ transaction.person.name }}
              </dd>
            </dl>
          </article>

          <button
            v-if="hasMoreRows()"
            type="button"
            data-testid="load-more"
            class="inline-flex min-h-12 w-full items-center justify-center rounded-control bg-brand px-[18px] py-2 text-sm font-bold text-white hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            @click="extendPresentation"
          >
            Load more
          </button>
        </div>

        <template v-else>
          <p id="transactions-scroll-help" class="px-4 pt-3 text-xs text-muted">
            Scroll horizontally to view all transaction columns.
          </p>
          <div
            ref="tableRegion"
            role="region"
            aria-label="Transactions table"
            aria-describedby="transactions-scroll-help"
            tabindex="0"
            data-testid="transactions-scroll"
            class="max-w-full overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand"
          >
            <table class="w-max min-w-full border-collapse text-left text-sm">
              <thead>
                <tr class="border-b border-rule text-xs uppercase tracking-[0.06em] text-muted">
                  <th scope="col" class="px-2 py-0.5 font-bold">
                    <label class="flex min-h-11 items-center justify-center">
                      <input
                        type="checkbox"
                        data-testid="select-all-visible"
                        :checked="allVisibleSelected"
                        :indeterminate="someVisibleSelected && !allVisibleSelected"
                        class="size-5 rounded-sheet border-rule-strong text-brand focus:ring-brand"
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
                    class="px-2 py-0.5 font-bold"
                  >
                    <button
                      type="button"
                      :data-testid="`sort-${column.column}`"
                      :class="[
                        'flex min-h-11 w-full items-center gap-1 rounded-control font-bold text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                        column.align === 'right' ? 'justify-end' : 'justify-start',
                      ]"
                      @click="activateSort(column.column)"
                    >
                      <span>{{ column.label }}</span>
                      <span
                        v-if="activeSort?.column === column.column"
                        aria-hidden="true"
                        class="text-brand"
                      >{{ activeSort.direction === 'asc' ? '↑' : '↓' }}</span>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="transaction in presentedTransactions"
                  :key="transaction.id"
                  v-memo="rowMemo(transaction)"
                  :data-transaction-id="transaction.id"
                  :aria-busy="markers.has(transaction.id) ? 'true' : undefined"
                  class="border-b border-rule transition-colors last:border-b-0 hover:bg-paper/60"
                >
                  <td class="px-2 py-0">
                    <label class="flex min-h-11 items-center justify-center">
                      <input
                        type="checkbox"
                        data-testid="row-select"
                        :checked="selectedIds.has(transaction.id)"
                        class="size-5 rounded-sheet border-rule-strong text-brand focus:ring-brand"
                        @change="toggleSelected(transaction.id)"
                      >
                      <span class="sr-only">Select {{ transaction.purpose }}</span>
                    </label>
                  </td>
                  <td class="whitespace-nowrap px-2 py-[13px] font-semibold tabular-nums text-ink">
                    <time :datetime="transaction.bookingDate">{{ formatCalendarDate(transaction.bookingDate) }}</time>
                  </td>
                  <td class="whitespace-nowrap px-2 py-[13px] tabular-nums text-ink">
                    <time :datetime="transaction.valueDate">{{ formatCalendarDate(transaction.valueDate) }}</time>
                  </td>
                  <td class="px-2 py-[13px] text-ink">{{ transaction.purpose }}</td>
                  <td class="px-2 py-[13px] text-ink">{{ transaction.counterpartyName }}</td>
                  <td class="px-2 py-[13px] text-ink">
                    <template v-if="transaction.counterpartyAccount !== null">
                      {{ transaction.counterpartyAccount }}
                    </template>
                    <template v-else>
                      <span aria-hidden="true" class="text-muted">—</span>
                      <span class="sr-only">No counterparty account</span>
                    </template>
                  </td>
                  <td class="px-2 py-[13px] text-ink">{{ transaction.person.name }}</td>
                  <td class="px-2 py-0 text-ink">
                    <span class="inline-flex min-w-0 items-center gap-1.5">
                      <span
                        v-if="markers.has(transaction.id)"
                        aria-hidden="true"
                        data-testid="row-updating"
                        class="inline-block size-2 shrink-0 rounded-full bg-muted align-middle"
                      ></span>
                      <span
                        v-if="transaction.categoryAssignment === 'manual'"
                        data-testid="manual-assignment-marker"
                        class="inline-flex shrink-0 text-muted align-middle"
                      >
                        <AppIcon :icon="IconMapPin" :size="14" />
                        <span class="sr-only">Manually assigned</span>
                      </span>
                      <label class="relative inline-flex min-h-11 min-w-0 items-center">
                        <select
                          data-testid="row-category-select"
                          :value="transaction.category?.id ?? ''"
                          :disabled="rowInFlight(transaction.id)"
                          :aria-label="`Category for ${transaction.purpose}`"
                          class="max-w-56 min-w-0 appearance-none truncate rounded-pill border py-[5px] pl-3 pr-8 text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60"
                          :class="transaction.category === null ? 'border-rule-strong bg-surface text-ink' : ''"
                          :style="categoryPillStyle(transaction.category)"
                          @change="chooseRowCategory(transaction, $event)"
                        >
                          <option value="">Uncategorised</option>
                          <option v-for="category in pickerCategories" :key="category.id" :value="category.id">
                            {{ category.label }}
                          </option>
                        </select>
                        <AppIcon
                          :icon="IconChevronDown"
                          :size="14"
                          class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted"
                        />
                      </label>
                    </span>
                    <span v-if="markers.has(transaction.id)" class="sr-only">Updating category</span>
                  </td>
                  <td class="whitespace-nowrap px-2 py-[13px] text-right font-bold tabular-nums text-ink">{{ transaction.amount }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div
            ref="batchSentinel"
            aria-hidden="true"
            data-testid="transactions-batch-sentinel"
            class="h-px w-full"
          ></div>
        </template>
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
