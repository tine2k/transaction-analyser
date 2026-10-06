// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mapBookingText, retrieveGiroTransactions } from '../../shared/easybank';
import { applyValueDateFloor } from '../../shared/easybank-sync';
import type { ImportRow } from '../../shared/transactions-import';
import { startFakeBank, type FakeBank } from '../helpers/fake-bank';

describe('booking text mapping', () => {
  it('maps an IBAN line to the account, the name after it, and the purpose before it', () => {
    expect(
      mapBookingText(['Abbuchung Dauerauftrag', 'AT611904300234573201 Schmid Immobilien Management']),
    ).toEqual({
      name: 'Schmid Immobilien Management',
      purpose: 'Abbuchung Dauerauftrag',
      account: 'AT611904300234573201',
    });
  });

  it('keeps a bank code out of the name when one precedes the IBAN', () => {
    expect(
      mapBookingText(['Netflix BG/123', 'BAWAATWWXXX AT611904300234573201 Mag. Hanna Maier']),
    ).toEqual({
      name: 'Mag. Hanna Maier',
      purpose: 'Netflix BG/123',
      account: 'AT611904300234573201',
    });
  });

  it('appends the later lines to the name after an IBAN', () => {
    const mapped = mapBookingText(['Purpose', 'AT611904300234573201 First', 'Second line']);

    expect(mapped.name).toBe('First Second line');
    expect(mapped.purpose).toBe('Purpose');
    expect(mapped.account).toBe('AT611904300234573201');
  });

  it('uses the first line as the name and the rest as the purpose without an IBAN', () => {
    expect(mapBookingText(['Bezahlung Karte MC/0001', 'POS 56,50', 'TRATTORIA'])).toEqual({
      name: 'Bezahlung Karte MC/0001',
      purpose: 'POS 56,50\nTRATTORIA',
      account: null,
    });
  });

  it('uses a single line as both the name and the purpose', () => {
    expect(mapBookingText(['Zinsen HABEN BG/1'])).toEqual({
      name: 'Zinsen HABEN BG/1',
      purpose: 'Zinsen HABEN BG/1',
      account: null,
    });
  });

  it('falls back to the whole text when the IBAN is on the first line', () => {
    const mapped = mapBookingText(['AT611904300234573201 Name', 'later']);

    expect(mapped.name).toBe('Name later');
    expect(mapped.purpose).toBe('AT611904300234573201 Name\nlater');
  });

  it('falls back to the whole text when nothing follows the IBAN', () => {
    const mapped = mapBookingText(['Purpose', 'AT611904300234573201']);

    expect(mapped.name).toBe('Purpose\nAT611904300234573201');
    expect(mapped.purpose).toBe('Purpose');
    expect(mapped.account).toBe('AT611904300234573201');
  });
});

describe('value-date floor', () => {
  function row(valueDate: string, bookingDate = '2026-10-01'): ImportRow {
    return {
      line: 1,
      bookingDate,
      valueDate,
      amount: '-1.00',
      purpose: 'Purchase',
      counterpartyName: 'Shop',
      counterpartyAccount: null,
    };
  }

  it('excludes a value date before the floor and keeps one on or after it', () => {
    const kept = applyValueDateFloor([
      row('2026-09-19'),
      row('2026-09-20'),
      row('2026-09-21'),
      row('2026-10-05'),
    ]);

    expect(kept.map((entry) => entry.valueDate)).toEqual(['2026-09-21', '2026-10-05']);
  });

  it('decides by the value date, not the booking date', () => {
    const kept = applyValueDateFloor([
      row('2026-09-20', '2026-10-01'),
      row('2026-09-21', '2026-09-01'),
    ]);

    expect(kept.map((entry) => entry.valueDate)).toEqual(['2026-09-21']);
  });
});

describe('easybank client', () => {
  let bank: FakeBank;

  beforeAll(async () => {
    bank = await startFakeBank();
  });

  beforeEach(() => {
    bank.mode = 'ok';
  });

  afterAll(async () => {
    await bank.close();
  });

  it('logs in, pages through the list, and keeps only the window', async () => {
    const rows = await retrieveGiroTransactions({
      user: 'user',
      pin: 'pin',
      from: '2026-07-01',
      to: '2026-10-31',
      baseUrl: bank.baseUrl,
    });

    expect(rows).toEqual([
      {
        line: 1,
        bookingDate: '2026-10-06',
        valueDate: '2026-10-05',
        amount: '-56.50',
        purpose: 'POS 56,50 380 D002 05.10. 21:19\nTRATTORIA DA LIDIA',
        counterpartyName: 'Bezahlung Karte MC/0001',
        counterpartyAccount: null,
      },
      {
        line: 2,
        bookingDate: '2026-10-04',
        valueDate: '2026-10-04',
        amount: '-9.99',
        purpose: 'Netflix BG/0002',
        counterpartyName: 'Mag. Hanna Maier',
        counterpartyAccount: 'AT611904300234573201',
      },
    ]);

    const login = bank.requests.find((request) => request.path === '/login-action');
    expect(login?.body).toContain('dn=user');
    expect(login?.body).toContain('pin=pin');
    const overview = bank.requests.find((request) => request.path === '/overview');
    expect(overview?.cookie).toContain('session=abc');
    const list = bank.requests.find((request) => request.path === '/list-action');
    expect(list?.body).toContain('activeaccount=12345');
    expect(bank.requests.some((request) => request.path === '/search-action' && request.body.includes('pagenumber=2'))).toBe(true);
  });

  it('reports a rejected login', async () => {
    bank.mode = 'rejected';

    await expect(
      retrieveGiroTransactions({ user: 'user', pin: 'wrong', from: '2026-07-01', to: '2026-10-31', baseUrl: bank.baseUrl }),
    ).rejects.toThrow(/refused the login/);
  });

  it('reports a missing Giro account', async () => {
    bank.mode = 'no-account';

    await expect(
      retrieveGiroTransactions({ user: 'user', pin: 'pin', from: '2026-07-01', to: '2026-10-31', baseUrl: bank.baseUrl }),
    ).rejects.toThrow(/no Giro account/);
  });
});
