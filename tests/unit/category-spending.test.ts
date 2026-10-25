import { describe, expect, it } from 'vitest';
import {
  CATEGORY_COLOR_PALETTE,
  averageDecimalString,
  createCategoryColorMap,
  createMonthlyCategoryMatrixData,
  createYearlyCategoryMatrixData,
  filterTransactionsByExpenseType,
  filterTransactionsByMonth,
  filterTransactionsByPerson,
  formatEuroAmount,
  getAvailableYears,
  getCalendarYearMonths,
  getCategoryBreakdown,
  getCategoryMonthlyAverages,
  getCategorySharePercent,
  getElapsedMonthsInYear,
  getLastCalendarMonths,
  getPersonChoices,
  getYearlyCellTintPercent,
  getYearlyYearOptions,
  groupTransactionsByAvailableMonth,
  isZeroAmountString,
  resolvePersonChoice,
  resolveSelectedMonth,
  resolveSelectedYear,
  sumAbsoluteAmountStrings,
  sumSignedAmountStrings,
  type CategorySpendingTransaction,
} from '../../app/utils/category-spending';

describe('decimal-safe category totals', () => {
  it('sums positive and negative decimal strings by absolute value without losing scale', () => {
    expect(sumAbsoluteAmountStrings(['-12.50', '4.00'])).toBe('16.50');
    expect(sumAbsoluteAmountStrings(['1.2', '1.20'])).toBe('2.40');
  });

  it('preserves precision beyond JavaScript number accuracy', () => {
    expect(sumAbsoluteAmountStrings(['9007199254740993.01', '0.01', '-0.002']))
      .toBe('9007199254740993.022');
    expect(sumAbsoluteAmountStrings([])).toBe('0');
  });

  it('recognizes exact zero decimal strings without floating-point conversion', () => {
    expect(isZeroAmountString('0')).toBe(true);
    expect(isZeroAmountString('-0.000')).toBe(true);
    expect(isZeroAmountString('0.001')).toBe(false);
    expect(isZeroAmountString('9007199254740993.01')).toBe(false);
  });

  it('sorts category totals numerically in descending order with name-based ties', () => {
    const transactions: CategorySpendingTransaction[] = [
      { bookingDate: '2026-09-01', amount: '2.000', person: { id: '1', name: 'Default' }, category: { id: '1', name: 'Two', hidden: false, expenseType: null } },
      { bookingDate: '2026-09-01', amount: '9007199254740993.02', person: { id: '1', name: 'Default' }, category: { id: '2', name: 'Large lower', hidden: false, expenseType: null } },
      { bookingDate: '2026-09-01', amount: '5.0', person: { id: '1', name: 'Default' }, category: { id: '3', name: 'Zulu', hidden: false, expenseType: null } },
      { bookingDate: '2026-09-01', amount: '9007199254740993.1', person: { id: '1', name: 'Default' }, category: { id: '4', name: 'Largest', hidden: false, expenseType: null } },
      { bookingDate: '2026-09-01', amount: '5.00', person: { id: '1', name: 'Default' }, category: { id: '5', name: 'Alpha', hidden: false, expenseType: null } },
      { bookingDate: '2026-09-01', amount: '10.00', person: { id: '1', name: 'Default' }, category: { id: '6', name: 'Ten', hidden: false, expenseType: null } },
    ];
    const breakdown = getCategoryBreakdown(transactions);

    expect(breakdown.entries.map(({ name, amount }) => [name, amount])).toEqual([
      ['Largest', '9007199254740993.1'],
      ['Large lower', '9007199254740993.02'],
      ['Ten', '10.00'],
      ['Alpha', '5.00'],
      ['Zulu', '5.0'],
      ['Two', '2.000'],
    ]);
  });

  it('produces exact category totals and euro labels', () => {
    const transactions: CategorySpendingTransaction[] = [
      { bookingDate: '2026-09-01', amount: '-12.50', person: { id: '1', name: 'Default' }, category: { id: '1', name: 'Groceries', hidden: false, expenseType: null } },
      { bookingDate: '2026-09-02', amount: '4.00', person: { id: '1', name: 'Default' }, category: { id: '1', name: 'Groceries', hidden: false, expenseType: null } },
    ];
    const [total] = getCategoryBreakdown(transactions).entries;

    expect(total?.amount).toBe('16.50');
    expect(formatEuroAmount(total?.amount ?? '', 'en-US')).toBe('€\u00A016.50');
  });

  it('separates a leading euro symbol from the digits with a non-breaking space', () => {
    expect(formatEuroAmount('1234.50', 'en-US')).toBe('€\u00A01,234.50');
    expect(formatEuroAmount('-0.01', 'en-US')).toBe('-€\u00A00.01');
    expect(formatEuroAmount('0', 'en-US')).toBe('€\u00A00');
    expect(formatEuroAmount('1234.50', 'nl-NL')).toBe('€\u00A01.234,50');
    expect(formatEuroAmount('1234.50', 'de-DE')).toBe('1.234,50\u00A0€');
  });

  it('uses locale grouping and currency placement without rounding large exact amounts', () => {
    const locale = 'de-DE';

    expect(formatEuroAmount('1234567.89', locale)).toBe(new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(1234567.89));
    expect(formatEuroAmount('9007199254740993.022', locale)).toBe('9.007.199.254.740.993,022 €');
    expect(formatEuroAmount('-0.01', locale)).toBe(new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(-0.01));
  });

  it('formats a signed decimal-safe sum without losing its sign or precision', () => {
    const locale = 'de-DE';
    const sum = sumSignedAmountStrings(['-9007199254740993.02', '-0.002']);

    expect(sum).toBe('-9007199254740993.022');
    expect(formatEuroAmount(sum, locale)).toBe('-9.007.199.254.740.993,022\u00a0€');
  });
});

