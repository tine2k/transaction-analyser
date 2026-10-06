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
const router = useRouter();
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

function transactionLocation(month: string, categoryKey: string) {
  return {
    path: '/',
    query: { month, category: categoryFilterValue(categoryKey) },
  };
}

function onPieSliceClick(parameter: unknown, month: string): void {
  const item = parameter as { data?: { key?: unknown } } | undefined;
  if (typeof item?.data?.key !== 'string') {
    return;
  }
  const key = item.data.key;
  if (key !== 'uncategorised' && !key.startsWith('category:')) {
    return;
  }
  void router.push(transactionLocation(month, key));
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
      minShowLabelAngle: 0,
      labelLayout: { hideOverlap: false },
      data: month.pieData.map((datum) => {
        const color = categoryColor(datum.key);
        return {
          ...datum,
          itemStyle: { color },
          emphasis: { itemStyle: { color } },
        };
      }),
      label: { show: true, formatter: sliceLabel },
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
      <label class="mt-4 inline-flex min-h-11 items-center gap-3 py-2 text-sm text-slate-700">
        <input
          v-model="hideUncategorised"
          type="checkbox"
          data-testid="hide-uncategorised"
          class="size-5 rounded border-slate-300 text-slate-700 focus:ring-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
        >
        Hide uncategorised
      </label>

      <div class="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3" data-testid="monthly-charts">
        <section
          v-for="month in displayedMonthlyCharts"
          :key="month.key"
          class="min-w-0 rounded-md border border-slate-200 bg-white p-4"
          data-testid="month-panel"
          :data-month-key="month.key"
        >
          <h2 class="text-lg font-semibold text-slate-900">
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
              <CategoryPieChart :option="chartOption(month)" @click="onPieSliceClick($event, month.key)" />
            </ClientOnly>
          </figure>

          <p v-if="month.totals.length === 0" class="mt-2 text-sm text-slate-600">
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
                :to="transactionLocation(month.key, total.key)"
                :aria-label="`View ${total.name} transactions for ${month.label}`"
                class="flex min-h-11 w-full min-w-0 items-center justify-between gap-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
                data-testid="category-transaction-link"
              >
                <span class="flex min-w-0 flex-1 items-center gap-2">
                  <span
                    aria-hidden="true"
                    class="h-3 w-3 shrink-0 rounded-full"
                    data-testid="category-color"
                    :style="{ backgroundColor: categoryColor(total.key) }"
                  />
                  <span class="min-w-0 break-words text-slate-700">{{ total.name }}</span>
                </span>
                <span class="max-w-[55%] shrink-0 break-words text-right tabular-nums font-medium text-slate-900">
                  {{ formatEuroAmount(total.amount) }}
                </span>
              </NuxtLink>
            </li>
          </ul>
        </section>
      </div>
    </template>
  </div>
</template>
