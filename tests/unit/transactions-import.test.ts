// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  ImportFailure,
  checkHeader,
  decodeStrictUtf8,
  parseCsvText,
  planWrites,
  redact,
  validateRecords,
} from '../../shared/transactions-import';

const HEADER = 'Date;Value date;Category;Name;Purpose;Account;Bank;Amount;Currency';

function csv(...lines: string[]): string {
  return [HEADER, ...lines].join('\n') + '\n';
}

async function validated(text: string) {
  const records = await parseCsvText(text);
  checkHeader(records[0]!.fields);
  return validateRecords(records.slice(1));
}

describe('transaction CSV parsing and validation', () => {
  it('rejects a header that is not the expected one', async () => {
    const records = await parseCsvText('Date;Amount\n');

    expect(() => checkHeader(records[0]!.fields)).toThrow(ImportFailure);
    expect(() => checkHeader(records[0]!.fields)).toThrow(/not one this import recognises/);
  });

  it('skips blank lines and counts the physical line number of every data row', async () => {
    const result = await validated(csv(
      '25.09.2026;25.09.2026;;REWE;REWE Market;;;-12,50;EUR',
      '',
      '26.09.2026;26.09.2026;;Transit;Rail ticket;;;-4,80;EUR',
    ));

    expect(result.errors).toEqual([]);
    expect(result.dataRowCount).toBe(2);
    expect(result.rows.map((row) => row.line)).toEqual([2, 4]);
  });

  it('keeps a quoted delimiter and a doubled quote inside the purpose line', async () => {
    const result = await validated(csv(
      '25.09.2026;25.09.2026;;Shop;"Bought milk; bread, and ""cheese""";;;-9,99;EUR',
    ));

    expect(result.rows[0]?.purpose).toBe('Bought milk; bread, and "cheese"');
  });

  it('strips surrounding whitespace from every field', async () => {
    const result = await validated(csv(
      ' 25.09.2026 ; 25.09.2026 ;; Shop ; Purpose ;;; -9,99 ; EUR ',
    ));

    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toMatchObject({
      bookingDate: '2026-09-25',
      valueDate: '2026-09-25',
      amount: '-9.99',
      counterpartyName: 'Shop',
      purpose: 'Purpose',
    });
  });

  it('rejects a date in any other order and a day that is not on the calendar', async () => {
    const wrongOrder = await validated(csv('2026-09-25;2026-09-25;;Shop;Purpose;;;-9,99;EUR'));
    const impossible = await validated(csv('31.02.2026;31.02.2026;;Shop;Purpose;;;-9,99;EUR'));

    expect(wrongOrder.errors[0]?.reason).toMatch(/DD\.MM\.YYYY/);
    expect(impossible.errors[0]?.reason).toMatch(/not on the calendar/);
  });

  it('reads the booking date and the value date independently', async () => {
    const result = await validated(csv('02.03.2026;01.03.2026;;Shop;Purpose;;;-9,99;EUR'));

    expect(result.rows[0]).toMatchObject({ bookingDate: '2026-03-02', valueDate: '2026-03-01' });
  });

  it('normalises amounts to exactly what the file states', async () => {
    const cases = [
      { amount: '-33,61', stored: '-33.61' },
      { amount: '250,00', stored: '250.00' },
      { amount: '-1.234,56', stored: '-1234.56' },
      { amount: '0,01', stored: '0.01' },
    ];

    for (const testCase of cases) {
      const result = await validated(csv(`25.09.2026;25.09.2026;;Shop;Purpose;;;${testCase.amount};EUR`));
      expect(result.rows[0]?.amount).toBe(testCase.stored);
    }
  });

  it('rejects a zero amount and text in the amount column', async () => {
    const zero = await validated(csv('25.09.2026;25.09.2026;;Shop;Purpose;;;0,00;EUR'));
    const text = await validated(csv('25.09.2026;25.09.2026;;Shop;Purpose;;;-33.61 EUR;EUR'));

    expect(zero.errors[0]?.reason).toMatch(/zero/);
    expect(text.errors[0]?.reason).toMatch(/not a number/);
  });

  it('accepts only EUR and names the currency it found', async () => {
    const foreign = await validated(csv('25.09.2026;25.09.2026;;Shop;Purpose;;;-9,99;USD'));
    const missing = await validated(csv('25.09.2026;25.09.2026;;Shop;Purpose;;;-9,99;'));

    expect(foreign.errors[0]?.reason).toMatch(/USD/);
    expect(missing.errors[0]?.reason).toMatch(/no currency/);
  });

  it('rejects an empty name or purpose and a row with the wrong field count', async () => {
    const emptyName = await validated(csv('25.09.2026;25.09.2026;;;Purpose;;;-9,99;EUR'));
    const emptyPurpose = await validated(csv('25.09.2026;25.09.2026;;Shop;;;;-9,99;EUR'));
    const shortRow = await validated(csv('25.09.2026;25.09.2026;;Shop;Purpose;;-9,99;EUR'));

    expect(emptyName.errors[0]?.reason).toMatch(/Name is empty/);
    expect(emptyPurpose.errors[0]?.reason).toMatch(/Purpose is empty/);
    expect(shortRow.errors[0]?.reason).toMatch(/8 fields where the header names 9/);
  });

  it('reports every invalid row rather than stopping at the first', async () => {
    const result = await validated(csv(
      '25.09.2026;25.09.2026;;Shop;Purpose;;;0,00;EUR',
      '2026-09-25;25.09.2026;;Shop;Purpose;;;-9,99;EUR',
      '25.09.2026;25.09.2026;;Shop;Purpose;;;-9,99;CHF',
    ));

    expect(result.errors).toHaveLength(3);
    expect(result.errors.map((error) => error.line)).toEqual([2, 3, 4]);
  });

  it('rejects a byte sequence that is not valid UTF-8', () => {
    expect(() => decodeStrictUtf8(new Uint8Array([0xff, 0xfe]), 'statement.csv'))
      .toThrow(/not valid UTF-8/);
  });

  it('removes a credential from a connection string in a message', () => {
    expect(redact('could not connect to postgres://user:secret@host:5432/db'))
      .toBe('could not connect to postgres://[redacted]@host:5432/db');
  });
});

describe('dedupe allocation', () => {
  it('writes every row when the table holds none', () => {
    const plan = planWrites(new Map([['a', 2]]), new Map());

    expect(plan.alreadyStored).toBe(0);
    expect([...plan.toWrite]).toEqual([['a', 2]]);
  });

  it('writes only the surplus over what the table holds', () => {
    const plan = planWrites(new Map([['a', 2]]), new Map([['a', 1]]));

    expect(plan.alreadyStored).toBe(1);
    expect([...plan.toWrite]).toEqual([['a', 1]]);
  });

  it('writes nothing when the table already holds the file count or more', () => {
    const exact = planWrites(new Map([['a', 2]]), new Map([['a', 2]]));
    const more = planWrites(new Map([['a', 1]]), new Map([['a', 5]]));

    expect(exact.alreadyStored).toBe(2);
    expect([...exact.toWrite]).toEqual([]);
    expect(more.alreadyStored).toBe(1);
    expect([...more.toWrite]).toEqual([]);
  });
});