describe('decimal-safe signed transaction totals', () => {
  it('adds incoming and outgoing amounts while preserving exact scale', () => {
    expect(sumSignedAmountStrings(['-12.50', '4.00'])).toBe('-8.50');
    expect(sumSignedAmountStrings(['1.2', '1.20'])).toBe('2.40');
    expect(sumSignedAmountStrings(['0.01', '-0.02'])).toBe('-0.01');
  });

  it('preserves precision beyond JavaScript number accuracy and returns zero for no amounts', () => {
    expect(sumSignedAmountStrings(['9007199254740993.01', '0.01', '-0.002']))
      .toBe('9007199254740993.018');
    expect(sumSignedAmountStrings([])).toBe('0');
    expect(sumSignedAmountStrings(['-0.00'])).toBe('0.00');
  });
});

describe('stable category colors', () => {
  it('assigns distinct palette colors by sorted identity regardless of input order', () => {
    const keys = ['category:1', 'category:2', 'uncategorised'];
    const colorsInOrder = createCategoryColorMap(keys);
    const colorsInReverseOrder = createCategoryColorMap([...keys].reverse());

    expect(colorsInReverseOrder).toEqual(colorsInOrder);
    expect(new Set(colorsInOrder.values()).size).toBe(keys.length);
    expect([...colorsInOrder.values()]).toEqual(CATEGORY_COLOR_PALETTE.slice(0, keys.length));
  });
});

