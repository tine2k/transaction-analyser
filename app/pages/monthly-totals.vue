<script setup lang="ts">
import {
  createMonthlyCategoryMatrixData,
  filterTransactionsByExpenseType,
  formatEuroAmount,
  groupTransactionsByAvailableMonth,
  isZeroAmountString,
  type CategorySpendingTransaction,
  type ExpenseTypeChoice,
} from '../utils/category-spending';

const { data: transactions, error, pending } = useFetch<CategorySpendingTransaction[]>('/api/transactions');
const expenseType = ref<ExpenseTypeChoice>('all');

// The expense-type choice is a selection over the already-fetched transactions, so
// the table is rebuilt from them and no further request is made.
const selectedTransactions = computed(() =>
  filterTransactionsByExpenseType(transactions.value ?? [], expenseType.value),
);

const matrix = computed(() => createMonthlyCategoryMatrixData(
  groupTransactionsByAvailableMonth(selectedTransactions.value),
));

function hasAmount(amount: string | undefined): amount is string {
  return amount !== undefined && !isZeroAmountString(amount);
}

function displayTotal(amount: string | undefined): string {
  return hasAmount(amount) ? formatEuroAmount(amount) : '';
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
      <fieldset class="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-700" data-testid="expense-type-filter">
        <legend class="sr-only">Expense type filter</legend>
        <label class="inline-flex min-h-11 items-center gap-2">
          <input
            v-model="expenseType"
            type="radio"
            name="expense-type"
            value="all"
            data-testid="expense-type-all"
            class="size-5 min-h-11 border-slate-300 text-slate-700 focus:ring-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
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
            class="size-5 min-h-11 border-slate-300 text-slate-700 focus:ring-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
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
            class="size-5 min-h-11 border-slate-300 text-slate-700 focus:ring-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
          >
          One-time
        </label>
      </fieldset>

      <p id="monthly-totals-scroll-help" class="mb-2 mt-6 text-xs text-slate-500 sm:hidden">
        Scroll horizontally to view all category columns.
      </p>
      <div
        role="region"
        aria-label="Monthly category totals table"
        aria-describedby="monthly-totals-scroll-help"
        tabindex="0"
        class="max-w-full overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
        data-testid="monthly-totals-scroll"
      >
        <table class="w-max min-w-full border-collapse text-left text-sm" data-testid="monthly-totals-table">
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
                class="whitespace-nowrap text-right tabular-nums text-slate-900"
                :class="hasAmount(month.totals.get(category.key)) ? 'p-0' : 'px-3 py-2'"
                data-testid="category-total-cell"
                :data-category-key="category.key"
                :data-month-key="month.key"
              >
                <NuxtLink
                  v-if="hasAmount(month.totals.get(category.key))"
                  :to="transactionLocation(month.key, category.key)"
                  class="block px-3 py-2 transition-colors hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-slate-700"
                  data-testid="category-total-link"
                >
                  {{ displayTotal(month.totals.get(category.key)) }}
                </NuxtLink>
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
