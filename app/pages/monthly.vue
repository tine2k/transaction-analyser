<script setup lang="ts">
// The Monthly screen: one selected calendar month, its absolute transaction
// totals by category, a top-eight bar, and the complete category table. The
// screen reads every transaction once and derives every figure from that
// response. The person, expense-type, and hide-uncategorised controls keep the
// analysis screens' existing selection rules; hidden categories are excluded
// everywhere.
//
// See openspec/changes/replace-analytics-with-monthly-screen/specs/category-spending-chart/spec.md
// and design.md D3-D11.
import {
  CATEGORY_COLOR_PALETTE,
  createCategoryColorMap,
  filterTransactionsByExpenseType,
  filterTransactionsByMonth,
  filterTransactionsByPerson,
  formatEuroAmount,
  getAvailableYears,
  getCalendarYearMonths,
  getCategoryBreakdown,
  getCategorySharePercent,
  getLocalDateString,
  getPersonChoices,
  isZeroAmountString,
  resolvePersonChoice,
  resolveSelectedMonth,
  type CategorySpendingTransaction,
  type ExpenseTypeChoice,
} from '../utils/category-spending';

const { data: transactions, error, pending } = useFetch<CategorySpendingTransaction[]>('/api/transactions');
const router = useRouter();
const route = router.currentRoute;
const today = getLocalDateString(new Date());
const hideUncategorised = ref(false);
const expenseType = ref<ExpenseTypeChoice>('all');
const selectedMonth = ref(today.slice(0, 7));

// The selected month is URL-backed. A supplied month wins; otherwise the
// current month wins when the returned transactions represent it, then the
// newest represented month, then the current month.
watch(
  [() => route.value.query.month, transactions],
  ([month]) => {
    selectedMonth.value = resolveSelectedMonth(month, transactions.value ?? [], today);
  },
  { immediate: true },
);

const selectedYear = computed(() => Number(selectedMonth.value.slice(0, 4)));
const yearOptions = computed(() => getAvailableYears(
  transactions.value ?? [],
  today,
  selectedMonth.value,
));
const yearMonths = computed(() => getCalendarYearMonths(selectedYear.value));
const selectedMonthLabel = computed(() =>
  yearMonths.value.find(({ key }) => key === selectedMonth.value)?.label ?? selectedMonth.value,
);

function selectMonth(month: string): void {
  selectedMonth.value = month;
  const query = { ...route.value.query, month };
  void router.replace({ path: route.value.path, query });
}

function onYearChange(event: Event): void {
  const year = (event.target as HTMLSelectElement).value;
  selectMonth(`${year}-${selectedMonth.value.slice(5, 7)}`);
}

// The person choices come from the returned transactions. The selection is
// URL-backed and independent of the month, expense type, and hide control; an
// absent or unknown person means all people.
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

// The person and expense-type choices select from the already-fetched
// transactions before the month and uncategorised filters, so every figure is
// recomputed from the same response without another request.
const personTransactions = computed(() =>
  filterTransactionsByPerson(transactions.value ?? [], selectedPerson.value),
);

const selectedTransactions = computed(() =>
  filterTransactionsByExpenseType(personTransactions.value, expenseType.value),
);

const monthTransactions = computed(() =>
  filterTransactionsByMonth(selectedTransactions.value, selectedMonth.value),
);

const displayedTransactions = computed(() =>
  hideUncategorised.value
    ? monthTransactions.value.filter(({ category }) => category !== null)
    : monthTransactions.value,
);

const breakdown = computed(() => getCategoryBreakdown(displayedTransactions.value));
const largestAmount = computed(() => breakdown.value.entries[0]?.amount ?? '0');
const barSegments = computed(() => [
  ...breakdown.value.top,
  ...(breakdown.value.other === null ? [] : [breakdown.value.other]),
]);
const barHasAmount = computed(() => !isZeroAmountString(breakdown.value.total));
const barHeading = computed(() => {
  const other = breakdown.value.other;
  return other === null
    ? 'Category totals'
    : `Category totals: top 8 + ${other.name.replace('Other ', '')} others`;
});
const subtitle = computed(() => {
  const count = breakdown.value.entries.length;
  return count === 0
    ? 'Absolute transaction totals by category'
    : `Absolute transaction totals by category, ${count} ${count === 1 ? 'category' : 'categories'}`;
});

// The colour map covers every returned category, not only the selected month,
// so a category keeps its colour as the month, person, or filters change.
const categoryColorMap = computed(() => createCategoryColorMap(
  (transactions.value ?? []).map(({ category }) =>
    category === null ? 'uncategorised' : `category:${category.id}`),
));

function categoryColor(key: string): string {
  return categoryColorMap.value.get(key) ?? CATEGORY_COLOR_PALETTE[0];
}

function sharePercent(amount: string): number {
  return getCategorySharePercent(amount, largestAmount.value);
}

function categoryFilterValue(key: string): string {
  return key === 'uncategorised' ? 'uncategorised' : key.replace(/^category:/, '');
}

