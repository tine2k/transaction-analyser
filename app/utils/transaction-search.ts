// Matching for the transactions table's all-transactions search. The search is
// a presentation concern: it reads only the returned descriptive text and never
// requests data or changes anything stored.
//
// Matching compares lower-cased, diacritic-stripped text so `muller` finds
// `Müller`, and joins the three descriptive fields so a term may match across
// them. Every whitespace-separated term must occur somewhere in that joined
// text; an empty query matches every transaction.
export type SearchableTransaction = {
  purpose: string;
  counterpartyName: string;
  counterpartyAccount: string | null;
};

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
}

export function searchTerms(query: string): string[] {
  return normalizeSearchText(query)
    .split(/\s+/)
    .filter((term) => term !== '');
}

export function transactionSearchText(transaction: SearchableTransaction): string {
  return normalizeSearchText([
    transaction.purpose,
    transaction.counterpartyName,
    transaction.counterpartyAccount ?? '',
  ].join(' ').trim());
}

// The index is built once per loaded transaction response, so an applied search
// only parses its query and compares already-normalised text.
export function createTransactionSearchIndex(
  transactions: ReadonlyArray<SearchableTransaction & { id: string }>,
): Map<string, string> {
  const index = new Map<string, string>();
  for (const transaction of transactions) {
    index.set(transaction.id, transactionSearchText(transaction));
  }
  return index;
}

export function matchesTransactionSearchTerms(
  text: string,
  terms: readonly string[],
): boolean {
  return terms.every((term) => text.includes(term));
}

export function matchesTransactionSearch(
  transaction: SearchableTransaction,
  query: string,
): boolean {
  return matchesTransactionSearchTerms(
    transactionSearchText(transaction),
    searchTerms(query),
  );
}