describe('available-month transaction buckets', () => {
  it('creates a configurable window of months from the current partial month backwards', () => {
    const months = getLastCalendarMonths('2026-09-28', 3);

    expect(months.map(({ key }) => key)).toEqual(['2026-09', '2026-08', '2026-07']);
    expect(months[0]).toMatchObject({
      label: 'September 2026',
      startDate: '2026-09-01',
      endDate: '2026-09-28',
    });
    expect(months[2]).toMatchObject({
      label: 'July 2026',
      startDate: '2026-07-01',
      endDate: '2026-07-31',
    });
  });

  it('groups every represented booking month newest-first without adding empty months', () => {
    const months = groupTransactionsByAvailableMonth([
      { bookingDate: '2020-01-31', amount: '-1.00', person: { id: '1', name: 'Default' }, category: { id: '1', name: 'Old', hidden: false, expenseType: null } },
      { bookingDate: '2026-08-03', amount: '-2.00', person: { id: '1', name: 'Default' }, category: { id: '2', name: 'Recent', hidden: false, expenseType: null } },
      { bookingDate: '2026-08-29', amount: '3.00', person: { id: '1', name: 'Default' }, category: { id: '2', name: 'Recent', hidden: false, expenseType: null } },
      { bookingDate: '2026-09-02', amount: '-4.00', person: { id: '1', name: 'Default' }, category: null },
    ]);

    expect(months.map(({ key, label }) => [key, label])).toEqual([
      ['2026-09', 'September 2026'],
      ['2026-08', 'August 2026'],
      ['2020-01', 'January 2020'],
    ]);
    expect(months[1]?.groups[0]?.transactions).toHaveLength(2);
    expect(months[2]?.groups[0]?.name).toBe('Old');
  });

  it('drops hidden-category transactions from the available-month matrix while keeping visible ones', () => {
    const matrix = createMonthlyCategoryMatrixData(groupTransactionsByAvailableMonth([
      { bookingDate: '2026-09-01', amount: '-7.00', person: { id: '1', name: 'Default' }, category: { id: '1', name: 'Groceries', hidden: false, expenseType: null } },
      { bookingDate: '2026-09-02', amount: '-9.00', person: { id: '1', name: 'Default' }, category: { id: '2', name: 'Internal', hidden: true, expenseType: null } },
      { bookingDate: '2026-08-01', amount: '-5.00', person: { id: '1', name: 'Default' }, category: { id: '2', name: 'Internal', hidden: true, expenseType: null } },
    ]));

    expect(matrix.categories).toEqual([{ key: 'category:1', name: 'Groceries' }]);
    expect(matrix.months.map(({ key }) => key)).toEqual(['2026-09']);
    expect(matrix.months[0]?.totals).toEqual(new Map([['category:1', '7.00']]));
  });

  it('builds a zero-filled category-by-month matrix with stable category columns and exact amounts', () => {
    const matrix = createMonthlyCategoryMatrixData(groupTransactionsByAvailableMonth([
      { bookingDate: '2026-09-01', amount: '9007199254740993.01', person: { id: '1', name: 'Default' }, category: { id: '10', name: 'Alpha', hidden: false, expenseType: null } },
      { bookingDate: '2026-09-02', amount: '-0.002', person: { id: '1', name: 'Default' }, category: { id: '10', name: 'Alpha', hidden: false, expenseType: null } },
      { bookingDate: '2026-09-03', amount: '-12.50', person: { id: '1', name: 'Default' }, category: { id: '2', name: 'alpha', hidden: false, expenseType: null } },
      { bookingDate: '2026-09-04', amount: '-3.25', person: { id: '1', name: 'Default' }, category: null },
      { bookingDate: '2026-08-01', amount: '4.00', person: { id: '1', name: 'Default' }, category: { id: '2', name: 'alpha', hidden: false, expenseType: null } },
      { bookingDate: '2026-08-02', amount: '-8.00', person: { id: '1', name: 'Default' }, category: { id: '3', name: 'Groceries', hidden: false, expenseType: null } },
      { bookingDate: '2018-03-17', amount: '5.00', person: { id: '1', name: 'Default' }, category: { id: '3', name: 'Groceries', hidden: false, expenseType: null } },
    ]));

    expect(matrix.categories).toEqual([
      { key: 'category:2', name: 'alpha' },
      { key: 'category:10', name: 'Alpha' },
      { key: 'category:3', name: 'Groceries' },
      { key: 'uncategorised', name: 'Uncategorised' },
    ]);
    expect(matrix.months.map(({ key }) => key)).toEqual(['2026-09', '2026-08', '2018-03']);
    expect(matrix.months[0]?.totals).toEqual(new Map([
      ['category:2', '12.50'],
      ['category:10', '9007199254740993.012'],
      ['category:3', '0'],
      ['uncategorised', '3.25'],
    ]));
    expect(matrix.months[1]?.totals).toEqual(new Map([
      ['category:2', '4.00'],
      ['category:10', '0'],
      ['category:3', '8.00'],
      ['uncategorised', '0'],
    ]));
    expect(matrix.months[2]?.totals).toEqual(new Map([
      ['category:2', '0'],
      ['category:10', '0'],
      ['category:3', '5.00'],
      ['uncategorised', '0'],
    ]));
  });
});

