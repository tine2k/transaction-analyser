<script setup lang="ts">
// The index route: every stored transaction, as returned by the read-only
// GET /api/transactions endpoint. This page reads; it never writes, derives,
// filters, or reorders. The values are presented exactly as the endpoint
// returned them: the amount as its signed decimal string, and the dates as
// day-precise strings, so nothing is shifted or rounded on the way to the page.
//
// `await useFetch` runs during server rendering, so the rows are already in the
// delivered document rather than assembled in the browser afterwards.
//
// See openspec/changes/add-transactions-table/specs/transaction-table/spec.md
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

const { data: transactions, error, pending } = await useFetch<Transaction[]>('/api/transactions');
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-slate-900">Transactions</h1>

    <p v-if="error" class="mt-4 text-slate-600">
      The transactions could not be loaded. They are not shown, and this is not an empty result.
    </p>

    <p v-else-if="pending" class="mt-4 text-slate-600">Loading transactions…</p>

    <p v-else-if="!transactions || transactions.length === 0" class="mt-4 text-slate-600">
      There are no transactions to show.
    </p>

    <div v-else class="mt-6 overflow-x-auto">
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
          <tr v-for="transaction in transactions" :key="transaction.id" class="border-b border-slate-100">
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
  </div>
</template>
