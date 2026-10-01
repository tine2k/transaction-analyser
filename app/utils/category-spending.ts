export type CategorySpendingTransaction = {
  bookingDate: string;
  amount: string;
  category: { id: string; name: string; hidden: boolean } | null;
};

export type CategoryTransactionGroup = {
  key: string;
  name: string;
  transactions: CategorySpendingTransaction[];
};

export type CategorySpendingTotal = {
  key: string;
  name: string;
  amount: string;
};

export type CategoryPieDatum = CategorySpendingTotal & { value: number };

export type CalendarMonth = {
  key: string;
  label: string;
  startDate: string;
  endDate: string;
};

export type MonthlyCategoryGroups = CalendarMonth & {
  groups: CategoryTransactionGroup[];
};

export type MonthlyCategoryTotals = CalendarMonth & {
  totals: CategorySpendingTotal[];
};

export type MonthlyCategoryMatrixData = {
  categories: Array<Pick<CategorySpendingTotal, 'key' | 'name'>>;
  months: Array<CalendarMonth & { totals: Map<string, string> }>;
};

export type MonthlyCategoryChartData = MonthlyCategoryTotals & {
  pieData: CategoryPieDatum[];
};

export type CategoryMonthlyAverage = {
  key: string;
  name: string;
  amount: string;
};

type DecimalParts = { coefficient: bigint; scale: number };

export const CATEGORY_COLOR_PALETTE = [
  '#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F',
  '#EDC948', '#B07AA1', '#FF9DA7', '#9C755F', '#BAB0AC',
] as const;

export function createCategoryColorMap(categoryKeys: string[]): Map<string, string> {
  const sortedKeys = [...new Set(categoryKeys)].sort();
  return new Map(sortedKeys.map((key, index) => [
    key,
    CATEGORY_COLOR_PALETTE[index % CATEGORY_COLOR_PALETTE.length]!,
  ]));
}

function parseDecimal(value: string): DecimalParts {
  const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(value);
  if (match === null) {
    throw new Error('transaction amount is not a decimal string');
  }

  const fraction = match[3] ?? '';
  const coefficient = BigInt(`${match[2]}${fraction}`);
  return {
    coefficient: match[1] === '-' ? -coefficient : coefficient,
    scale: fraction.length,
  };
}

function powerOfTen(exponent: number): bigint {
  return 10n ** BigInt(exponent);
}

export function compareDecimalStrings(left: string, right: string): number {
  const leftDecimal = parseDecimal(left);
  const rightDecimal = parseDecimal(right);
  const commonScale = Math.max(leftDecimal.scale, rightDecimal.scale);
  const alignedLeft = leftDecimal.coefficient * powerOfTen(commonScale - leftDecimal.scale);
  const alignedRight = rightDecimal.coefficient * powerOfTen(commonScale - rightDecimal.scale);
  return alignedLeft < alignedRight ? -1 : alignedLeft > alignedRight ? 1 : 0;
}