describe('monthly category averages', () => {
  it('rounds an exact decimal sum to the cent with halves away from zero', () => {
    expect(averageDecimalString('1.00', 8)).toBe('0.13');
    expect(averageDecimalString('-1.00', 8)).toBe('-0.13');
    expect(averageDecimalString('1.00', 4)).toBe('0.25');
    expect(averageDecimalString('16.50', 3)).toBe('5.50');
    expect(averageDecimalString('0.01', 3)).toBe('0.00');
    expect(averageDecimalString('9007199254740993.00', 12)).toBe('750599937895082.75');
    expect(() => averageDecimalString('1.00', 0)).toThrow();
  });

  it('averages absolute in-window amounts over the configured months, counting empty months as zero', () => {
    const averages = getCategoryMonthlyAverages([
      { bookingDate: '2026-09-01', amount: '-12.00', person: { id: '1', name: 'Default' }, category: { id: '1', name: 'Groceries', hidden: false, expenseType: null } },
      { bookingDate: '2026-08-01', amount: '-12.00', person: { id: '1', name: 'Default' }, category: { id: '1', name: 'Groceries', hidden: false, expenseType: null } },
      { bookingDate: '2026-09-20', amount: '3.00', person: { id: '1', name: 'Default' }, category: { id: '1', name: 'Groceries', hidden: false, expenseType: null } },
      { bookingDate: '2020-01-15', amount: '-100.00', person: { id: '1', name: 'Default' }, category: { id: '1', name: 'Groceries', hidden: false, expenseType: null } },
      { bookingDate: '2026-09-02', amount: '-2.00', person: { id: '1', name: 'Default' }, category: null },
    ], '2026-09-28', 12);

    expect(averages).toEqual([
      { key: 'category:1', name: 'Groceries', amount: '2.25' },
      { key: 'uncategorised', name: 'Uncategorised', amount: '0.17' },
    ]);
  });

  it('excludes hidden categories from the averages while leaving visible categories unchanged', () => {
    const averages = getCategoryMonthlyAverages([
      { bookingDate: '2026-09-01', amount: '-12.00', person: { id: '1', name: 'Default' }, category: { id: '1', name: 'Groceries', hidden: false, expenseType: null } },
      { bookingDate: '2026-09-02', amount: '-120.00', person: { id: '1', name: 'Default' }, category: { id: '2', name: 'Internal', hidden: true, expenseType: null } },
      { bookingDate: '2026-09-03', amount: '-2.00', person: { id: '1', name: 'Default' }, category: null },
    ], '2026-09-28', 12);

    expect(averages).toEqual([
      { key: 'category:1', name: 'Groceries', amount: '1.00' },
      { key: 'uncategorised', name: 'Uncategorised', amount: '0.17' },
    ]);
  });

  it('excludes transactions outside the window and future dates in the current month', () => {
    const averages = getCategoryMonthlyAverages([
      { bookingDate: '2025-09-30', amount: '-100.00', person: { id: '1', name: 'Default' }, category: { id: '1', name: 'Too old', hidden: false, expenseType: null } },
      { bookingDate: '2026-09-29', amount: '-100.00', person: { id: '1', name: 'Default' }, category: { id: '2', name: 'Future', hidden: false, expenseType: null } },
      { bookingDate: '2026-09-28', amount: '-6.00', person: { id: '1', name: 'Default' }, category: { id: '3', name: 'Today', hidden: false, expenseType: null } },
    ], '2026-09-28', 12);

    expect(averages).toEqual([
      { key: 'category:3', name: 'Today', amount: '0.50' },
    ]);
  });

  it('orders categories by name case-insensitively with identity tie-breaks and uncategorised last', () => {
    const averages = getCategoryMonthlyAverages([
      { bookingDate: '2026-09-01', amount: '-12.00', person: { id: '1', name: 'Default' }, category: { id: '10', name: 'alpha', hidden: false, expenseType: null } },
      { bookingDate: '2026-09-02', amount: '-12.00', person: { id: '1', name: 'Default' }, category: { id: '2', name: 'Alpha', hidden: false, expenseType: null } },
      { bookingDate: '2026-09-03', amount: '-12.00', person: { id: '1', name: 'Default' }, category: { id: '3', name: 'Zulu', hidden: false, expenseType: null } },
      { bookingDate: '2026-09-04', amount: '-12.00', person: { id: '1', name: 'Default' }, category: null },
    ], '2026-09-28', 12);

    expect(averages.map(({ key }) => key)).toEqual([
      'category:2', 'category:10', 'category:3', 'uncategorised',
    ]);
  });
});

