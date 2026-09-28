<script setup lang="ts">
import type { EChartsOption } from 'echarts';
import {
  CATEGORY_COLOR_PALETTE,
  createCategoryColorMap,
  createMonthlyCategoryChartData,
  formatEuroAmount,
  getLocalDateString,
  type CategoryPieDatum,
  type CategorySpendingTransaction,
  type MonthlyCategoryChartData,
  getMonthlyCategorySpendingTotals,
  groupTransactionsByMonth,
} from '../utils/category-spending';

const { data: transactions, error, pending } = useFetch<CategorySpendingTransaction[]>('/api/transactions');
const today = getLocalDateString(new Date());
const hideUncategorised = ref(false);

const monthlyCharts = computed(() =>
  createMonthlyCategoryChartData(
    getMonthlyCategorySpendingTotals(groupTransactionsByMonth(transactions.value ?? [], today)),
  ),
);

const categoryColorMap = computed(() => createCategoryColorMap(
  monthlyCharts.value.flatMap(({ totals }) => totals.map(({ key }) => key)),
));

const displayedMonthlyCharts = computed(() => monthlyCharts.value.map((month) => ({
  ...month,
  totals: hideUncategorised.value
    ? month.totals.filter(({ key }) => key !== 'uncategorised')
    : month.totals,
  pieData: hideUncategorised.value
    ? month.pieData.filter(({ key }) => key !== 'uncategorised')
    : month.pieData,
})));

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

function chartOption(month: MonthlyCategoryChartData): EChartsOption {
  return {
    tooltip: {
      trigger: 'item',
      formatter: tooltipLabel,
    },
    legend: { show: false },
    series: [{
      type: 'pie',
      radius: '68%',
      data: month.pieData.map((datum) => {
        const color = categoryColor(datum.key);
        return {
          ...datum,
          itemStyle: { color },
          emphasis: { itemStyle: { color } },
        };
      }),
      label: { show: false },
    }],
  };
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-slate-900">Category spending</h1>
    <p class="mt-2 text-sm text-slate-600">
      Absolute transaction totals by category for each of the last 12 months.
    </p>

    <p v-if="error" class="mt-4 text-slate-600">
      Monthly category totals could not be loaded.
    </p>
    <p v-else-if="pending" class="mt-4 text-slate-600">Loading monthly category totals…</p>
    <template v-else-if="transactions">
      <label class="mt-4 inline-flex items-center gap-2 text-sm text-slate-700">
        <input
          v-model="hideUncategorised"
          type="checkbox"
          data-testid="hide-uncategorised"
          class="h-4 w-4 rounded border-slate-300 text-slate-700 focus:ring-slate-500"
        >
        Hide uncategorised
      </label>

      <div class="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3" data-testid="monthly-charts">
        <section
          v-for="month in displayedMonthlyCharts"
          :key="month.key"
          class="rounded-md border border-slate-200 bg-white p-4"
          data-testid="month-panel"
          :data-month-key="month.key"
        >
          <h2 class="text-lg font-semibold text-slate-900">{{ month.label }}</h2>
          <figure class="mt-3">
            <figcaption class="sr-only">Pie chart of absolute transaction totals for {{ month.label }}</figcaption>
            <ClientOnly>
              <CategoryPieChart :option="chartOption(month)" />
            </ClientOnly>
          </figure>

          <p v-if="month.totals.length === 0" class="mt-2 text-sm text-slate-600">
            No category data for {{ month.label }}.
          </p>
          <ul v-else aria-label="Category totals" class="mt-2 grid gap-2 text-sm">
            <li
              v-for="total in month.totals"
              :key="total.key"
              class="flex items-center justify-between gap-4"
              data-testid="category-total"
            >
              <span class="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  class="h-3 w-3 shrink-0 rounded-full"
                  data-testid="category-color"
                  :style="{ backgroundColor: categoryColor(total.key) }"
                />
                <span class="text-slate-700">{{ total.name }}</span>
              </span>
              <span class="tabular-nums font-medium text-slate-900">{{ formatEuroAmount(total.amount) }}</span>
            </li>
          </ul>
        </section>
      </div>
    </template>
  </div>
</template>
