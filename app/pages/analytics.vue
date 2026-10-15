<script setup lang="ts">
import type { EChartsOption } from 'echarts';
import {
  CATEGORY_COLOR_PALETTE,
  createCategoryColorMap,
  createMonthlyCategoryChartData,
  createYearlyCategoryChartData,
  filterTransactionsByExpenseType,
  formatEuroAmount,
  getLocalDateString,
  getMonthlyCategorySpendingTotals,
  getYearlyCategorySpendingTotals,
  groupTransactionsByAvailableYear,
  groupTransactionsByMonth,
  type CategoryPieDatum,
  type CategorySpendingTotal,
  type CategorySpendingTransaction,
  type ExpenseTypeChoice,
} from '../utils/category-spending';

const { data: transactions, error, pending } = useFetch<CategorySpendingTransaction[]>('/api/transactions');
const router = useRouter();
const today = getLocalDateString(new Date());
const hideUncategorised = ref(false);
const view = ref<'months' | 'years'>('months');
const expenseType = ref<ExpenseTypeChoice>('all');

// The expense-type choice is a selection over the already-fetched transactions, so
// every panel is recomputed from them and no further request is made.
const selectedTransactions = computed(() =>
  filterTransactionsByExpenseType(transactions.value ?? [], expenseType.value),
);

const monthlyCharts = computed(() =>
  createMonthlyCategoryChartData(
    getMonthlyCategorySpendingTotals(groupTransactionsByMonth(selectedTransactions.value, today)),
  ),
);

const yearlyCharts = computed(() =>
  createYearlyCategoryChartData(
    getYearlyCategorySpendingTotals(groupTransactionsByAvailableYear(selectedTransactions.value)),
  ),
);

// One map over both views keeps a category's color stable when the view
// changes, in addition to keeping it stable within a view.
const categoryColorMap = computed(() => createCategoryColorMap([
  ...monthlyCharts.value.flatMap(({ totals }) => totals.map(({ key }) => key)),
  ...yearlyCharts.value.flatMap(({ totals }) => totals.map(({ key }) => key)),
]));

type DisplayedChart = {
  key: string;
  label: string;
  totals: CategorySpendingTotal[];
  pieData: CategoryPieDatum[];
};

function withoutUncategorised<T extends DisplayedChart>(chart: T): T {
  if (!hideUncategorised.value) {
    return chart;
  }
  return {
    ...chart,
    totals: chart.totals.filter(({ key }) => key !== 'uncategorised'),
    pieData: chart.pieData.filter(({ key }) => key !== 'uncategorised'),
  };
}

const displayedMonthlyCharts = computed(() => monthlyCharts.value.map(withoutUncategorised));
const displayedYearlyCharts = computed(() => yearlyCharts.value.map(withoutUncategorised));

function categoryColor(key: string): string {
  return categoryColorMap.value.get(key) ?? CATEGORY_COLOR_PALETTE[0];
}

function tooltipLabel(parameter: unknown): string {
  const item = (Array.isArray(parameter) ? parameter[0] : parameter) as {
    data?: Partial<CategoryPieDatum>;
  } | undefined;
  if (item?.data?.name === undefined || item.data.amount === undefined) {
    return '';
  }
  return `${item.data.name}: ${formatEuroAmount(item.data.amount)}`;
}

function sliceLabel(parameter: unknown): string {
  const item = parameter as { data?: Partial<CategoryPieDatum> } | undefined;
  if (item?.data?.name === undefined || item.data.amount === undefined) {
    return '';
  }
  return `${item.data.name}\n${formatEuroAmount(item.data.amount)}`;
}

function categoryFilterValue(key: string): string {
  return key === 'uncategorised' ? 'uncategorised' : key.replace(/^category:/, '');
}

function transactionLocation(periodKey: 'month' | 'year', period: string, categoryKey: string) {
  return {
    path: '/',
    query: { [periodKey]: period, category: categoryFilterValue(categoryKey) },
  };
}