describe('expense-type selection', () => {
  const transactions: CategorySpendingTransaction[] = [
    { bookingDate: '2026-09-01', amount: '-10.00', person: { id: '1', name: 'Default' }, category: { id: '1', name: 'Groceries', hidden: false, expenseType: 'recurring' } },
    { bookingDate: '2026-09-02', amount: '-20.00', person: { id: '1', name: 'Default' }, category: { id: '2', name: 'New car', hidden: false, expenseType: 'one-time' } },
    { bookingDate: '2026-09-03', amount: '-30.00', person: { id: '1', name: 'Default' }, category: { id: '3', name: 'Internal', hidden: true, expenseType: null } },
    { bookingDate: '2026-09-04', amount: '-40.00', person: { id: '1', name: 'Default' }, category: null },
  ];

  it('returns the input unchanged for the all choice', () => {
    expect(filterTransactionsByExpenseType(transactions, 'all')).toBe(transactions);
  });

  it('keeps only recurring categories for the recurring choice', () => {
    expect(filterTransactionsByExpenseType(transactions, 'recurring').map(({ category }) => category?.name))
      .toEqual(['Groceries']);
  });

  it('keeps only one-time categories for the one-time choice', () => {
    expect(filterTransactionsByExpenseType(transactions, 'one-time').map(({ category }) => category?.name))
      .toEqual(['New car']);
  });

  it('drops unset categories and uncategorised transactions under a typed choice', () => {
    const selected = filterTransactionsByExpenseType(transactions, 'one-time');

    expect(selected.some(({ category }) => category === null)).toBe(false);
    expect(selected.some(({ category }) => category?.expenseType === null)).toBe(false);
  });

  it('does not mutate the input', () => {
    const copy = [...transactions];

    filterTransactionsByExpenseType(transactions, 'recurring');

    expect(transactions).toEqual(copy);
  });
});

function transaction(
  bookingDate: string,
  amount: string,
  category: { id: string; name: string; hidden?: boolean; expenseType?: 'recurring' | 'one-time' | null } | null,
): CategorySpendingTransaction {
  return {
    bookingDate,
    amount,
    person: { id: '1', name: 'Default' },
    category: category === null
      ? null
      : { hidden: false, expenseType: null, ...category },
  };
}