export function sumAbsoluteAmountStrings(amounts: string[]): string {
  let coefficient = 0n;
  let scale = 0;

  for (const amount of amounts) {
    const parsed = parseDecimal(amount);
    if (parsed.scale > scale) {
      coefficient *= powerOfTen(parsed.scale - scale);
      scale = parsed.scale;
    }
    const aligned = parsed.coefficient * powerOfTen(scale - parsed.scale);
    coefficient += aligned < 0n ? -aligned : aligned;
  }

  const digits = coefficient.toString().padStart(scale + 1, '0');
  if (scale === 0) {
    return digits;
  }
  return `${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
}

export function isZeroAmountString(amount: string): boolean {
  return parseDecimal(amount).coefficient === 0n;
}

export function sumSignedAmountStrings(amounts: string[]): string {
  let coefficient = 0n;
  let scale = 0;

  for (const amount of amounts) {
    const parsed = parseDecimal(amount);
    if (parsed.scale > scale) {
      coefficient *= powerOfTen(parsed.scale - scale);
      scale = parsed.scale;
    }
    coefficient += parsed.coefficient * powerOfTen(scale - parsed.scale);
  }

  const negative = coefficient < 0n;
  const digits = (negative ? -coefficient : coefficient).toString().padStart(scale + 1, '0');
  const sign = negative ? '-' : '';
  if (scale === 0) {
    return `${sign}${digits}`;
  }
  return `${sign}${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
}

export function getCategorySpendingTotals(
  groups: CategoryTransactionGroup[],
): CategorySpendingTotal[] {
  return groups
    .map((group) => ({
      key: group.key,
      name: group.name,
      amount: sumAbsoluteAmountStrings(group.transactions.map(({ amount }) => amount)),
    }))
    .sort((left, right) =>
      compareDecimalStrings(right.amount, left.amount)
      || (left.name < right.name ? -1 : left.name > right.name ? 1 : 0),
    );
}

// A hidden category is out of scope for the analysis views: its transactions are
// dropped before grouping or averaging, while its transactions stay in the
// transactions table and its membership is unchanged. The filter is applied once
// here so every analysis view excludes hidden categories the same way.
export function excludeHiddenCategoryTransactions(
  transactions: CategorySpendingTransaction[],
): CategorySpendingTransaction[] {
  return transactions.filter(({ category }) => category?.hidden !== true);
}

export function getMonthlyCategorySpendingTotals(
  months: MonthlyCategoryGroups[],
): MonthlyCategoryTotals[] {
  return months.map(({ groups, ...month }) => ({
    ...month,
    totals: getCategorySpendingTotals(groups),
  }));
}

function compareCategoryEntries(
  left: Pick<CategorySpendingTotal, 'key' | 'name'>,
  right: Pick<CategorySpendingTotal, 'key' | 'name'>,
): number {
  if (left.key === 'uncategorised') {
    return right.key === 'uncategorised' ? 0 : 1;
  }
  if (right.key === 'uncategorised') {
    return -1;
  }

  const byName = left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
  if (byName !== 0) {
    return byName;
  }

  const leftId = BigInt(left.key.slice('category:'.length));
  const rightId = BigInt(right.key.slice('category:'.length));
  return leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
}

export function createMonthlyCategoryMatrixData(
  months: MonthlyCategoryGroups[],
): MonthlyCategoryMatrixData {
  const monthlyTotals = getMonthlyCategorySpendingTotals(months);
  const categoriesByKey = new Map<string, Pick<CategorySpendingTotal, 'key' | 'name'>>();

  for (const { totals } of monthlyTotals) {
    for (const { key, name } of totals) {
      categoriesByKey.set(key, { key, name });
    }
  }

  const categories = [...categoriesByKey.values()].sort(compareCategoryEntries);

  return {
    categories,
    months: monthlyTotals.map(({ totals, ...month }) => {
      const monthTotals = new Map(categories.map(({ key }) => [key, '0']));
      for (const total of totals) {
        monthTotals.set(total.key, total.amount);
      }
      return { ...month, totals: monthTotals };
    }),
  };
}

export function createCategoryPieData(totals: CategorySpendingTotal[]): CategoryPieDatum[] {
  const positiveTotals = totals
    .map((total) => ({ total, decimal: parseDecimal(total.amount) }))
    .filter(({ decimal }) => decimal.coefficient > 0n);
  if (positiveTotals.length === 0) {
    return [];
  }

  const commonScale = Math.max(...positiveTotals.map(({ decimal }) => decimal.scale));
  const aligned = positiveTotals.map(({ total, decimal }) => ({
    total,
    coefficient: decimal.coefficient * powerOfTen(commonScale - decimal.scale),
  }));
  const largest = aligned.reduce(
    (max, item) => item.coefficient > max ? item.coefficient : max,
    0n,
  );
  const precision = 1_000_000_000_000_000n;

  return aligned.map(({ total, coefficient }) => {
    const roundedRatio = (coefficient * precision + largest / 2n) / largest;
    return {
      ...total,
      value: roundedRatio === 0n ? Number.MIN_VALUE : Number(roundedRatio) / Number(precision),
    };
  });
}

export function createMonthlyCategoryChartData(
  months: MonthlyCategoryTotals[],
): MonthlyCategoryChartData[] {
  return months.map((month) => ({
    ...month,
    pieData: createCategoryPieData(month.totals),
  }));
}

export function formatEuroAmount(amount: string, locale?: string): string {
  const decimal = parseDecimal(amount);
  const magnitude = decimal.coefficient < 0n ? -decimal.coefficient : decimal.coefficient;
  const divisor = powerOfTen(decimal.scale);
  const integer = magnitude / divisor;
  const fraction = (magnitude % divisor).toString().padStart(decimal.scale, '0');
  const currencyFormatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    useGrouping: true,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  const integerFormatter = new Intl.NumberFormat(locale, {
    useGrouping: true,
    maximumFractionDigits: 0,
  });
  const digitFormatter = new Intl.NumberFormat(locale, {
    useGrouping: false,
    maximumFractionDigits: 0,
  });
  const decimalSeparator = decimal.scale > 0
    ? new Intl.NumberFormat(locale, {
      useGrouping: false,
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).formatToParts(1.1).find(({ type }) => type === 'decimal')?.value ?? '.'
    : '';
  const localizedFraction = [...fraction]
    .map((digit) => digitFormatter.format(BigInt(digit)))
    .join('');
  const template = currencyFormatter.formatToParts(decimal.coefficient < 0n ? -1n : 1n);
  const localizedInteger = integerFormatter.formatToParts(integer);
  const result: string[] = [];
  let insertedNumber = false;

  for (const part of template) {
    if (part.type === 'integer' && !insertedNumber) {
      result.push(...localizedInteger.map(({ value }) => value));
      if (decimal.scale > 0) {
        result.push(decimalSeparator, localizedFraction);
      }
      insertedNumber = true;
    } else if (part.type !== 'integer' && part.type !== 'group') {
      result.push(part.value);
    }
  }

  return result.join('');
}

export function getLastCalendarMonths(today: string, count: number): CalendarMonth[] {
  const [yearPart, monthPart] = today.split('-');
  const year = Number(yearPart);
  const month = Number(monthPart);

  return Array.from({ length: count }, (_, offset) => {
    const date = new Date(Date.UTC(year, month - 1 - offset, 1));
    const monthYear = date.getUTCFullYear();
    const monthNumber = date.getUTCMonth() + 1;
    const monthStart = `${String(monthYear).padStart(4, '0')}-${String(monthNumber).padStart(2, '0')}-01`;
    const lastDay = new Date(Date.UTC(monthYear, monthNumber, 0)).getUTCDate();
    const monthEnd = offset === 0
      ? today
      : `${String(monthYear).padStart(4, '0')}-${String(monthNumber).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    return {
      key: monthStart.slice(0, 7),
      label: new Intl.DateTimeFormat('en', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(date),
      startDate: monthStart,
      endDate: monthEnd,
    };
  });
}

export function getLastTwelveCalendarMonths(today: string): CalendarMonth[] {
  return getLastCalendarMonths(today, 12);
}

export function averageDecimalString(sum: string, count: number): string {
  if (!Number.isInteger(count) || count <= 0) {
    throw new Error('month count must be a positive integer');
  }

  const { coefficient, scale } = parseDecimal(sum);
  const numerator = scale <= 2 ? coefficient * powerOfTen(2 - scale) : coefficient;
  const denominator = scale <= 2
    ? BigInt(count)
    : BigInt(count) * powerOfTen(scale - 2);

  const negative = numerator < 0n;
  const magnitude = negative ? -numerator : numerator;
  const quotient = magnitude / denominator;
  const remainder = magnitude % denominator;
  const rounded = 2n * remainder >= denominator ? quotient + 1n : quotient;
  const cents = negative ? -rounded : rounded;
  const negativeResult = cents < 0n;
  const absoluteCents = negativeResult ? -cents : cents;
  const integer = absoluteCents / 100n;
  const fraction = (absoluteCents % 100n).toString().padStart(2, '0');

  return `${negativeResult ? '-' : ''}${integer}.${fraction}`;
}

export function getCategoryMonthlyAverages(
  transactions: CategorySpendingTransaction[],
  today: string,
  monthCount: number,
): CategoryMonthlyAverage[] {
  const months = getLastCalendarMonths(today, monthCount);
  const amountsByKey = new Map<string, { name: string; amounts: string[] }>();

  for (const transaction of excludeHiddenCategoryTransactions(transactions)) {
    const inWindow = months.some(({ startDate, endDate }) =>
      transaction.bookingDate >= startDate && transaction.bookingDate <= endDate,
    );
    if (!inWindow) {
      continue;
    }

    const key = transaction.category === null ? 'uncategorised' : `category:${transaction.category.id}`;
    let entry = amountsByKey.get(key);
    if (entry === undefined) {
      entry = { name: transaction.category?.name ?? 'Uncategorised', amounts: [] };
      amountsByKey.set(key, entry);
    }
    entry.amounts.push(transaction.amount);
  }

  return [...amountsByKey.entries()]
    .map(([key, { name, amounts }]) => ({
      key,
      name,
      amount: averageDecimalString(sumAbsoluteAmountStrings(amounts), monthCount),
    }))
    .sort(compareCategoryEntries);
}

export function groupTransactionsByMonth(
  transactions: CategorySpendingTransaction[],
  today: string,
): MonthlyCategoryGroups[] {
  const months = getLastTwelveCalendarMonths(today).map((month) => ({
    ...month,
    groupsByKey: new Map<string, CategoryTransactionGroup>(),
  }));

  for (const transaction of excludeHiddenCategoryTransactions(transactions)) {
    const month = months.find(({ startDate, endDate }) =>
      transaction.bookingDate >= startDate && transaction.bookingDate <= endDate,
    );
    if (month === undefined) {
      continue;
    }

    const key = transaction.category === null ? 'uncategorised' : `category:${transaction.category.id}`;
    let group = month.groupsByKey.get(key);
    if (group === undefined) {
      group = {
        key,
        name: transaction.category?.name ?? 'Uncategorised',
        transactions: [],
      };
      month.groupsByKey.set(key, group);
    }
    group.transactions.push(transaction);
  }

  return months.map(({ groupsByKey, ...month }) => ({
    ...month,
    groups: [...groupsByKey.values()],
  }));
}

export function groupTransactionsByAvailableMonth(
  transactions: CategorySpendingTransaction[],
): MonthlyCategoryGroups[] {
  const monthsByKey = new Map<string, {
    month: CalendarMonth;
    groupsByKey: Map<string, CategoryTransactionGroup>;
  }>();

  for (const transaction of excludeHiddenCategoryTransactions(transactions)) {
    const key = transaction.bookingDate.slice(0, 7);
    let month = monthsByKey.get(key);
    if (month === undefined) {
      const [yearPart, monthPart] = key.split('-');
      const year = Number(yearPart);
      const monthNumber = Number(monthPart);
      const date = new Date(Date.UTC(year, monthNumber - 1, 1));
      const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
      const monthStart = `${key}-01`;
      month = {
        month: {
          key,
          label: new Intl.DateTimeFormat('en', {
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC',
          }).format(date),
          startDate: monthStart,
          endDate: `${key}-${String(lastDay).padStart(2, '0')}`,
        },
        groupsByKey: new Map(),
      };
      monthsByKey.set(key, month);
    }

    const categoryKey = transaction.category === null ? 'uncategorised' : `category:${transaction.category.id}`;
    let group = month.groupsByKey.get(categoryKey);
    if (group === undefined) {
      group = {
        key: categoryKey,
        name: transaction.category?.name ?? 'Uncategorised',
        transactions: [],
      };
      month.groupsByKey.set(categoryKey, group);
    }
    group.transactions.push(transaction);
  }

  return [...monthsByKey.values()]
    .sort((left, right) => right.month.key.localeCompare(left.month.key))
    .map(({ month, groupsByKey }) => ({
      ...month,
      groups: [...groupsByKey.values()],
    }));
}

export function getLocalDateString(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
