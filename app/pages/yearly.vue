<script setup lang="ts">
// The Yearly screen: one selected year, its exact category-by-month matrix, a
// total column, and two summary figures. Every figure comes from the single
// transaction read. The person, expense-type, and hide-uncategorised controls
// keep the analysis screens' selection rules; hidden categories are excluded
// everywhere.
//
// See openspec/changes/replace-monthly-totals-with-yearly-screen/specs/monthly-category-totals-table/spec.md
// and design.md D1-D11.
import {
  CATEGORY_COLOR_PALETTE,
  averageDecimalString,
  createCategoryColorMap,
  createYearlyCategoryMatrixData,
  filterTransactionsByExpenseType,
  filterTransactionsByPerson,
  formatEuroAmount,
  getElapsedMonthsInYear,
  getLocalDateString,
  getPersonChoices,
  getYearlyCellTintPercent,
  getYearlyYearOptions,
  isZeroAmountString,
  resolvePersonChoice,
  resolveSelectedYear,
  type CategorySpendingTransaction,
  type ExpenseTypeChoice,
  type YearlyCategoryRow,
} from '../utils/category-spending';

const { data: transactions, error, pending } = useFetch<CategorySpendingTransaction[]>('/api/transactions');
const router = useRouter();
const route = router.currentRoute;
const today = getLocalDateString(new Date());
const hideUncategorised = ref(false);
const expenseType = ref<ExpenseTypeChoice>('all');
const selectedYear = ref(Number(today.slice(0, 4)));

// The selected year is URL-backed. A supplied year wins even when it is empty;
// otherwise the current year wins when it is represented, then the newest
// represented year, then the current year.
watch(
  [() => route.value.query.year, transactions],
  () => {
    selectedYear.value = resolveSelectedYear(route.value.query.year, transactions.value ?? [], today);
  },
  { immediate: true },
);

const yearOptions = computed(() => getYearlyYearOptions(
  transactions.value ?? [],
  today,
  selectedYear.value,
));

function selectYear(year: number): void {
  selectedYear.value = year;
  const query = { ...route.value.query, year: String(year) };
  void router.replace({ path: route.value.path, query });
}

// The person choices come from the returned transactions. The selection is
// URL-backed and independent of the year, expense type, and hide control; an
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
// transactions before the optional uncategorised exclusion, so every figure is
// recomputed from the same response without another request. Hidden categories
// are excluded inside the matrix builder.
const personTransactions = computed(() =>
  filterTransactionsByPerson(transactions.value ?? [], selectedPerson.value),
);

const typedTransactions = computed(() =>
  filterTransactionsByExpenseType(personTransactions.value, expenseType.value),
);

const displayedTransactions = computed(() =>
  hideUncategorised.value
    ? typedTransactions.value.filter(({ category }) => category !== null)
    : typedTransactions.value,
);

const matrix = computed(() => createYearlyCategoryMatrixData(
  displayedTransactions.value,
  selectedYear.value,
  today,
));

const elapsedMonths = computed(() => getElapsedMonthsInYear(selectedYear.value, today));
const totalMoved = computed(() => formatEuroAmount(matrix.value.total));
const average = computed(() => elapsedMonths.value === 0
  ? '–'
  : formatEuroAmount(averageDecimalString(matrix.value.total, elapsedMonths.value)));

// The colour map covers every returned category, not only the selected year,
// so a category keeps its colour as the year and filters change.
const categoryColorMap = computed(() => createCategoryColorMap(
  (transactions.value ?? []).map(({ category }) =>
    category === null ? 'uncategorised' : `category:${category.id}`),
));

function categoryColor(key: string): string {
  return categoryColorMap.value.get(key) ?? CATEGORY_COLOR_PALETTE[0];
}

function categoryFilterValue(key: string): string {
  return key === 'uncategorised' ? 'uncategorised' : key.replace(/^category:/, '');
}

function cellAmount(row: YearlyCategoryRow, index: number): string {
  return row.cells[index] ?? '0';
}

function cellText(amount: string): string {
  return isZeroAmountString(amount) ? '' : formatEuroAmount(amount);
}

function cellClass(amount: string, rowMaximum: string): string {
  if (isZeroAmountString(amount)) {
    return 'bg-paper';
  }
  return getYearlyCellTintPercent(amount, rowMaximum) > 0 ? 'yearly-tint' : '';
}

function cellTintStyle(amount: string, rowMaximum: string): Record<string, string> | undefined {
  const percent = getYearlyCellTintPercent(amount, rowMaximum);
  return percent === 0 ? undefined : { '--yearly-tint': `${percent}%` };
}

function monthLocation(monthKey: string, categoryKey: string) {
  return {
    path: '/',
    query: {
      month: monthKey,
      category: categoryFilterValue(categoryKey),
      ...(selectedPerson.value === null ? {} : { person: selectedPerson.value }),
    },
  };
}

