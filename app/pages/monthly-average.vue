<script setup lang="ts">
import {
  formatEuroAmount,
  getCategoryMonthlyAverages,
  getLocalDateString,
  type CategorySpendingTransaction,
} from '../utils/category-spending';

const { data: transactions, error, pending } = useFetch<CategorySpendingTransaction[]>('/api/transactions');
const today = getLocalDateString(new Date());

const monthCount = ref('12');
const appliedMonthCount = ref(12);

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
      <label class="mt-4 inline-flex items-center gap-2 text-sm text-slate-700">
        Months to average
        <input
          :value="monthCount"
          type="number"
          min="1"
          step="1"
          data-testid="month-count-input"
          class="w-20 rounded border border-slate-300 px-2 py-1 text-slate-900 focus:border-slate-500 focus:outline-none"
          @input="onMonthCountInput"
        >
      </label>

      <p class="mt-2 text-sm text-slate-600" data-testid="applied-window">
        Averaging over the last {{ appliedMonthCount }} months.
      </p>

      <ul
        v-if="averages.length > 0"
        class="mt-6 max-w-xl divide-y divide-slate-100 rounded-md border border-slate-200 bg-white"
        aria-label="Category monthly averages"
        data-testid="monthly-average-list"
      >
        <li
          v-for="average in averages"
          :key="average.key"
          class="flex items-center justify-between gap-4 px-4 py-2 text-sm"
          data-testid="category-average"
          :data-category-key="average.key"
        >
          <span class="text-slate-700">{{ average.name }}</span>
          <span class="tabular-nums font-medium text-slate-900" data-testid="category-average-amount">
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
