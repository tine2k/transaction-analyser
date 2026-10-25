<script setup lang="ts">
import {
  createMonthlyCategoryMatrixData,
  filterTransactionsByExpenseType,
  filterTransactionsByPerson,
  formatEuroAmount,
  getPersonChoices,
  groupTransactionsByAvailableMonth,
  isZeroAmountString,
  resolvePersonChoice,
  type CategorySpendingTransaction,
  type ExpenseTypeChoice,
} from '../utils/category-spending';

const { data: transactions, error, pending } = useFetch<CategorySpendingTransaction[]>('/api/transactions');
const router = useRouter();
const route = router.currentRoute;
const expenseType = ref<ExpenseTypeChoice>('all');

// The person choices come from the returned transactions. The selection is
// URL-backed and independent of the expense type; an absent or unknown person
// means all people.
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

// The person selection scopes the already-fetched transactions before the
// expense-type choice, so the table is rebuilt from them and no request is made.
const personTransactions = computed(() =>
  filterTransactionsByPerson(transactions.value ?? [], selectedPerson.value),
);

const selectedTransactions = computed(() =>
  filterTransactionsByExpenseType(personTransactions.value, expenseType.value),
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
    query: {
      month,
      category: categoryFilterValue(categoryKey),
      ...(selectedPerson.value === null ? {} : { person: selectedPerson.value }),
    },
  };
}
</script>

<template>
  <div>
    <h1 class="font-display text-2xl font-extrabold text-ink sm:text-3xl">Monthly totals</h1>
    <p class="mt-2 max-w-2xl text-sm text-muted">
      Absolute transaction totals by category for every month with transaction data.
    </p>

    <p v-if="error" class="mt-4 text-muted">
      Monthly category totals could not be loaded.
    </p>
    <p v-else-if="pending" class="mt-4 text-muted">Loading monthly category totals…</p>
    <template v-else-if="transactions">
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

      <label class="mt-4 inline-flex min-h-11 flex-wrap items-center gap-2 text-sm text-muted">
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

      <p id="monthly-totals-scroll-help" class="mb-2 mt-6 text-xs text-muted sm:hidden">
        Scroll horizontally to view all category columns.
      </p>
      <div
        role="region"
        aria-label="Monthly category totals table"
        aria-describedby="monthly-totals-scroll-help"
        tabindex="0"
        class="max-w-full overflow-x-auto rounded-sheet border border-rule-strong bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        data-testid="monthly-totals-scroll"
      >
        <table class="w-max min-w-full border-collapse text-left text-sm" data-testid="monthly-totals-table">
          <caption class="sr-only">
            Absolute transaction totals by category for every calendar month with transaction data
          </caption>
          <thead>
            <tr class="border-b border-rule-strong">
              <th scope="col" class="px-3 py-2 font-semibold text-ink">Month</th>
              <th
                v-for="category in matrix.categories"
                :key="category.key"
                scope="col"
                class="whitespace-nowrap px-3 py-2 font-semibold text-ink"
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
              class="border-b border-rule"
              data-testid="month-row"
              :data-month-key="month.key"
            >
              <th scope="row" class="whitespace-nowrap px-3 py-2 font-medium text-ink">
                {{ month.label }}
              </th>
              <td
                v-for="category in matrix.categories"
                :key="category.key"
                class="whitespace-nowrap text-right tabular-nums text-ink"
                :class="hasAmount(month.totals.get(category.key)) ? 'p-0' : 'px-3 py-2'"
                data-testid="category-total-cell"
                :data-category-key="category.key"
                :data-month-key="month.key"
              >
                <NuxtLink
                  v-if="hasAmount(month.totals.get(category.key))"
                  :to="transactionLocation(month.key, category.key)"
                  class="block px-3 py-2 transition-colors hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink"
                  data-testid="category-total-link"
                >
                  {{ displayTotal(month.totals.get(category.key)) }}
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="matrix.categories.length === 0" class="mt-4 text-sm text-muted">
        No category data for these months.
      </p>
    </template>
  </div>
</template>