function transactionLocation(categoryKey: string) {
  return {
    path: '/',
    query: {
      month: selectedMonth.value,
      category: categoryFilterValue(categoryKey),
      ...(selectedPerson.value === null ? {} : { person: selectedPerson.value }),
    },
  };
}
</script>

<template>
  <div>
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div class="min-w-0">
        <h1 class="font-display text-[28px] font-extrabold tracking-[-0.02em] text-ink sm:text-[34px]">
          Monthly
        </h1>
        <p class="mt-1.5 text-sm text-muted sm:text-[15px]" data-testid="monthly-subtitle">
          {{ subtitle }}
        </p>
      </div>

      <div v-if="transactions" class="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
        <label class="inline-flex min-h-11 items-center gap-2 text-sm text-muted">
          Year
          <select
            :value="selectedYear"
            data-testid="year-select"
            class="min-h-11 max-w-full rounded-sheet border border-rule-strong bg-surface px-2 py-1 text-ink focus:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            @change="onYearChange"
          >
            <option v-for="year in yearOptions" :key="year" :value="year">{{ year }}</option>
          </select>
        </label>

        <fieldset
          class="flex min-w-0 flex-wrap items-center gap-1.5"
          data-testid="month-picker"
        >
          <legend class="sr-only">Month</legend>
          <button
            v-for="month in yearMonths"
            :key="month.key"
            type="button"
            :aria-pressed="selectedMonth === month.key"
            :aria-label="month.label"
            :data-month-key="month.key"
            data-testid="month-pill"
            class="min-h-11 shrink-0 rounded-pill px-3.5 py-2 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            :class="
              selectedMonth === month.key
                ? 'bg-brand text-white'
                : 'border border-rule-strong bg-surface text-ink hover:bg-paper'
            "
            @click="selectMonth(month.key)"
          >
            {{ month.label.slice(0, 3) }}
          </button>
        </fieldset>
      </div>
    </div>

    <p v-if="error" class="mt-4 text-muted" data-testid="monthly-error">
      Monthly data could not be loaded.
    </p>
    <p v-else-if="pending" class="mt-4 text-muted" data-testid="monthly-loading">
      Loading monthly data…
    </p>

    <template v-else-if="transactions">
      <div class="mt-4 flex flex-col gap-3 rounded-panel bg-surface p-4 shadow-sheet sm:p-5" data-testid="monthly-filter-panel">
        <fieldset class="flex flex-wrap items-center gap-4 text-sm text-muted" data-testid="expense-type-filter">
          <legend class="sr-only">Expense type filter</legend>
          <label class="inline-flex min-h-11 items-center gap-2">
            <input
              v-model="expenseType"
              type="radio"
              name="expense-type"
              value="all"
              data-testid="expense-type-all"
              class="size-5 min-h-11 border-rule-strong text-muted focus:ring-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
            All
          </label>
          <label class="inline-flex min-h-11 items-center gap-2">
            <input
              v-model="expenseType"
              type="radio"
              name="expense-type"
              value="recurring"
              data-testid="expense-type-recurring"
              class="size-5 min-h-11 border-rule-strong text-muted focus:ring-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
            Recurring
          </label>
          <label class="inline-flex min-h-11 items-center gap-2">
            <input
              v-model="expenseType"
              type="radio"
              name="expense-type"
              value="one-time"
              data-testid="expense-type-one-time"
              class="size-5 min-h-11 border-rule-strong text-muted focus:ring-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
            One-time
          </label>
        </fieldset>

        <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6">
          <label class="inline-flex min-h-11 flex-wrap items-center gap-2 text-sm text-muted">
            Person
            <select
              :value="selectedPerson ?? 'all'"
              data-testid="person-filter"
              class="min-h-11 max-w-full rounded-sheet border border-rule-strong bg-surface px-2 py-1 text-ink focus:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              @change="onPersonChange"
            >
              <option value="all">All people</option>
              <option v-for="person in personChoices" :key="person.id" :value="person.id">
                {{ person.name }}
              </option>
            </select>
          </label>

          <label class="inline-flex min-h-11 items-center gap-3 text-sm text-muted">
            <input
              v-model="hideUncategorised"
              type="checkbox"
              data-testid="hide-uncategorised"
              class="size-5 rounded border-rule-strong text-muted focus:ring-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
            Hide uncategorised
          </label>
        </div>
      </div>

      <div class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2" data-testid="monthly-summary">
        <section class="min-w-0 rounded-panel bg-surface p-5 shadow-sheet sm:p-6" data-testid="monthly-summary-card">
          <h2 class="text-sm font-semibold text-muted">Total moved</h2>
          <p class="mt-1.5 text-3xl font-extrabold tracking-[-0.02em] text-ink tabular-nums" data-testid="total-moved-value">
            {{ formatEuroAmount(breakdown.total) }}
          </p>
        </section>
        <section class="min-w-0 rounded-panel bg-surface p-5 shadow-sheet sm:p-6" data-testid="monthly-summary-card">
          <h2 class="text-sm font-semibold text-muted">Transactions</h2>
          <p class="mt-1.5 text-3xl font-extrabold tracking-[-0.02em] text-ink tabular-nums" data-testid="transaction-count-value">
            {{ breakdown.transactionCount }}
          </p>
        </section>
      </div>

      <section class="mt-5 rounded-panel bg-surface p-5 shadow-sheet sm:p-6" data-testid="monthly-bar-panel">
        <h2 class="font-display text-lg font-bold text-ink" data-testid="bar-heading">
          {{ barHeading }}
        </h2>

        <div v-if="barHasAmount" class="mt-4" aria-hidden="true" data-testid="category-bar">
          <div class="flex h-11 gap-0.5 overflow-hidden rounded-control">
            <div
              v-for="segment in barSegments"
              :key="segment.key"
              class="h-full min-w-0"
              data-testid="bar-segment"
              :data-category-key="segment.key"
              :style="{
                flexGrow: sharePercent(segment.amount),
                backgroundColor: segment.key === 'other' ? 'var(--color-rule-strong)' : categoryColor(segment.key),
              }"
            />
          </div>
        </div>

        <ul
          v-if="barHasAmount && barSegments.length > 0"
          class="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted"
          data-testid="bar-legend"
        >
          <li
            v-for="segment in barSegments"
            :key="segment.key"
            class="inline-flex min-w-0 items-center gap-2"
            data-testid="bar-legend-item"
          >
            <span
              aria-hidden="true"
              class="h-3 w-3 shrink-0 rounded"
              :style="{ backgroundColor: segment.key === 'other' ? 'var(--color-rule-strong)' : categoryColor(segment.key) }"
            />
            <span class="break-words">{{ segment.name }}</span>
            <b class="shrink-0 text-ink tabular-nums">{{ formatEuroAmount(segment.amount) }}</b>
          </li>
        </ul>
      </section>

      <p v-if="breakdown.entries.length === 0" class="mt-5 text-sm text-muted" data-testid="no-category-data">
        No category data for {{ selectedMonthLabel }}.
      </p>

      <template v-else>
        <div class="mt-4" data-testid="monthly-table-section">
          <p id="monthly-table-scroll-help" class="mb-2 text-xs text-muted lg:hidden">
            Scroll horizontally to view every column.
          </p>
          <div
            role="region"
            aria-label="Monthly category table"
            aria-describedby="monthly-table-scroll-help"
            tabindex="0"
            class="max-w-full overflow-x-auto rounded-panel bg-surface shadow-sheet focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            data-testid="monthly-category-scroll"
          >
            <table
              class="w-full min-w-[720px] border-collapse text-left text-sm"
              data-testid="monthly-category-table"
            >
              <caption class="sr-only">
                Absolute transaction totals by category for {{ selectedMonthLabel }}
              </caption>
              <thead>
                <tr class="text-xs uppercase tracking-[0.06em] text-muted">
                  <th scope="col" class="px-3 py-3 font-bold sm:px-5">Category</th>
                  <th scope="col" class="w-[38%] px-3 py-3 font-bold sm:px-5">Share of top category</th>
                  <th scope="col" class="px-3 py-3 text-right font-bold sm:px-5">Transactions</th>
                  <th scope="col" class="px-3 py-3 text-right font-bold sm:px-5">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="entry in breakdown.entries"
                  :key="entry.key"
                  class="border-t border-rule"
                  data-testid="category-row"
                  :data-category-key="entry.key"
                >
                  <th scope="row" class="whitespace-nowrap px-3 py-3 font-semibold sm:px-5">
                    <NuxtLink
                      :to="transactionLocation(entry.key)"
                      :aria-label="`View ${entry.name} transactions for ${selectedMonthLabel}`"
                      class="inline-flex min-h-11 items-center gap-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                      data-testid="category-transaction-link"
                    >
                      <span
                        aria-hidden="true"
                        class="h-2.5 w-2.5 shrink-0 rounded-full"
                        data-testid="category-color"
                        :style="{ backgroundColor: categoryColor(entry.key) }"
                      />
                      <span class="break-words">{{ entry.name }}</span>
                    </NuxtLink>
                  </th>
                  <td class="px-3 py-3 sm:px-5">
                    <div class="h-2.5 rounded-full bg-rule">
                      <div
                        class="h-2.5 rounded-full"
                        data-testid="share-bar"
                        :style="{
                          width: `${sharePercent(entry.amount)}%`,
                          backgroundColor: categoryColor(entry.key),
                        }"
                      />
                    </div>
                  </td>
                  <td class="whitespace-nowrap px-3 py-3 text-right text-muted tabular-nums sm:px-5" data-testid="row-transactions">
                    {{ entry.transactions }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-3 text-right font-bold text-ink tabular-nums sm:px-5" data-testid="row-amount">
                    {{ formatEuroAmount(entry.amount) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>
