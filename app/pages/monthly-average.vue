<script setup lang="ts">
// The Monthly average screen: one rolling window of calendar months, a
// per-category comparison table with a row-relative monthly trend, exact
// window totals, and three page-wide monthly figures. The page reads every
// transaction once and derives every figure from that response. Person,
// expense type, window, and sort are selections over the same data; hidden
// categories are excluded everywhere.
//
// See openspec/changes/redesign-monthly-average-screen/specs/monthly-category-average/spec.md
// and design.md D1-D10.
import {
  CATEGORY_COLOR_PALETTE,
  averageDecimalString,
  compareDecimalStrings,
  createCategoryColorMap,
  createCategoryMonthlyAverageData,
  filterTransactionsByExpenseType,
  filterTransactionsByPerson,
  formatEuroAmount,
  formatMonthRange,
  getCategorySharePercent,
  getLastCalendarMonths,
  getLocalDateString,
  getPersonChoices,
  getWindowAbsoluteTotal,
  resolvePersonChoice,
  type CategoryMonthlyAverageRow,
  type CategorySpendingTransaction,
  type ExpenseTypeChoice,
} from '../utils/category-spending';

const { data: transactions, error, pending } = useFetch<CategorySpendingTransaction[]>('/api/transactions');
const router = useRouter();
const route = router.currentRoute;
const today = getLocalDateString(new Date());

// One presentation is rendered at a time: cards below the `sm` breakpoint,
// the semantic table from `sm` up. The fallback is the table when matchMedia is
// unavailable, matching the transactions screen's card/table pattern.
const PHONE_MEDIA_QUERY = '(max-width: 639.98px)';

function phoneMediaQuery(): MediaQueryList | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(PHONE_MEDIA_QUERY)
    : null;
}

const phoneQuery = phoneMediaQuery();
const phoneViewport = ref(phoneQuery?.matches ?? isPhoneWidth());

function isPhoneWidth(): boolean {
  return typeof window !== 'undefined' && window.innerWidth > 0 && window.innerWidth < 640;
}

function syncPhoneViewport(event?: MediaQueryListEvent): void {
  phoneViewport.value = event?.matches ?? phoneQuery?.matches ?? isPhoneWidth();
}

function onPhoneResize(): void {
  syncPhoneViewport();
}

onMounted(() => {
  syncPhoneViewport();
  phoneQuery?.addEventListener('change', syncPhoneViewport);
  window.addEventListener('resize', onPhoneResize);
});

onBeforeUnmount(() => {
  phoneQuery?.removeEventListener('change', syncPhoneViewport);
  window.removeEventListener('resize', onPhoneResize);
});

const monthCount = ref('12');
const appliedMonthCount = ref(12);
const sortColumn = ref<'amount' | 'category'>('amount');
const sortDirection = ref<'asc' | 'desc'>('desc');
const expenseType = ref<ExpenseTypeChoice>('all');
const sortColumnLabel = computed(() => sortColumn.value === 'amount' ? 'average amount' : 'category');
const sortDirectionLabel = computed(() => sortDirection.value === 'asc' ? 'ascending' : 'descending');

const windowMonths = computed(() => [...getLastCalendarMonths(today, appliedMonthCount.value)].reverse());
const monthRangeLabel = computed(() => formatMonthRange(windowMonths.value));
const appliedMonthsLabel = computed(() =>
  `${appliedMonthCount.value} ${appliedMonthCount.value === 1 ? 'month' : 'months'}`);
const lastMonthsLabel = computed(() =>
  `Last ${appliedMonthCount.value} ${appliedMonthCount.value === 1 ? 'month' : 'months'}`);
const subtitle = computed(() =>
  `Average per category over the last ${appliedMonthsLabel.value} · ${monthRangeLabel.value}`);
const trendGapClass = computed(() => appliedMonthCount.value > 12 ? 'gap-px' : 'gap-0.5');

