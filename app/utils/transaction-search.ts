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

export function matchesTransactionSearch(
  transaction: SearchableTransaction,
  query: string,
): boolean {
  const terms = searchTerms(query);
  if (terms.length === 0) {
    return true;
  }
  const text = transactionSearchText(transaction);
  return terms.every((term) => text.includes(term));
}
