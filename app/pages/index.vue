<script setup lang="ts">
import { formatEuroAmount, sumSignedAmountStrings } from '../utils/category-spending';

// The index route reads stored transactions from the read-only GET
// /api/transactions endpoint. Category and booking-month filters are derived
// from that response and represented in the route query. The values are
// presented exactly as returned: amounts remain signed decimal strings, and
// dates remain day-precise strings.
//
// `useFetch` is not awaited: the page is rendered in the browser, so the read
// runs on the client and the template's pending state shows while it is in
// flight.
//
// See openspec/changes/add-transactions-table/specs/transaction-table/spec.md
// and openspec/changes/disable-server-side-rendering/specs/frontend-shell/spec.md
type Category = { id: string; name: string };

type Transaction = {
  id: string;
  bookingDate: string;
  valueDate: string;
  amount: string;
  purpose: string;
  counterpartyName: string;
  counterpartyAccount: string | null;
  category: Category | null;
};

const { data: transactions, error, pending } = useFetch<Transaction[]>('/api/transactions');
const router = useRouter();
const route = router.currentRoute;

function queryString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function isMonthKey(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function monthLabel(key: string): string {
  return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${key}-01T00:00:00Z`));
}

const categories = computed(() => {
  const byId = new Map<string, Category>();
  for (const transaction of transactions.value ?? []) {
    if (transaction.category !== null) {
      byId.set(transaction.category.id, transaction.category);
    }
  }
  return [...byId.values()].sort((left, right) =>
    left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
    || left.id.localeCompare(right.id, undefined, { numeric: true }),
  );
});

const months = computed(() => {
  const keys = new Set((transactions.value ?? [])
    .map(({ bookingDate }) => bookingDate.slice(0, 7))
    .filter(isMonthKey));
  const today = getLocalDateString(new Date());
  for (const month of getLastTwelveCalendarMonths(today)) {
    keys.add(month.key);
  }
  return [...keys]
    .sort((left, right) => right.localeCompare(left))
    .map((key) => ({ key, label: monthLabel(key) }));
});

function categoryFromQuery(): string {
  const requested = queryString(route.value.query.category);
  if (requested === 'all' || requested === 'uncategorised') {
    return requested;
  }
  return requested !== undefined && categories.value.some(({ id }) => id === requested)
    ? requested
    : 'uncategorised';
}

function monthFromQuery(): string {
  const requested = queryString(route.value.query.month);
  return requested !== undefined
    && isMonthKey(requested)
    && months.value.some(({ key }) => key === requested)
    ? requested
    : 'all';
}

const selectedCategory = ref('uncategorised');
const selectedMonth = ref('all');

const categoryFilter = computed({
  get: () => selectedCategory.value,
  set(value: string) {
    selectedCategory.value = value;
    setFilterQuery('category', value);
  },
});

const monthFilter = computed({
  get: () => selectedMonth.value,
  set(value: string) {
    selectedMonth.value = value;
    setFilterQuery('month', value);
  },
});

function setFilterQuery(key: 'category' | 'month', value: string): void {
  const query = { ...route.value.query };
  if (key === 'month' && value === 'all') {
    delete query.month;
  } else {
    query[key] = value;
  }
  void router.replace({ path: '/', query });
}

watch(
  () => [route.value.query.category, route.value.query.month, categories.value, months.value],
  () => {
    selectedCategory.value = categoryFromQuery();
    selectedMonth.value = monthFromQuery();
  },
  { immediate: true },
);

const uncategorisedTransactions = computed(() =>
  (transactions.value ?? []).filter((transaction) => transaction.category === null),
);

const visibleTransactions = computed(() =>
  (transactions.value ?? []).filter((transaction) => {
    const categoryMatches = categoryFilter.value === 'all'
      || (categoryFilter.value === 'uncategorised'
        ? transaction.category === null
        : transaction.category?.id === categoryFilter.value);
    const monthMatches = monthFilter.value === 'all'
      || transaction.bookingDate.slice(0, 7) === monthFilter.value;
    return categoryMatches && monthMatches;
  }),
);

const visibleTotal = computed(() =>
  sumSignedAmountStrings(visibleTransactions.value.map(({ amount }) => amount)),
);
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-slate-900">Transactions</h1>

    <p v-if="error" class="mt-4 text-slate-600">
      The transactions could not be loaded. They are not shown, and this is not an empty result.
    </p>

    <p v-else-if="pending" class="mt-4 text-slate-600">Loading transactions…</p>

    <template v-else-if="transactions">
      <div class="mt-6 flex flex-wrap gap-4">
        <label class="grid gap-1 text-sm font-medium text-slate-700">
          Category
          <select
            v-model="categoryFilter"
            data-testid="category-filter"
            class="rounded-md border border-slate-300 bg-white px-3 py-2"
          >
            <option value="all">All categories ({{ transactions.length }})</option>
            <option value="uncategorised">Uncategorised ({{ uncategorisedTransactions.length }})</option>
            <option v-for="category in categories" :key="category.id" :value="category.id">
              {{ category.name }}
            </option>
          </select>
        </label>
        <label class="grid gap-1 text-sm font-medium text-slate-700">
          Month
          <select
            v-model="monthFilter"
            data-testid="month-filter"
            class="rounded-md border border-slate-300 bg-white px-3 py-2"
          >
            <option value="all">All months</option>
            <option v-for="month in months" :key="month.key" :value="month.key">
              {{ month.label }}
            </option>
          </select>
        </label>
      </div>

      <p class="mt-4 text-sm font-semibold text-slate-900" data-testid="visible-total">
        Sum of displayed transactions: <span class="tabular-nums">{{ formatEuroAmount(visibleTotal) }}</span>
      </p>

      <p v-if="transactions.length === 0" class="mt-4 text-slate-600">
        There are no transactions to show.
      </p>

      <p v-else-if="visibleTransactions.length === 0" class="mt-4 text-slate-600">
        There are no transactions matching the selected filters.
      </p>

      <div v-else class="mt-4 overflow-x-auto">
        <table class="w-full border-collapse text-left text-sm">
          <thead>
            <tr class="border-b border-slate-200">
              <th scope="col" class="px-3 py-2 font-semibold text-slate-700">Booking date</th>
              <th scope="col" class="px-3 py-2 font-semibold text-slate-700">Value date</th>
              <th scope="col" class="px-3 py-2 text-right font-semibold text-slate-700">Amount</th>
              <th scope="col" class="px-3 py-2 font-semibold text-slate-700">Purpose</th>
              <th scope="col" class="px-3 py-2 font-semibold text-slate-700">Counterparty</th>
              <th scope="col" class="px-3 py-2 font-semibold text-slate-700">Account</th>
              <th scope="col" class="px-3 py-2 font-semibold text-slate-700">Category</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="transaction in visibleTransactions"
              :key="transaction.id"
              :data-transaction-id="transaction.id"
              class="border-b border-slate-100"
            >
              <td class="px-3 py-2 whitespace-nowrap text-slate-900">
                <time :datetime="transaction.bookingDate">{{ transaction.bookingDate }}</time>
              </td>
              <td class="px-3 py-2 whitespace-nowrap text-slate-900">
                <time :datetime="transaction.valueDate">{{ transaction.valueDate }}</time>
              </td>
              <td class="px-3 py-2 text-right tabular-nums text-slate-900">{{ transaction.amount }}</td>
              <td class="px-3 py-2 text-slate-900">{{ transaction.purpose }}</td>
              <td class="px-3 py-2 text-slate-900">{{ transaction.counterpartyName }}</td>
              <td class="px-3 py-2 text-slate-900">
                <template v-if="transaction.counterpartyAccount !== null">
                  {{ transaction.counterpartyAccount }}
                </template>
                <template v-else>
                  <span aria-hidden="true" class="text-slate-400">—</span>
                  <span class="sr-only">No counterparty account</span>
                </template>
              </td>
              <td class="px-3 py-2 text-slate-900">
                <template v-if="transaction.category !== null">
                  {{ transaction.category.name }}
                </template>
                <template v-else>
                  <span aria-hidden="true" class="text-slate-400">—</span>
                  <span class="sr-only">Uncategorised</span>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