describe('calendar-year month selection', () => {
  it('builds twelve month options with exact bounds', () => {
    const months = getCalendarYearMonths(2024);

    expect(months).toHaveLength(12);
    expect(months[0]).toMatchObject({
      key: '2024-01',
      label: 'January 2024',
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    });
    expect(months[1]).toMatchObject({
      key: '2024-02',
      startDate: '2024-02-01',
      endDate: '2024-02-29',
    });
    expect(months[11]).toMatchObject({
      key: '2024-12',
      label: 'December 2024',
      startDate: '2024-12-01',
      endDate: '2024-12-31',
    });
  });

  it('selects a well-formed month from the query before applying defaults', () => {
    expect(resolveSelectedMonth('2025-03', [], '2026-09-28')).toBe('2025-03');
    expect(resolveSelectedMonth('2025-3', [], '2026-09-28')).toBe('2026-09');
    expect(resolveSelectedMonth('2025-13', [], '2026-09-28')).toBe('2026-09');
  });

  it('defaults to the current month when the transactions represent it', () => {
    const transactions = [
      transaction('2026-09-02', '-1.00', { id: '1', name: 'Groceries' }),
      transaction('2026-08-02', '-1.00', { id: '1', name: 'Groceries' }),
    ];

    expect(resolveSelectedMonth(undefined, transactions, '2026-09-28')).toBe('2026-09');
  });

  it('falls back to the newest represented month when the current month is empty', () => {
    const transactions = [
      transaction('2026-07-02', '-1.00', { id: '1', name: 'Groceries' }),
      transaction('2026-08-02', '-1.00', { id: '1', name: 'Groceries' }),
    ];

    expect(resolveSelectedMonth(undefined, transactions, '2026-09-28')).toBe('2026-08');
  });

  it('does not let a hidden-only current month win the default', () => {
    const transactions = [
      transaction('2026-09-02', '-1.00', { id: '2', name: 'Internal', hidden: true }),
      transaction('2026-07-02', '-1.00', { id: '1', name: 'Groceries' }),
    ];

    expect(resolveSelectedMonth(undefined, transactions, '2026-09-28')).toBe('2026-07');
  });

  it('falls back to the current month when there are no transactions', () => {
    expect(resolveSelectedMonth(undefined, [], '2026-09-28')).toBe('2026-09');
  });

  it('offers represented years, the current year, and the selected month year newest first', () => {
    const transactions = [
      transaction('2024-01-02', '-1.00', { id: '1', name: 'Old' }),
      transaction('2026-05-02', '-1.00', { id: '1', name: 'Recent' }),
      transaction('2023-05-02', '-1.00', { id: '2', name: 'Hidden', hidden: true }),
    ];

    expect(getAvailableYears(transactions, '2026-09-28')).toEqual([2026, 2024]);
    expect(getAvailableYears(transactions, '2026-09-28', '2020-05')).toEqual([2026, 2024, 2020]);
  });

  it('filters transactions to exactly one calendar month', () => {
    const transactions = [
      transaction('2026-08-31', '-1.00', { id: '1', name: 'August' }),
      transaction('2026-09-01', '-2.00', { id: '1', name: 'September' }),
      transaction('2026-09-30', '-3.00', { id: '1', name: 'September' }),
    ];

    expect(filterTransactionsByMonth(transactions, '2026-09').map(({ amount }) => amount))
      .toEqual(['-2.00', '-3.00']);
  });
});

describe('yearly year selection', () => {
  it('offers represented years, the current year, and a selected year oldest first', () => {
    const transactions = [
      transaction('2024-01-02', '-1.00', { id: '1', name: 'Old' }),
      transaction('2026-05-02', '-1.00', { id: '1', name: 'Recent' }),
      transaction('2023-05-02', '-1.00', { id: '2', name: 'Hidden', hidden: true }),
    ];

    expect(getYearlyYearOptions(transactions, '2026-09-28')).toEqual([2024, 2026]);
    expect(getYearlyYearOptions(transactions, '2026-09-28', 2020)).toEqual([2020, 2024, 2026]);
  });

  it('selects a well-formed query year even when no transaction represents it', () => {
    expect(resolveSelectedYear('2025', [], '2026-09-28')).toBe(2025);
    expect(resolveSelectedYear('2025-3', [], '2026-09-28')).toBe(2026);
  });

  it('defaults to the current year when represented, then the newest represented year', () => {
    const transactions = [
      transaction('2024-01-02', '-1.00', { id: '1', name: 'Old' }),
      transaction('2026-05-02', '-1.00', { id: '1', name: 'Recent' }),
    ];

    expect(resolveSelectedYear(undefined, transactions, '2026-09-28')).toBe(2026);
    expect(resolveSelectedYear(undefined, transactions.slice(0, 1), '2026-09-28')).toBe(2024);
    expect(resolveSelectedYear(undefined, [], '2026-09-28')).toBe(2026);
  });

  it('does not let a hidden-only current year win the default', () => {
    const transactions = [
      transaction('2026-09-02', '-1.00', { id: '2', name: 'Internal', hidden: true }),
      transaction('2024-07-02', '-1.00', { id: '1', name: 'Groceries' }),
    ];

    expect(resolveSelectedYear(undefined, transactions, '2026-09-28')).toBe(2024);
  });

  it('counts elapsed calendar months for current, past, and future years', () => {
    expect(getElapsedMonthsInYear(2026, '2026-10-15')).toBe(10);
    expect(getElapsedMonthsInYear(2025, '2026-10-15')).toBe(12);
    expect(getElapsedMonthsInYear(2027, '2026-10-15')).toBe(0);
    expect(getElapsedMonthsInYear(2026, '2026-01-01')).toBe(1);
  });
});