function totalLocation(categoryKey: string) {
  return {
    path: '/',
    query: {
      year: String(selectedYear.value),
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
          Yearly
        </h1>
        <p class="mt-1.5 text-sm text-muted sm:text-[15px]" data-testid="yearly-subtitle">
          Every category, month by month
        </p>
      </div>

      <div
        v-if="transactions"
        class="flex min-w-0 flex-wrap gap-1.5"
        role="group"
        aria-label="Year"
        data-testid="year-pills"
      >
        <button
          v-for="year in yearOptions"
          :key="year"
          type="button"
          :aria-pressed="selectedYear === year"
          :data-year="year"
          data-testid="year-pill"
          class="min-h-11 shrink-0 rounded-pill px-4 py-2 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          :class="
            selectedYear === year
              ? 'bg-brand text-white'
              : 'border border-rule-strong bg-surface text-ink hover:bg-paper'
          "
          @click="selectYear(year)"
        >
          {{ year }}
        </button>
      </div>
    </div>

    <p v-if="error" class="mt-4 text-muted" data-testid="yearly-error">
      Yearly data could not be loaded.
    </p>
    <p v-else-if="pending" class="mt-4 text-muted" data-testid="yearly-loading">
      Loading yearly data…
    </p>

    <template v-else-if="transactions">
      <div class="mt-4 flex flex-col gap-3 rounded-panel bg-surface p-4 shadow-sheet sm:p-5" data-testid="yearly-filter-panel">
        <fieldset class="flex flex-wrap items-center gap-4 text-sm text-muted" data-testid="expense-type-filter">
          <legend class="sr-only">Expense type filter</legend>
          <label class="inline-flex min-h-11 items-center gap-2">
            <input
              v-model="expenseType"
              type="radio"
              name="yearly-expense-type"
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
              name="yearly-expense-type"
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
              name="yearly-expense-type"
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

      <div class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2" data-testid="yearly-summary">
        <section class="min-w-0 rounded-panel bg-surface p-5 shadow-sheet sm:p-6" data-testid="yearly-summary-card">
          <h2 class="text-sm font-semibold text-muted">Total moved {{ selectedYear }}</h2>
          <p class="mt-1.5 text-3xl font-extrabold tracking-[-0.02em] text-ink tabular-nums" data-testid="total-moved-value">
            {{ totalMoved }}
          </p>
        </section>
        <section class="min-w-0 rounded-panel bg-surface p-5 shadow-sheet sm:p-6" data-testid="yearly-summary-card">
          <h2 class="text-sm font-semibold text-muted">Avg per month</h2>
          <p class="mt-1.5 text-3xl font-extrabold tracking-[-0.02em] text-ink tabular-nums" data-testid="average-value">
            {{ average }}
          </p>
          <p v-if="elapsedMonths > 0" class="mt-1 text-xs text-muted" data-testid="average-divisor">
            over {{ elapsedMonths }} {{ elapsedMonths === 1 ? 'month' : 'months' }}
          </p>
        </section>
      </div>

      <div class="mt-4" data-testid="yearly-table-section">
        <p id="yearly-matrix-scroll-help" class="mb-2 text-xs text-muted lg:hidden">
          Scroll horizontally to view every month.
        </p>
        <div
          role="region"
          aria-label="Yearly category matrix"
          aria-describedby="yearly-matrix-scroll-help"
          tabindex="0"
          class="max-w-full overflow-x-auto rounded-panel bg-surface shadow-sheet focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          data-testid="yearly-matrix-scroll"
        >
          <table
            class="w-full min-w-[1100px] border-collapse text-left text-sm"
            data-testid="yearly-matrix"
          >
            <caption class="sr-only">
              Absolute transaction totals by category for {{ selectedYear }}
            </caption>
            <thead>
              <tr class="text-xs uppercase tracking-[0.06em] text-muted">
                <th scope="col" class="px-3 py-3 font-bold sm:px-5">Category</th>
                <th
                  v-for="month in matrix.months"
                  :key="month.key"
                  scope="col"
                  class="px-2 py-3 text-right font-bold"
                >
                  {{ month.label.slice(0, 3) }}
                </th>
                <th scope="col" class="px-3 py-3 text-right font-bold sm:px-5">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in matrix.rows"
                :key="row.key"
                class="border-t border-rule"
                data-testid="yearly-row"
                :data-category-key="row.key"
              >
                <th scope="row" class="whitespace-nowrap px-3 py-2 font-semibold sm:px-5">
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
                <td
                  v-for="(month, index) in matrix.months"
                  :key="month.key"
                  class="p-0 text-right tabular-nums text-ink"
                  :class="cellClass(cellAmount(row, index), row.maximum)"
                  :style="cellTintStyle(cellAmount(row, index), row.maximum)"
                  data-testid="yearly-month-cell"
                  :data-month-key="month.key"
                >
                  <NuxtLink
                    v-if="!isZeroAmountString(cellAmount(row, index))"
                    :to="monthLocation(month.key, row.key)"
                    class="block min-h-11 px-2 py-2 transition-colors hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink"
                    data-testid="yearly-month-link"
                  >
                    {{ cellText(cellAmount(row, index)) }}
                  </NuxtLink>
                  <span v-else class="block px-2 py-2">
                    {{ cellText(cellAmount(row, index)) }}
                  </span>
                </td>
                <td
                  class="whitespace-nowrap px-3 py-2 text-right font-bold tabular-nums text-ink sm:px-5"
                  data-testid="yearly-total-cell"
                >
                  <NuxtLink
                    v-if="!isZeroAmountString(row.total)"
                    :to="totalLocation(row.key)"
                    class="inline-flex min-h-11 items-center px-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                    data-testid="yearly-total-link"
                  >
                    {{ formatEuroAmount(row.total) }}
                  </NuxtLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p v-if="matrix.rows.length === 0" class="mt-5 text-sm text-muted" data-testid="no-category-data">
        No category data for {{ selectedYear }}.
      </p>
    </template>
  </div>
</template>
