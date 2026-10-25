export type CategorySpendingTransaction = {
  bookingDate: string;
  amount: string;
  person: { id: string; name: string };
  category: {
    id: string;
    name: string;
    hidden: boolean;
    expenseType: 'recurring' | 'one-time' | null;
  } | null;
};

export type PersonChoice = {
  id: string;
  name: string;
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

export type CategoryBreakdownEntry = CategorySpendingTotal & {
  transactions: number;
};

export type CategoryBreakdown = {
  entries: CategoryBreakdownEntry[];
  top: CategoryBreakdownEntry[];
  other: CategoryBreakdownEntry | null;
  total: string;
  transactionCount: number;
};

export type CalendarMonth = {
  key: string;
  label: string;
  startDate: string;
  endDate: string;
};

export type MonthlyCategoryGroups = CalendarMonth & {
  groups: CategoryTransactionGroup[];
};

export type MonthlyCategoryMatrixData = {
  categories: Array<Pick<CategorySpendingTotal, 'key' | 'name'>>;
  months: Array<CalendarMonth & { totals: Map<string, string> }>;
};

export type CategoryMonthlyAverage = {
  key: string;
  name: string;
  amount: string;
};

type DecimalParts = { coefficient: bigint; scale: number };

export const CATEGORY_COLOR_PALETTE = [
  '#2F5FA8', '#D97A2B', '#3E8E5A', '#7D5BA6', '#B08A1E',
  '#2E8C8C', '#C2453C', '#5C6672', '#C25E7E', '#8A6B4F',
] as const;

export function createCategoryColorMap(categoryKeys: string[]): Map<string, string> {
  const sortedKeys = [...new Set(categoryKeys)].sort();
  return new Map(sortedKeys.map((key, index) => [
    key,
    CATEGORY_COLOR_PALETTE[index % CATEGORY_COLOR_PALETTE.length]!,
  ]));
}

// The people the returned transactions represent, ordered by name ignoring case
// and then by identity. A person with no transaction is not offered, because the
// analysis views only have rows to recompute.
export function getPersonChoices(transactions: CategorySpendingTransaction[]): PersonChoice[] {
  const byId = new Map<string, PersonChoice>();
  for (const transaction of transactions) {
    byId.set(transaction.person.id, transaction.person);
  }
  return [...byId.values()].sort((left, right) =>
    left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
    || left.id.localeCompare(right.id, undefined, { numeric: true }),
  );
}

// A person identity read from the route query. An absent, unknown, or unoffered
// value means all people, which is represented as null.
export function resolvePersonChoice(value: unknown, choices: PersonChoice[]): string | null {
  if (typeof value !== 'string' || value === '') {
    return null;
  }
  return choices.some(({ id }) => id === value) ? value : null;
}

// The person filter is a selection over the already-fetched transactions. All
// people (null) leaves every transaction eligible.
export function filterTransactionsByPerson(
  transactions: CategorySpendingTransaction[],
  personId: string | null,
): CategorySpendingTransaction[] {
  return personId === null
    ? transactions
    : transactions.filter((transaction) => transaction.person.id === personId);
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

// The expense-type choice the analysis views offer. `all` keeps every
// transaction, so the pages read exactly as they did before the control existed.
export type ExpenseTypeChoice = 'all' | 'recurring' | 'one-time';

// Selects the transactions an expense-type choice admits before a view groups or
// averages them. `all` returns the input unchanged. A typed choice keeps only the
// transactions whose category carries exactly that expense type, so unset
// categories and uncategorised transactions drop out. Selection only: no stored
// data changes and the returned array is the same array for `all`.
export function filterTransactionsByExpenseType(
  transactions: CategorySpendingTransaction[],
  choice: ExpenseTypeChoice,
): CategorySpendingTransaction[] {
  if (choice === 'all') {
    return transactions;
  }
  return transactions.filter(({ category }) => category?.expenseType === choice);
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
  const monthlyTotals = months.map(({ groups, ...month }) => ({
    ...month,
    totals: getCategorySpendingTotals(groups),
  }));
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

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function isMonthKey(value: string): boolean {
  return MONTH_KEY_PATTERN.test(value);
}

// The twelve calendar months of a year, oldest first. The keys are the
// `YYYY-MM` values the page carries in its query.
export function getCalendarYearMonths(year: number): CalendarMonth[] {
  if (!Number.isInteger(year)) {
    throw new Error('calendar year must be an integer');
  }

  return Array.from({ length: 12 }, (_, index) => {
    const monthNumber = index + 1;
    const key = `${String(year).padStart(4, '0')}-${String(monthNumber).padStart(2, '0')}`;
    const date = new Date(Date.UTC(year, index, 1));
    const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();

    return {
      key,
      label: new Intl.DateTimeFormat('en', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(date),
      startDate: `${key}-01`,
      endDate: `${key}-${String(lastDay).padStart(2, '0')}`,
    };
  });
}

// The years the year control offers: every year represented by an included
// returned transaction, the current year, and the supplied month's year when it
// is well formed. Hidden-category transactions do not represent a year.
export function getAvailableYears(
  transactions: CategorySpendingTransaction[],
  today: string,
  selectedMonth?: string,
): number[] {
  const years = new Set<number>();
  const currentYear = Number(today.slice(0, 4));
  if (Number.isInteger(currentYear)) {
    years.add(currentYear);
  }

  for (const { bookingDate } of excludeHiddenCategoryTransactions(transactions)) {
    const year = Number(bookingDate.slice(0, 4));
    if (Number.isInteger(year)) {
      years.add(year);
    }
  }

  if (selectedMonth !== undefined && isMonthKey(selectedMonth)) {
    years.add(Number(selectedMonth.slice(0, 4)));
  }

  return [...years].sort((left, right) => right - left);
}

// The selected month is the query value when it is a well-formed `YYYY-MM`.
// Otherwise the current month wins when the returned transactions include it,
// then the newest represented month, then the current month.
export function resolveSelectedMonth(
  value: unknown,
  transactions: CategorySpendingTransaction[],
  today: string,
): string {
  if (typeof value === 'string' && isMonthKey(value)) {
    return value;
  }

  const currentMonth = today.slice(0, 7);
  const visible = excludeHiddenCategoryTransactions(transactions);
  if (visible.some(({ bookingDate }) => bookingDate.slice(0, 7) === currentMonth)) {
    return currentMonth;
  }

  const representedMonths = visible
    .map(({ bookingDate }) => bookingDate.slice(0, 7))
    .filter(isMonthKey)
    .sort();
  return representedMonths[representedMonths.length - 1] ?? currentMonth;
}

export function filterTransactionsByMonth(
  transactions: CategorySpendingTransaction[],
  month: string,
): CategorySpendingTransaction[] {
  return transactions.filter(({ bookingDate }) => bookingDate.slice(0, 7) === month);
}

function compareBreakdownEntries(
  left: CategorySpendingTotal,
  right: CategorySpendingTotal,
): number {
  const byAmount = compareDecimalStrings(right.amount, left.amount);
  if (byAmount !== 0) {
    return byAmount;
  }

  const byName = left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
  if (byName !== 0) {
    return byName;
  }

  return left.key < right.key ? -1 : left.key > right.key ? 1 : 0;
}

// The selected month's categories after hidden-category exclusion. Every
// category keeps its exact absolute total and its transaction count; the eight
// largest stay separate for the stacked bar and the rest aggregate into one
// `Other N` entry. The table uses `entries`, not `top`.
export function getCategoryBreakdown(
  transactions: CategorySpendingTransaction[],
): CategoryBreakdown {
  const groups = new Map<string, {
    name: string;
    transactionCount: number;
    amounts: string[];
  }>();

  for (const transaction of excludeHiddenCategoryTransactions(transactions)) {
    const key = transaction.category === null ? 'uncategorised' : `category:${transaction.category.id}`;
    let group = groups.get(key);
    if (group === undefined) {
      group = {
        name: transaction.category?.name ?? 'Uncategorised',
        transactionCount: 0,
        amounts: [],
      };
      groups.set(key, group);
    }
    group.transactionCount += 1;
    group.amounts.push(transaction.amount);
  }

  const entries = [...groups.entries()]
    .map(([key, group]) => ({
      key,
      name: group.name,
      amount: sumAbsoluteAmountStrings(group.amounts),
      transactions: group.transactionCount,
    }))
    .sort(compareBreakdownEntries);

  const top = entries.slice(0, 8);
  const remaining = entries.slice(8);
  const other = remaining.length === 0
    ? null
    : {
      key: 'other',
      name: `Other ${remaining.length}`,
      amount: sumAbsoluteAmountStrings(remaining.map(({ amount }) => amount)),
      transactions: remaining.reduce((count, entry) => count + entry.transactions, 0),
    };

  return {
    entries,
    top,
    other,
    total: sumAbsoluteAmountStrings(entries.map(({ amount }) => amount)),
    transactionCount: entries.reduce((count, entry) => count + entry.transactions, 0),
  };
}

// A percentage of the largest category amount, used only for the share bar.
// Displayed amounts stay exact strings; this value only controls a width.
export function getCategorySharePercent(amount: string, largestAmount: string): number {
  const amountDecimal = parseDecimal(amount);
  const largestDecimal = parseDecimal(largestAmount);
  if (amountDecimal.coefficient <= 0n || largestDecimal.coefficient <= 0n) {
    return 0;
  }

  const commonScale = Math.max(amountDecimal.scale, largestDecimal.scale);
  const amountCoefficient = amountDecimal.coefficient * powerOfTen(commonScale - amountDecimal.scale);
  const largestCoefficient = largestDecimal.coefficient * powerOfTen(commonScale - largestDecimal.scale);
  const precision = 1_000_000n;
  const ratio = (amountCoefficient * precision + largestCoefficient / 2n) / largestCoefficient;

  return Math.min(100, Math.round(Number(ratio) / 100) / 100);
}

export function getLocalDateString(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
