<script setup lang="ts">
import {
  compareDecimalStrings,
  formatEuroAmount,
  getCategoryMonthlyAverages,
  getLocalDateString,
  type CategorySpendingTransaction,
  type CategoryMonthlyAverage,
} from '../utils/category-spending';

const { data: transactions, error, pending } = useFetch<CategorySpendingTransaction[]>('/api/transactions');
const today = getLocalDateString(new Date());

const monthCount = ref('12');
const appliedMonthCount = ref(12);
const sortColumn = ref<'amount' | 'category'>('amount');
const sortDirection = ref<'asc' | 'desc'>('desc');

function onMonthCountInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  monthCount.value = value;

  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed > 0) {
    appliedMonthCount.value = parsed;
  }
}

const averages = computed(() => getCategoryMonthlyAverages(
  transactions.value ?? [],
  today,
  appliedMonthCount.value,
));

function compareCategoryOrder(
  left: CategoryMonthlyAverage,
  right: CategoryMonthlyAverage,
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
    const byAmount = compareDecimalStrings(left.amount, right.amount);
    if (byAmount !== 0) {
      return byAmount * (sortDirection.value === 'asc' ? 1 : -1);
    }
    return compareCategoryOrder(left, right);
  }

  return compareCategoryOrder(left, right, sortDirection.value === 'asc' ? 1 : -1);
}));
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-slate-900">Monthly average</h1>
    <p class="mt-2 text-sm text-slate-600">
      Average absolute transaction spend per category over a recent window of calendar months.
    </p>

    <p v-if="error" class="mt-4 text-slate-600">
      Monthly category averages could not be loaded.
    </p>
    <p v-else-if="pending" class="mt-4 text-slate-600">Loading monthly category averages…</p>
    <template v-else-if="transactions">
      <label class="mt-4 inline-flex min-h-11 flex-wrap items-center gap-2 text-sm text-slate-700">
        Months to average
        <input
          :value="monthCount"
          type="number"
          min="1"
          step="1"
          data-testid="month-count-input"
          class="min-h-11 w-24 rounded border border-slate-300 px-2 py-1 text-slate-900 focus:border-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
          @input="onMonthCountInput"
        >
      </label>

      <p class="mt-2 text-sm text-slate-600" data-testid="applied-window">
        Averaging over the last {{ appliedMonthCount }} months.
      </p>

      <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
        <label class="inline-flex min-h-11 flex-wrap items-center gap-2 text-sm text-slate-700">
          Sort by
          <select
            v-model="sortColumn"
            data-testid="monthly-average-sort-column"
            class="min-h-11 max-w-full rounded border border-slate-300 px-2 py-1 text-slate-900 focus:border-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
          >
            <option value="amount">Average amount</option>
            <option value="category">Category</option>
          </select>
        </label>
        <label class="inline-flex min-h-11 flex-wrap items-center gap-2 text-sm text-slate-700">
          Order
          <select
            v-model="sortDirection"
            data-testid="monthly-average-sort-direction"
            class="min-h-11 max-w-full rounded border border-slate-300 px-2 py-1 text-slate-900 focus:border-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </label>
      </div>

      <ul
        v-if="sortedAverages.length > 0"
        class="mt-6 max-w-xl divide-y divide-slate-100 rounded-md border border-slate-200 bg-white"
        aria-label="Category monthly averages"
        data-testid="monthly-average-list"
      >
        <li
          v-for="average in sortedAverages"
          :key="average.key"
          class="flex flex-col items-start gap-1 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          data-testid="category-average"
          :data-category-key="average.key"
        >
          <span class="min-w-0 max-w-full break-words text-slate-700">{{ average.name }}</span>
          <span class="max-w-full break-words tabular-nums font-medium text-slate-900 sm:shrink-0" data-testid="category-average-amount">
            {{ formatEuroAmount(average.amount) }}
          </span>
        </li>
      </ul>

      <p v-else class="mt-4 text-sm text-slate-600" data-testid="no-data">
        No category data for these months.
      </p>
    </template>
  </div>
</template>
