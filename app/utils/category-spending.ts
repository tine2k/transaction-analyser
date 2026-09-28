export type CategorySpendingTransaction = {
  bookingDate: string;
  amount: string;
  category: { id: string; name: string } | null;
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

export type MonthlyCategoryChartData = MonthlyCategoryTotals & {
  pieData: CategoryPieDatum[];
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

export function getCategorySpendingTotals(
  groups: CategoryTransactionGroup[],
): CategorySpendingTotal[] {
  return groups.map((group) => ({
    key: group.key,
    name: group.name,
    amount: sumAbsoluteAmountStrings(group.transactions.map(({ amount }) => amount)),
  }));
}

export function getMonthlyCategorySpendingTotals(
  months: MonthlyCategoryGroups[],
): MonthlyCategoryTotals[] {
  return months.map(({ groups, ...month }) => ({
    ...month,
    totals: getCategorySpendingTotals(groups),
  }));
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

export function formatEuroAmount(amount: string): string {
  return `€${amount}`;
}

export function getLastTwelveCalendarMonths(today: string): CalendarMonth[] {
  const [yearPart, monthPart] = today.split('-');
  const year = Number(yearPart);
  const month = Number(monthPart);

  return Array.from({ length: 12 }, (_, offset) => {
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

export function groupTransactionsByMonth(
  transactions: CategorySpendingTransaction[],
  today: string,
): MonthlyCategoryGroups[] {
  const months = getLastTwelveCalendarMonths(today).map((month) => ({
    ...month,
    groupsByKey: new Map<string, CategoryTransactionGroup>(),
  }));

  for (const transaction of transactions) {
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

export function getLocalDateString(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
