<script setup lang="ts">
import {
  createMonthlyCategoryMatrixData,
  formatEuroAmount,
  groupTransactionsByAvailableMonth,
  isZeroAmountString,
  type CategorySpendingTransaction,
} from '../utils/category-spending';

const { data: transactions, error, pending } = useFetch<CategorySpendingTransaction[]>('/api/transactions');

const matrix = computed(() => createMonthlyCategoryMatrixData(
  groupTransactionsByAvailableMonth(transactions.value ?? []),
));

function displayTotal(amount: string | undefined): string {
  return amount === undefined || isZeroAmountString(amount) ? '' : formatEuroAmount(amount);
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-slate-900">Monthly totals</h1>
    <p class="mt-2 text-sm text-slate-600">
      Absolute transaction totals by category for every month with transaction data.
    </p>

    <p v-if="error" class="mt-4 text-slate-600">
      Monthly category totals could not be loaded.
    </p>
    <p v-else-if="pending" class="mt-4 text-slate-600">Loading monthly category totals…</p>
    <template v-else-if="transactions">
      <div class="mt-6 overflow-x-auto" data-testid="monthly-totals-scroll">
        <table class="min-w-full border-collapse text-left text-sm" data-testid="monthly-totals-table">
          <caption class="sr-only">
            Absolute transaction totals by category for every calendar month with transaction data
          </caption>
          <thead>
            <tr class="border-b border-slate-300">
              <th scope="col" class="px-3 py-2 font-semibold text-slate-900">Month</th>
              <th
                v-for="category in matrix.categories"
                :key="category.key"
                scope="col"
                class="whitespace-nowrap px-3 py-2 font-semibold text-slate-900"
                data-testid="category-heading"
                :data-category-key="category.key"
              >
                {{ category.name }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="month in matrix.months"
              :key="month.key"
              class="border-b border-slate-100 odd:bg-white even:bg-slate-50"
              data-testid="month-row"
              :data-month-key="month.key"
            >
              <th scope="row" class="whitespace-nowrap px-3 py-2 font-medium text-slate-700">
                {{ month.label }}
              </th>
              <td
                v-for="category in matrix.categories"
                :key="category.key"
                class="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-900"
                data-testid="category-total-cell"
                :data-category-key="category.key"
                :data-month-key="month.key"
              >
                {{ displayTotal(month.totals.get(category.key)) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="matrix.categories.length === 0" class="mt-4 text-sm text-slate-600">
        No category data for these months.
      </p>
    </template>
  </div>
</template>