function onPieSliceClick(parameter: unknown, periodKey: 'month' | 'year', period: string): void {
  const item = parameter as { data?: { key?: unknown } } | undefined;
  if (typeof item?.data?.key !== 'string') {
    return;
  }
  const key = item.data.key;
  if (key !== 'uncategorised' && !key.startsWith('category:')) {
    return;
  }
  void router.push(transactionLocation(periodKey, period, key));
}

function chartOption(chart: DisplayedChart): EChartsOption {
  return {
    textStyle: { fontFamily: 'IBM Plex Sans Variable, sans-serif', color: '#20242B' },
    tooltip: {
      trigger: 'item',
      formatter: tooltipLabel,
    },
    legend: { show: false },
    series: [{
      type: 'pie',
      radius: '58%',
      minShowLabelAngle: 0,
      labelLayout: { hideOverlap: false },
      data: chart.pieData.map((datum) => {
        const color = categoryColor(datum.key);
        return {
          ...datum,
          itemStyle: { color },
          emphasis: { itemStyle: { color } },
        };
      }),
      label: {
        show: true,
        formatter: sliceLabel,
        color: '#20242B',
        fontSize: 12,
        lineHeight: 16,
        overflow: 'none',
        alignTo: 'edge',
        edgeDistance: 8,
      },
    }],
  };
}
</script>

