import { describe, expect, it } from 'vitest';
import {
  createTransactionSearchIndex,
  matchesTransactionSearch,
  matchesTransactionSearchTerms,
  normalizeSearchText,
  searchTerms,
  transactionSearchText,
} from '../../app/utils/transaction-search';

const transaction = {
  purpose: 'Card payment Market',
  counterpartyName: 'Müller GmbH',
  counterpartyAccount: 'AT61 1904 3002 3457 3201',
};

describe('transaction search normalization', () => {
  it('lower-cases and strips combining marks', () => {
    expect(normalizeSearchText('Müller')).toBe('muller');
    expect(normalizeSearchText('CAFÉ')).toBe('cafe');
  });

  it('splits a query into non-empty terms', () => {
    expect(searchTerms('  Card   Market ')).toEqual(['card', 'market']);
    expect(searchTerms('   ')).toEqual([]);
  });

  it('joins the descriptive fields with diacritics removed', () => {
    expect(transactionSearchText(transaction))
      .toBe('card payment market muller gmbh at61 1904 3002 3457 3201');
    expect(transactionSearchText({ ...transaction, counterpartyAccount: null }))
      .toBe('card payment market muller gmbh');
  });
});

describe('transaction search matching', () => {
  it('matches purpose, counterparty name, and account', () => {
    expect(matchesTransactionSearch(transaction, 'payment')).toBe(true);
    expect(matchesTransactionSearch(transaction, 'muller')).toBe(true);
    expect(matchesTransactionSearch(transaction, '3457')).toBe(true);
  });

  it('ignores letter case and diacritics', () => {
    expect(matchesTransactionSearch(transaction, 'MARKET')).toBe(true);
    expect(matchesTransactionSearch(transaction, 'MÜLLER')).toBe(true);
  });

  it('requires every term to match the combined text', () => {
    expect(matchesTransactionSearch(transaction, 'market muller')).toBe(true);
    expect(matchesTransactionSearch(transaction, 'market rail')).toBe(false);
  });

  it('treats a blank query as no restriction', () => {
    expect(matchesTransactionSearch(transaction, '')).toBe(true);
    expect(matchesTransactionSearch(transaction, '   ')).toBe(true);
  });

  it('rejects text that occurs in no descriptive field', () => {
    expect(matchesTransactionSearch(transaction, 'salary')).toBe(false);
  });
});

describe('transaction search index', () => {
  it('maps each transaction identity to its normalised descriptive text', () => {
    const index = createTransactionSearchIndex([
      { id: 'a', ...transaction },
      { id: 'b', purpose: 'February travel', counterpartyName: 'Rail', counterpartyAccount: null },
    ]);

    expect(index.get('a')).toBe('card payment market muller gmbh at61 1904 3002 3457 3201');
    expect(index.get('b')).toBe('february travel rail');
    expect(index.size).toBe(2);
  });

  it('matches already-normalised terms against indexed text', () => {
    const index = createTransactionSearchIndex([{ id: 'a', ...transaction }]);
    const text = index.get('a') ?? '';
    const terms = searchTerms('MÜLLER payment');

    expect(matchesTransactionSearchTerms(text, terms)).toBe(true);
    expect(matchesTransactionSearchTerms(text, searchTerms('market rail'))).toBe(false);
    expect(matchesTransactionSearchTerms(text, [])).toBe(true);
  });
});