describe('yearly category matrix', () => {
  it('builds twelve month cells and a total from exact absolute sums', () => {
    const matrix = createYearlyCategoryMatrixData([
      transaction('2026-01-02', '-12.50', { id: '1', name: 'Groceries' }),
      transaction('2026-01-03', '4.00', { id: '1', name: 'Groceries' }),
      transaction('2026-03-04', '-7.00', { id: '1', name: 'Groceries' }),
      transaction('2026-02-05', '-100.00', { id: '2', name: 'Rent' }),
      transaction('2025-12-06', '-50.00', { id: '1', name: 'Groceries' }),
    ], 2026);

    expect(matrix.months.map(({ key }) => key)).toEqual([
      '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06',
      '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12',
    ]);
    expect(matrix.rows.map(({ name, total }) => [name, total])).toEqual([
      ['Rent', '100.00'],
      ['Groceries', '23.50'],
    ]);
    expect(matrix.rows[0]?.cells).toEqual([
      '0', '100.00', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0',
    ]);
    expect(matrix.rows[1]?.cells).toEqual([
      '16.50', '0', '7.00', '0', '0', '0', '0', '0', '0', '0', '0', '0',
    ]);
    expect(matrix.rows[0]?.maximum).toBe('100.00');
    expect(matrix.rows[1]?.maximum).toBe('16.50');
    expect(matrix.total).toBe('123.50');
  });

  it('excludes hidden categories and includes uncategorised', () => {
    const matrix = createYearlyCategoryMatrixData([
      transaction('2026-01-02', '-12.50', { id: '1', name: 'Groceries' }),
      transaction('2026-01-03', '-999.00', { id: '2', name: 'Internal', hidden: true }),
      transaction('2026-02-04', '-2.00', null),
    ], 2026);

    expect(matrix.rows.map(({ name, total }) => [name, total])).toEqual([
      ['Groceries', '12.50'],
      ['Uncategorised', '2.00'],
    ]);
    expect(matrix.total).toBe('14.50');
  });

  it('orders rows by total descending, then name and identity, with uncategorised participating', () => {
    const matrix = createYearlyCategoryMatrixData([
      transaction('2026-01-02', '-5.00', { id: '3', name: 'Zulu' }),
      transaction('2026-01-03', '-5.00', { id: '2', name: 'alpha' }),
      transaction('2026-01-04', '-10.00', null),
      transaction('2026-01-05', '-5.00', { id: '4', name: 'Alpha' }),
    ], 2026);

    expect(matrix.rows.map(({ name }) => name)).toEqual([
      'Uncategorised', 'alpha', 'Alpha', 'Zulu',
    ]);
  });

  it('keeps a zero-total category row', () => {
    const matrix = createYearlyCategoryMatrixData([
      transaction('2026-01-02', '0.00', { id: '1', name: 'Zero-only' }),
    ], 2026);

    expect(matrix.rows).toHaveLength(1);
    expect(matrix.rows[0]?.name).toBe('Zero-only');
    expect(isZeroAmountString(matrix.rows[0]?.total ?? '')).toBe(true);
    expect(matrix.rows[0]?.maximum).toBe('0');
  });

  it('computes a row-relative tint within the brand range', () => {
    expect(getYearlyCellTintPercent('100.00', '100.00')).toBe(56);
    expect(getYearlyCellTintPercent('50.00', '100.00')).toBe(31);
    expect(getYearlyCellTintPercent('0', '100.00')).toBe(0);
    expect(getYearlyCellTintPercent('100.00', '0')).toBe(0);
    expect(getYearlyCellTintPercent('200.00', '100.00')).toBe(56);
  });
});