// The person choices come from the returned transactions. The selection is
// URL-backed and independent of the window and the expense type; an absent or
// unknown person means all people.
const personChoices = computed(() => getPersonChoices(transactions.value ?? []));
const selectedPerson = ref<string | null>(null);

watch(
  [() => route.value.query.person, personChoices],
  () => {
    selectedPerson.value = resolvePersonChoice(route.value.query.person, personChoices.value);
  },
  { immediate: true },
);

function onPersonChange(event: Event): void {
  const value = (event.target as HTMLSelectElement).value;
  const next = value === 'all' ? null : value;
  selectedPerson.value = next;
  const query = { ...route.value.query };
  if (next === null || !personChoices.value.some(({ id }) => id === next)) {
    delete query.person;
  } else {
    query.person = next;
  }
  void router.replace({ path: route.value.path, query });
}

function onMonthCountInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  monthCount.value = value;

  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed > 0) {
    appliedMonthCount.value = parsed;
  }
}

// The person and expense-type choices are selections over the already-fetched
// transactions and are independent of the averaging window: changing any of them
// recomputes the table from the same data, without another request.
const personTransactions = computed(() =>
  filterTransactionsByPerson(transactions.value ?? [], selectedPerson.value),
);

const selectedTransactions = computed(() =>
  filterTransactionsByExpenseType(personTransactions.value, expenseType.value),
);

const averageData = computed(() => createCategoryMonthlyAverageData(
  selectedTransactions.value,
  today,
  appliedMonthCount.value,
));

const averages = computed(() => averageData.value.rows);

function compareCategoryOrder(
  left: CategoryMonthlyAverageRow,
  right: CategoryMonthlyAverageRow,
  direction: 1 | -1 = 1,
): number {
  if (left.key === 'uncategorised') {
    return right.key === 'uncategorised' ? 0 : 1;
  }
  if (right.key === 'uncategorised') {
    return -1;
  }

  const byName = left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
  if (byName !== 0) {
    return byName * direction;
  }

  const leftId = BigInt(left.key.slice('category:'.length));
  const rightId = BigInt(right.key.slice('category:'.length));
  return leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
}

const sortedAverages = computed(() => [...averages.value].sort((left, right) => {
  if (sortColumn.value === 'amount') {
    const byAmount = compareDecimalStrings(left.average, right.average);
    if (byAmount !== 0) {
      return byAmount * (sortDirection.value === 'asc' ? 1 : -1);
    }
    return compareCategoryOrder(left, right);
  }

  return compareCategoryOrder(left, right, sortDirection.value === 'asc' ? 1 : -1);
}));

const largestAverage = computed(() => averageData.value.rows.reduce(
  (largest, row) => (compareDecimalStrings(row.average, largest) > 0 ? row.average : largest),
  '0',
));

// The current-selection figure is the table's exact window total divided by the
// applied months. The typed figures are person-scoped context: they ignore the
// expense-type selection and cover only categories carrying that type.
const currentSelectionAverage = computed(() =>
  averageDecimalString(averageData.value.total, appliedMonthCount.value));
const recurringAverage = computed(() => averageDecimalString(
  getWindowAbsoluteTotal(
    filterTransactionsByExpenseType(personTransactions.value, 'recurring'),
    today,
    appliedMonthCount.value,
  ),
  appliedMonthCount.value,
));
const oneTimeAverage = computed(() => averageDecimalString(
  getWindowAbsoluteTotal(
    filterTransactionsByExpenseType(personTransactions.value, 'one-time'),
    today,
    appliedMonthCount.value,
  ),
  appliedMonthCount.value,
));

const summaryFigures = computed(() => [
  { key: 'current', label: 'Average per month', value: formatEuroAmount(currentSelectionAverage.value) },
  { key: 'recurring', label: 'Recurring / month', value: formatEuroAmount(recurringAverage.value) },
  { key: 'one-time', label: 'One-time / month', value: formatEuroAmount(oneTimeAverage.value) },
]);