<template>
  <div>
    <h1 class="font-display text-2xl font-semibold text-ink sm:text-3xl">Category spending</h1>
    <p class="mt-2 max-w-2xl text-sm text-muted">
      {{ view === 'months'
        ? 'Absolute transaction totals by category for each of the last 12 months.'
        : 'Absolute transaction totals by category for every calendar year with transaction data.' }}
    </p>

    <p v-if="error" class="mt-4 text-muted">
      Monthly category totals could not be loaded.
    </p>
    <p v-else-if="pending" class="mt-4 text-muted">Loading monthly category totals…</p>
    <template v-else-if="transactions">
      <fieldset class="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted" data-testid="view-switch">
        <legend class="sr-only">Category spending view</legend>
        <label class="inline-flex min-h-11 items-center gap-2">
          <input
            v-model="view"
            type="radio"
            name="analytics-view"
            value="months"
            data-testid="view-months"
            class="size-5 min-h-11 border-rule-strong text-muted focus:ring-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
          Months
        </label>
        <label class="inline-flex min-h-11 items-center gap-2">
          <input
            v-model="view"
            type="radio"
            name="analytics-view"
            value="years"
            data-testid="view-years"
            class="size-5 min-h-11 border-rule-strong text-muted focus:ring-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
          Years
        </label>
      </fieldset>

      <fieldset class="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted" data-testid="expense-type-filter">
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

      <label class="mt-2 inline-flex min-h-11 items-center gap-3 py-2 text-sm text-muted">
        <input
          v-model="hideUncategorised"
          type="checkbox"
          data-testid="hide-uncategorised"
          class="size-5 rounded border-rule-strong text-muted focus:ring-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
        Hide uncategorised
      </label>

      <div
        v-if="view === 'months'"
        class="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3"
        data-testid="monthly-charts"
      >
        <section
          v-for="month in displayedMonthlyCharts"
          :key="month.key"
          class="min-w-0 rounded-sheet border border-rule-strong bg-surface p-4"
          data-testid="month-panel"
          :data-month-key="month.key"
        >
          <h2 class="font-display text-lg font-semibold text-ink">
            <NuxtLink
              :to="{ path: '/', query: { month: month.key, category: 'all' } }"
              :aria-label="`View all transactions for ${month.label}`"
              class="hover:underline"
              data-testid="month-link"
            >
              {{ month.label }}
            </NuxtLink>
          </h2>
          <figure class="mt-3 min-w-0">
            <figcaption class="sr-only">Pie chart of absolute transaction totals for {{ month.label }}</figcaption>
            <ClientOnly>
              <CategoryPieChart :option="chartOption(month)" @click="onPieSliceClick($event, 'month', month.key)" />
            </ClientOnly>
          </figure>

          <p v-if="month.totals.length === 0" class="mt-2 text-sm text-muted">
            No category data for {{ month.label }}.
          </p>
          <ul v-else aria-label="Category totals" class="mt-2 grid min-w-0 gap-2 text-sm">
            <li
              v-for="total in month.totals"
              :key="total.key"
              class="min-w-0"
              data-testid="category-total"
            >
              <NuxtLink
                :to="transactionLocation('month', month.key, total.key)"
                :aria-label="`View ${total.name} transactions for ${month.label}`"
                class="flex min-h-11 w-full min-w-0 items-center justify-between gap-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                data-testid="category-transaction-link"
              >
                <span class="flex min-w-0 flex-1 items-center gap-2">
                  <span
                    aria-hidden="true"
                    class="h-3 w-3 shrink-0 rounded-full"
                    data-testid="category-color"
                    :style="{ backgroundColor: categoryColor(total.key) }"
                  />
                  <span class="min-w-0 break-words text-muted">{{ total.name }}</span>
                </span>
                <span class="max-w-[55%] shrink-0 break-words text-right tabular-nums font-medium text-ink">
                  {{ formatEuroAmount(total.amount) }}
                </span>
              </NuxtLink>
            </li>
          </ul>
        </section>
      </div>

      <div
        v-else
        class="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3"
        data-testid="yearly-charts"
      >
        <section
          v-for="year in displayedYearlyCharts"
          :key="year.key"
          class="min-w-0 rounded-sheet border border-rule-strong bg-surface p-4"
          data-testid="year-panel"
          :data-year-key="year.key"
        >
          <h2 class="font-display text-lg font-semibold text-ink">
            <NuxtLink
              :to="{ path: '/', query: { year: year.key, category: 'all' } }"
              :aria-label="`View all transactions for ${year.label}`"
              class="hover:underline"
              data-testid="year-link"
            >
              {{ year.label }}
            </NuxtLink>
          </h2>
          <figure class="mt-3 min-w-0">
            <figcaption class="sr-only">Pie chart of absolute transaction totals for {{ year.label }}</figcaption>
            <ClientOnly>
              <CategoryPieChart :option="chartOption(year)" @click="onPieSliceClick($event, 'year', year.key)" />
            </ClientOnly>
          </figure>

          <p v-if="year.totals.length === 0" class="mt-2 text-sm text-muted">
            No category data for {{ year.label }}.
          </p>
          <ul v-else aria-label="Category totals" class="mt-2 grid min-w-0 gap-2 text-sm">
            <li
              v-for="total in year.totals"
              :key="total.key"
              class="min-w-0"
              data-testid="category-total"
            >
              <NuxtLink
                :to="transactionLocation('year', year.key, total.key)"
                :aria-label="`View ${total.name} transactions for ${year.label}`"
                class="flex min-h-11 w-full min-w-0 items-center justify-between gap-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                data-testid="category-transaction-link"
              >
                <span class="flex min-w-0 flex-1 items-center gap-2">
                  <span
                    aria-hidden="true"
                    class="h-3 w-3 shrink-0 rounded-full"
                    data-testid="category-color"
                    :style="{ backgroundColor: categoryColor(total.key) }"
                  />
                  <span class="min-w-0 break-words text-muted">{{ total.name }}</span>
                </span>
                <span class="max-w-[55%] shrink-0 break-words text-right tabular-nums font-medium text-ink">
                  {{ formatEuroAmount(total.amount) }}
                </span>
              </NuxtLink>
            </li>
          </ul>
        </section>
      </div>

      <p
        v-if="view === 'years' && displayedYearlyCharts.length === 0"
        class="mt-4 text-sm text-muted"
        data-testid="no-year-data"
      >
        No category data for any year.
      </p>
    </template>
  </div>
</template>