describe('selected-month category breakdown', () => {
  const transactions = [
    transaction('2026-09-01', '-12.50', { id: '1', name: 'Groceries' }),
    transaction('2026-09-02', '4.00', { id: '1', name: 'Groceries' }),
    transaction('2026-09-03', '-3.25', null),
    transaction('2026-09-04', '-99.00', { id: '2', name: 'Internal', hidden: true }),
    transaction('2026-09-05', '5.00', { id: '3', name: 'Alpha' }),
    transaction('2026-09-06', '5.00', { id: '4', name: 'alpha' }),
    transaction('2026-09-07', '0.01', { id: '5', name: 'Almost' }),
    transaction('2026-09-08', '-0.01', { id: '5', name: 'Almost' }),
    transaction('2026-08-01', '-100.00', { id: '1', name: 'Groceries' }),
  ];

  it('sums both signs, counts transactions, and excludes hidden categories', () => {
    const breakdown = getCategoryBreakdown(filterTransactionsByMonth(transactions, '2026-09'));

    expect(breakdown.entries.map(({ name, amount, transactions: count }) => [name, amount, count])).toEqual([
      ['Groceries', '16.50', 2],
      ['Alpha', '5.00', 1],
      ['alpha', '5.00', 1],
      ['Uncategorised', '3.25', 1],
      ['Almost', '0.02', 2],
    ]);
    expect(breakdown.total).toBe('29.77');
    expect(breakdown.transactionCount).toBe(7);
    expect(breakdown.entries.some(({ name }) => name === 'Internal')).toBe(false);
  });

  it('keeps a zero-amount category listed', () => {
    const breakdown = getCategoryBreakdown([
      transaction('2026-09-01', '0', { id: '6', name: 'Zero' }),
      transaction('2026-09-02', '-0.00', { id: '6', name: 'Zero' }),
    ]);

    expect(breakdown.entries).toEqual([
      { key: 'category:6', name: 'Zero', amount: '0.00', transactions: 2 },
    ]);
    expect(breakdown.other).toBeNull();
  });

  it('splits the eight largest categories from one Other segment', () => {
    const many = Array.from({ length: 10 }, (_, index) =>
      transaction('2026-09-01', String(10 - index), {
        id: String(index + 1),
        name: `Category ${String(index + 1).padStart(2, '0')}`,
      }));

    const breakdown = getCategoryBreakdown(many);

    expect(breakdown.entries).toHaveLength(10);
    expect(breakdown.top).toHaveLength(8);
    expect(breakdown.other).toEqual({
      key: 'other',
      name: 'Other 2',
      amount: '3',
      transactions: 2,
    });
    expect(breakdown.total).toBe('55');
    expect(breakdown.transactionCount).toBe(10);
  });

  it('omits Other when eight or fewer categories are listed', () => {
    const six = Array.from({ length: 6 }, (_, index) =>
      transaction('2026-09-01', String(6 - index), {
        id: String(index + 1),
        name: `Category ${index + 1}`,
      }));

    const breakdown = getCategoryBreakdown(six);

    expect(breakdown.top).toHaveLength(6);
    expect(breakdown.other).toBeNull();
  });

  it('returns an empty breakdown for no transactions', () => {
    expect(getCategoryBreakdown([])).toEqual({
      entries: [],
      top: [],
      other: null,
      total: '0',
      transactionCount: 0,
    });
  });
});

describe('share of the largest category', () => {
  it('reports the largest at 100 and smaller amounts proportionally', () => {
    expect(getCategorySharePercent('100.00', '100.00')).toBe(100);
    expect(getCategorySharePercent('25.00', '100.00')).toBe(25);
    expect(getCategorySharePercent('1.00', '3.00')).toBe(33.33);
  });

  it('handles zero amounts and large exact values', () => {
    expect(getCategorySharePercent('0.00', '100.00')).toBe(0);
    expect(getCategorySharePercent('100.00', '0.00')).toBe(0);
    expect(getCategorySharePercent('9007199254740993.01', '18014398509481986.02')).toBe(50);
  });
});