// The colour map covers every returned category, not only the selected window,
// so a category keeps its colour as the window, person, or filters change.
const categoryColorMap = computed(() => createCategoryColorMap(
  (transactions.value ?? []).map(({ category }) =>
    category === null ? 'uncategorised' : `category:${category.id}`),
));

function categoryColor(key: string): string {
  return categoryColorMap.value.get(key) ?? CATEGORY_COLOR_PALETTE[0];
}

function averageBarPercent(amount: string): number {
  return getCategorySharePercent(amount, largestAverage.value);
}

function trendHeight(amount: string, maximum: string): number {
  return Math.max(3, Math.round(getCategorySharePercent(amount, maximum) / 100 * 28));
}

const tableCaption = computed(() =>
  `Average monthly absolute spend by category over the last ${appliedMonthsLabel.value}`);

function sortAria(column: 'amount' | 'category'): 'ascending' | 'descending' | undefined {
  if (sortColumn.value !== column) {
    return undefined;
  }
  return sortDirection.value === 'asc' ? 'ascending' : 'descending';
}

function sortArrow(column: 'amount' | 'category'): string {
  if (sortColumn.value !== column) {
    return '';
  }
  return sortDirection.value === 'asc' ? '↑' : '↓';
}
</script>

<template>
  <div>
    <h1 class="font-display text-[28px] font-extrabold tracking-[-0.02em] text-ink sm:text-[34px]">
      Monthly average
    </h1>
    <p class="mt-1.5 text-sm text-muted sm:text-[15px]" data-testid="monthly-average-subtitle">
      {{ subtitle }}
    </p>

    <p v-if="error" class="mt-4 text-muted">
      Monthly category averages could not be loaded.
    </p>
    <p v-else-if="pending" class="mt-4 text-muted">Loading monthly category averages…</p>
    <template v-else-if="transactions">
      <div
        class="mt-4 rounded-panel border border-card-border bg-surface p-4 shadow-sheet sm:p-5"
        data-testid="monthly-average-filter-panel"
      >
        <div class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <label class="grid min-w-0 gap-1.5 text-xs font-bold text-muted">
            Person
            <select
              :value="selectedPerson ?? 'all'"
              data-testid="person-filter"
              class="min-h-11 w-full min-w-0 rounded-control border border-rule-strong bg-surface px-3 py-2 text-sm text-ink focus:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              @change="onPersonChange"
            >
              <option value="all">All people</option>
              <option v-for="person in personChoices" :key="person.id" :value="person.id">
                {{ person.name }}
              </option>
            </select>
          </label>

          <label class="grid min-w-0 gap-1.5 text-xs font-bold text-muted">
            Type
            <select
              v-model="expenseType"
              data-testid="expense-type-filter"
              class="min-h-11 w-full min-w-0 rounded-control border border-rule-strong bg-surface px-3 py-2 text-sm text-ink focus:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <option value="all">All types</option>
              <option value="recurring">Recurring</option>
              <option value="one-time">One-time</option>
            </select>
          </label>

          <label class="grid min-w-0 gap-1.5 text-xs font-bold text-muted">
            Months to average
            <input
              :value="monthCount"
              type="number"
              min="1"
              step="1"
              data-testid="month-count-input"
              class="min-h-11 w-full min-w-0 rounded-control border border-rule-strong bg-surface px-3 py-2 text-sm text-ink focus:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              @input="onMonthCountInput"
            >
          </label>

          <label class="grid min-w-0 gap-1.5 text-xs font-bold text-muted">
            Sort by
            <select
              v-model="sortColumn"
              data-testid="monthly-average-sort-column"
              class="min-h-11 w-full min-w-0 rounded-control border border-rule-strong bg-surface px-3 py-2 text-sm text-ink focus:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <option value="amount">Average amount</option>
              <option value="category">Category</option>
            </select>
          </label>

          <label class="grid min-w-0 gap-1.5 text-xs font-bold text-muted">
            Order
            <select
              v-model="sortDirection"
              data-testid="monthly-average-sort-direction"
              class="min-h-11 w-full min-w-0 rounded-control border border-rule-strong bg-surface px-3 py-2 text-sm text-ink focus:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </label>
        </div>
        <p
          v-if="phoneViewport"
          class="mt-3 text-xs font-bold text-muted"
          data-testid="monthly-average-sort-statement"
          aria-live="polite"
        >
          Sorted by {{ sortColumnLabel }}, {{ sortDirectionLabel }}
        </p>
      </div>

      <p id="monthly-average-summary-note" class="sr-only">
        Recurring and one-time figures cover typed categories only.
      </p>
      <div
        class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3"
        aria-describedby="monthly-average-summary-note"
        data-testid="monthly-average-summary"
      >
        <section
          v-for="figure in summaryFigures"
          :key="figure.key"
          class="min-w-0 rounded-panel border border-card-border bg-surface p-5 shadow-sheet sm:p-6"
          data-testid="monthly-average-summary-card"
        >
          <h2 class="text-sm font-semibold text-muted">{{ figure.label }}</h2>
          <p
            class="mt-1.5 text-3xl font-extrabold tracking-[-0.02em] text-ink tabular-nums"
            data-testid="monthly-average-summary-value"
          >
            {{ figure.value }}
          </p>
        </section>
      </div>

      <template v-if="sortedAverages.length > 0">
        <div
          v-if="phoneViewport"
          class="mt-4 flex flex-col gap-3"
          data-testid="monthly-average-cards"
        >
          <article
            v-for="row in sortedAverages"
            :key="row.key"
            class="rounded-panel border border-card-border bg-surface p-4 shadow-sheet"
            data-testid="category-average-card"
            :data-category-key="row.key"
          >
            <div class="flex min-w-0 items-center gap-2">
              <span
                aria-hidden="true"
                class="h-2.5 w-2.5 shrink-0 rounded-full"
                data-testid="category-color"
                :style="{ backgroundColor: categoryColor(row.key) }"
              />
              <h2 class="min-w-0 break-words text-[15px] font-bold text-ink">{{ row.name }}</h2>
            </div>

            <p class="mt-2 text-xs font-bold text-muted">{{ lastMonthsLabel }}</p>
            <div
              class="mt-1 flex h-[30px] items-end"
              :class="trendGapClass"
              aria-hidden="true"
              data-testid="category-trend"
            >
              <div
                v-for="(cell, index) in row.cells"
                :key="averageData.months[index]?.key ?? index"
                class="min-w-0 flex-1 rounded-t-[3px]"
                data-testid="trend-bar"
                :style="{
                  height: `${trendHeight(cell, row.maximum)}px`,
                  backgroundColor: categoryColor(row.key),
                }"
              />
            </div>

            <div
              class="mt-2 h-2.5 rounded-full bg-surface ring-1 ring-rule"
              aria-hidden="true"
              data-testid="average-bar-cell"
            >
              <div
                class="h-2.5 rounded-full"
                data-testid="average-bar"
                :style="{
                  width: `${averageBarPercent(row.average)}%`,
                  backgroundColor: categoryColor(row.key),
                }"
              />
            </div>

            <dl class="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 border-t border-rule pt-2 text-xs text-muted">
              <dt class="font-bold">{{ appliedMonthCount }}-month total</dt>
              <dd class="text-right font-bold tabular-nums text-ink" data-testid="category-window-total">
                {{ formatEuroAmount(row.total) }}
              </dd>
              <dt class="font-bold">Avg / month</dt>
              <dd class="text-right font-bold tabular-nums text-ink" data-testid="category-average-amount">
                {{ formatEuroAmount(row.average) }}
              </dd>
            </dl>
          </article>
        </div>

        <div v-else class="mt-4" data-testid="monthly-average-table-section">
        <p
          id="monthly-average-table-scroll-help"
          class="mb-2 text-xs text-muted lg:hidden"
          data-testid="monthly-average-table-scroll-help"
        >
          Scroll horizontally to view every column.
        </p>
        <div
          role="region"
          aria-label="Monthly average category table"
          aria-describedby="monthly-average-table-scroll-help"
          tabindex="0"
          class="max-w-full overflow-x-auto rounded-panel border border-card-border bg-surface shadow-sheet focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          data-testid="monthly-average-table"
        >
          <table class="w-full min-w-[940px] border-collapse text-left text-sm">
            <caption class="sr-only">
              {{ tableCaption }}
            </caption>
            <thead>
              <tr class="text-xs uppercase tracking-[0.06em] text-muted">
                <th
                  scope="col"
                  class="px-3 py-3 font-bold sm:px-5"
                  :aria-sort="sortAria('category')"
                  data-testid="category-sort-header"
                >
                  Category<span v-if="sortArrow('category')" aria-hidden="true"> {{ sortArrow('category') }}</span>
                </th>
                <th scope="col" class="w-[150px] px-3 py-3 font-bold sm:px-5">{{ lastMonthsLabel }}</th>
                <th scope="col" class="w-[24%] px-3 py-3 font-bold sm:px-5">Average</th>
                <th scope="col" class="w-[130px] px-3 py-3 text-right font-bold sm:px-5">
                  {{ appliedMonthCount }}-month total
                </th>
                <th
                  scope="col"
                  class="w-[120px] px-3 py-3 text-right font-bold sm:px-5"
                  :aria-sort="sortAria('amount')"
                  data-testid="amount-sort-header"
                >
                  Avg / month<span v-if="sortArrow('amount')" aria-hidden="true"> {{ sortArrow('amount') }}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in sortedAverages"
                :key="row.key"
                class="border-t border-rule"
                data-testid="category-average"
                :data-category-key="row.key"
              >
                <th scope="row" class="whitespace-nowrap px-3 py-3 font-semibold sm:px-5">
                  <span class="inline-flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden="true"
                      class="h-2.5 w-2.5 shrink-0 rounded-full"
                      data-testid="category-color"
                      :style="{ backgroundColor: categoryColor(row.key) }"
                    />
                    <span class="break-words">{{ row.name }}</span>
                  </span>
                </th>
                <td class="px-3 py-3" aria-hidden="true" data-testid="category-trend">
                  <div class="flex h-[30px] items-end" :class="trendGapClass">
                    <div
                      v-for="(cell, index) in row.cells"
                      :key="averageData.months[index]?.key ?? index"
                      class="min-w-0 flex-1 rounded-t-[3px]"
                      data-testid="trend-bar"
                      :style="{
                        height: `${trendHeight(cell, row.maximum)}px`,
                        backgroundColor: categoryColor(row.key),
                      }"
                    />
                  </div>
                </td>
                <td class="px-3 py-3" aria-hidden="true" data-testid="average-bar-cell">
                  <div class="h-2.5 rounded-full bg-surface ring-1 ring-rule">
                    <div
                      class="h-2.5 rounded-full"
                      data-testid="average-bar"
                      :style="{
                        width: `${averageBarPercent(row.average)}%`,
                        backgroundColor: categoryColor(row.key),
                      }"
                    />
                  </div>
                </td>
                <td
                  class="whitespace-nowrap px-3 py-3 text-right text-muted tabular-nums sm:px-5"
                  data-testid="category-window-total"
                >
                  {{ formatEuroAmount(row.total) }}
                </td>
                <td
                  class="whitespace-nowrap px-3 py-3 text-right font-bold text-ink tabular-nums sm:px-5"
                  data-testid="category-average-amount"
                >
                  {{ formatEuroAmount(row.average) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        </div>
      </template>

      <p v-else class="mt-4 text-sm text-muted" data-testid="no-data">
        No category data for these months.
      </p>
    </template>
  </div>
</template>
