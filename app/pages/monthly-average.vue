<script setup lang="ts">
import {
  compareDecimalStrings,
  filterTransactionsByExpenseType,
  filterTransactionsByPerson,
  formatEuroAmount,
  getCategoryMonthlyAverages,
  getLocalDateString,
  getPersonChoices,
  resolvePersonChoice,
  type CategorySpendingTransaction,
  type CategoryMonthlyAverage,
  type ExpenseTypeChoice,
} from '../utils/category-spending';

const { data: transactions, error, pending } = useFetch<CategorySpendingTransaction[]>('/api/transactions');
const router = useRouter();
const route = router.currentRoute;
const today = getLocalDateString(new Date());

const monthCount = ref('12');
const appliedMonthCount = ref(12);
const sortColumn = ref<'amount' | 'category'>('amount');
const sortDirection = ref<'asc' | 'desc'>('desc');
const expenseType = ref<ExpenseTypeChoice>('all');

// The person choices come from the returned transactions. The selection is
// URL-backed and independent of the window and the expense type; an absent or
// unknown person means all people.
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

function onMonthCountInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  monthCount.value = value;

  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed > 0) {
    appliedMonthCount.value = parsed;
  }
}

// The person and expense-type choices are selections over the already-fetched
// transactions and are independent of the averaging window: changing any of them
// recomputes the list from the same data, without another request.
const personTransactions = computed(() =>
  filterTransactionsByPerson(transactions.value ?? [], selectedPerson.value),
);

const selectedTransactions = computed(() =>
  filterTransactionsByExpenseType(personTransactions.value, expenseType.value),
);

const averages = computed(() => getCategoryMonthlyAverages(
  selectedTransactions.value,
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
    <h1 class="font-display text-2xl font-extrabold text-ink sm:text-3xl">Monthly average</h1>
    <p class="mt-2 max-w-2xl text-sm text-muted">
      Average absolute transaction spend per category over a recent window of calendar months.
    </p>

    <p v-if="error" class="mt-4 text-muted">
      Monthly category averages could not be loaded.
    </p>
    <p v-else-if="pending" class="mt-4 text-muted">Loading monthly category averages…</p>
    <template v-else-if="transactions">
      <label class="mt-4 inline-flex min-h-11 flex-wrap items-center gap-2 text-sm text-muted">
        Months to average
        <input
          :value="monthCount"
          type="number"
          min="1"
          step="1"
          data-testid="month-count-input"
          class="min-h-11 w-24 rounded-sheet border border-rule-strong px-2 py-1 text-ink focus:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          @input="onMonthCountInput"
        >
      </label>

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

      <p class="mt-2 text-sm text-muted" data-testid="applied-window">
        Averaging over the last {{ appliedMonthCount }} months.
      </p>

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

      <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
        <label class="inline-flex min-h-11 flex-wrap items-center gap-2 text-sm text-muted">
          Sort by
          <select
            v-model="sortColumn"
            data-testid="monthly-average-sort-column"
            class="min-h-11 max-w-full rounded-sheet border border-rule-strong px-2 py-1 text-ink focus:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <option value="amount">Average amount</option>
            <option value="category">Category</option>
          </select>
        </label>
        <label class="inline-flex min-h-11 flex-wrap items-center gap-2 text-sm text-muted">
          Order
          <select
            v-model="sortDirection"
            data-testid="monthly-average-sort-direction"
            class="min-h-11 max-w-full rounded-sheet border border-rule-strong px-2 py-1 text-ink focus:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </label>
      </div>

      <ul
        v-if="sortedAverages.length > 0"
        class="mt-6 max-w-xl divide-y divide-rule rounded-sheet border border-rule-strong bg-surface shadow-sheet"
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
          <span class="min-w-0 max-w-full break-words text-muted">{{ average.name }}</span>
          <span class="max-w-full break-words tabular-nums font-medium text-ink sm:shrink-0" data-testid="category-average-amount">
            {{ formatEuroAmount(average.amount) }}
          </span>
        </li>
      </ul>

      <p v-else class="mt-4 text-sm text-muted" data-testid="no-data">
        No category data for these months.
      </p>
    </template>
  </div>
</template>
