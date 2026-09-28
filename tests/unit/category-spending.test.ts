import { describe, expect, it } from 'vitest';
import {
  CATEGORY_COLOR_PALETTE,
  createCategoryPieData,
  createCategoryColorMap,
  createMonthlyCategoryMatrixData,
  createMonthlyCategoryChartData,
  formatEuroAmount,
  getLastTwelveCalendarMonths,
  getMonthlyCategorySpendingTotals,
  groupTransactionsByAvailableMonth,
  groupTransactionsByMonth,
  isZeroAmountString,
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
      { bookingDate: '2026-09-01', amount: '2.000', category: { id: '1', name: 'Two' } },
      { bookingDate: '2026-09-01', amount: '9007199254740993.02', category: { id: '2', name: 'Large lower' } },
      { bookingDate: '2026-09-01', amount: '5.0', category: { id: '3', name: 'Zulu' } },
      { bookingDate: '2026-09-01', amount: '9007199254740993.1', category: { id: '4', name: 'Largest' } },
      { bookingDate: '2026-09-01', amount: '5.00', category: { id: '5', name: 'Alpha' } },
      { bookingDate: '2026-09-01', amount: '10.00', category: { id: '6', name: 'Ten' } },
    ];
    const [month] = getMonthlyCategorySpendingTotals(
      groupTransactionsByMonth(transactions, '2026-09-28'),
    );

    expect(month?.totals.map(({ name, amount }) => [name, amount])).toEqual([
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
      { bookingDate: '2026-09-01', amount: '-12.50', category: { id: '1', name: 'Groceries' } },
      { bookingDate: '2026-09-02', amount: '4.00', category: { id: '1', name: 'Groceries' } },
    ];
    const [month] = getMonthlyCategorySpendingTotals(
      groupTransactionsByMonth(transactions, '2026-09-28'),
    );
    const [total] = month?.totals ?? [];

    expect(total?.amount).toBe('16.50');
    expect(formatEuroAmount(total?.amount ?? '')).toBe(new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(16.5));
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

  it('builds positive pie values only for completed category totals', () => {
    expect(createCategoryPieData([
      { key: 'category:1', name: 'Groceries', amount: '100.00' },
      { key: 'category:2', name: 'Transport', amount: '25.00' },
      { key: 'category:3', name: 'Empty', amount: '0.00' },
    ])).toEqual([
      { key: 'category:1', name: 'Groceries', amount: '100.00', value: 1 },
      { key: 'category:2', name: 'Transport', amount: '25.00', value: 0.25 },
    ]);
    expect(createCategoryPieData([])).toEqual([]);
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

describe('calendar-month transaction buckets', () => {
  it('creates twelve months from the current partial month back through the oldest month', () => {
    const months = getLastTwelveCalendarMonths('2026-09-28');

    expect(months).toHaveLength(12);
    expect(months.map(({ key }) => key)).toEqual([
      '2026-09', '2026-08', '2026-07', '2026-06', '2026-05', '2026-04',
      '2026-03', '2026-02', '2026-01', '2025-12', '2025-11', '2025-10',
    ]);
    expect(months[0]).toMatchObject({
      label: 'September 2026',
      startDate: '2026-09-01',
      endDate: '2026-09-28',
    });
    expect(months[11]).toMatchObject({
      label: 'October 2025',
      startDate: '2025-10-01',
      endDate: '2025-10-31',
    });
  });

  it('assigns eligible bookings to their month and excludes dates outside the range', () => {
    const monthlyGroups = groupTransactionsByMonth([
      { bookingDate: '2025-09-30', amount: '-1.00', category: { id: '1', name: 'Too old' } },
      { bookingDate: '2025-10-01', amount: '-2.00', category: { id: '2', name: 'Earliest' } },
      { bookingDate: '2026-09-28', amount: '-3.00', category: { id: '3', name: 'Today' } },
      { bookingDate: '2026-09-29', amount: '-4.00', category: { id: '4', name: 'Future' } },
    ], '2026-09-28');

    expect(monthlyGroups).toHaveLength(12);
    expect(monthlyGroups[0]?.groups.map((group) => group.name)).toEqual(['Today']);
    expect(monthlyGroups[11]?.groups.map((group) => group.name)).toEqual(['Earliest']);
    expect(monthlyGroups.slice(1, 11).every((month) => month.groups.length === 0)).toBe(true);
  });

  it('groups every represented booking month newest-first without adding empty months', () => {
    const months = groupTransactionsByAvailableMonth([
      { bookingDate: '2020-01-31', amount: '-1.00', category: { id: '1', name: 'Old' } },
      { bookingDate: '2026-08-03', amount: '-2.00', category: { id: '2', name: 'Recent' } },
      { bookingDate: '2026-08-29', amount: '3.00', category: { id: '2', name: 'Recent' } },
      { bookingDate: '2026-09-02', amount: '-4.00', category: null },
    ]);

    expect(months.map(({ key, label }) => [key, label])).toEqual([
      ['2026-09', 'September 2026'],
      ['2026-08', 'August 2026'],
      ['2020-01', 'January 2020'],
    ]);
    expect(months[1]?.groups[0]?.transactions).toHaveLength(2);
    expect(months[2]?.groups[0]?.name).toBe('Old');
  });

  it('keeps exact absolute category totals separate by month, including uncategorised amounts', () => {
    const transactions: CategorySpendingTransaction[] = [
      { bookingDate: '2026-09-01', amount: '-12.50', category: { id: '1', name: 'Groceries' } },
      { bookingDate: '2026-09-02', amount: '4.00', category: { id: '1', name: 'Groceries' } },
      { bookingDate: '2026-09-03', amount: '-0.01', category: null },
      { bookingDate: '2026-08-01', amount: '9007199254740993.01', category: { id: '1', name: 'Groceries' } },
      { bookingDate: '2026-08-02', amount: '-0.01', category: { id: '1', name: 'Groceries' } },
    ];
    const totals = getMonthlyCategorySpendingTotals(
      groupTransactionsByMonth(transactions, '2026-09-28'),
    );

    expect(totals[0]?.totals).toEqual([
      { key: 'category:1', name: 'Groceries', amount: '16.50' },
      { key: 'uncategorised', name: 'Uncategorised', amount: '0.01' },
    ]);
    expect(totals[1]?.totals).toEqual([
      { key: 'category:1', name: 'Groceries', amount: '9007199254740993.02' },
    ]);
  });

  it('builds a zero-filled category-by-month matrix with stable category columns and exact amounts', () => {
    const matrix = createMonthlyCategoryMatrixData(groupTransactionsByAvailableMonth([
      { bookingDate: '2026-09-01', amount: '9007199254740993.01', category: { id: '10', name: 'Alpha' } },
      { bookingDate: '2026-09-02', amount: '-0.002', category: { id: '10', name: 'Alpha' } },
      { bookingDate: '2026-09-03', amount: '-12.50', category: { id: '2', name: 'alpha' } },
      { bookingDate: '2026-09-04', amount: '-3.25', category: null },
      { bookingDate: '2026-08-01', amount: '4.00', category: { id: '2', name: 'alpha' } },
      { bookingDate: '2026-08-02', amount: '-8.00', category: { id: '3', name: 'Groceries' } },
      { bookingDate: '2018-03-17', amount: '5.00', category: { id: '3', name: 'Groceries' } },
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

  it('creates twelve chart datasets and retains empty months without fake slices', () => {
    const months = getMonthlyCategorySpendingTotals(
      groupTransactionsByMonth([
        { bookingDate: '2026-09-02', amount: '-5.00', category: { id: '1', name: 'Groceries' } },
      ], '2026-09-28'),
    );
    const charts = createMonthlyCategoryChartData(months);

    expect(charts).toHaveLength(12);
    expect(charts[0]?.pieData).toEqual([
      { key: 'category:1', name: 'Groceries', amount: '5.00', value: 1 },
    ]);
    expect(charts.slice(1).every(({ totals, pieData }) => totals.length === 0 && pieData.length === 0))
      .toBe(true);
  });
});
