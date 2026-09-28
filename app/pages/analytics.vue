<script setup lang="ts">
import type { EChartsOption } from 'echarts';
import {
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

const monthlyCharts = computed(() =>
  createMonthlyCategoryChartData(
    getMonthlyCategorySpendingTotals(groupTransactionsByMonth(transactions.value ?? [], today)),
  ),
);

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
      data: month.pieData,
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
      <div class="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3" data-testid="monthly-charts">
        <section
          v-for="month in monthlyCharts"
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
              <span class="text-slate-700">{{ total.name }}</span>
              <span class="tabular-nums font-medium text-slate-900">{{ formatEuroAmount(total.amount) }}</span>
            </li>
          </ul>
        </section>
      </div>
    </template>
  </div>
</template>
