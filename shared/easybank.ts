// The Easybank web-banking client: login, the Giro account's transaction list,
// paging, and the booking-text mapping. It uses plain HTTP with a small cookie
// jar and cheerio, and touches only the actions the bank leaves open to an
// unattended client: the login, the transaction list, and its next-page control.
// The CSV export and the transaction search panel are deliberately not used,
// because both demand confirmation in the easybank app.
//
// The list has no separate counterparty columns, so each row's booking text is
// mapped to a counterparty and a purpose. A line holding an IBAN yields the
// counterparty account and the name after it; without an IBAN the first line is
// the name and the later lines the purpose. Both are always non-empty.
//
// See openspec/changes/add-easybank-sync/specs/easybank-sync/spec.md
import * as cheerio from 'cheerio';
import { ImportFailure, validateRow } from './transactions-import.ts';
import type { ImportRow } from './transactions-import.ts';

const DEFAULT_BASE_URL = 'https://ebanking.easybank.at';
const LOGIN_PATH = '/InternetBanking/InternetBanking?d=login&svc=EASYBANK&ui=html&lang=de';
const MAX_PAGES = 200;
const IBAN = /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/;

type CheerioAPI = ReturnType<typeof cheerio.load>;
type CookieJar = Map<string, string>;

export type EasybankClientOptions = {
  user: string;
  pin: string;
  from: string;
  to: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
};

function storeCookies(jar: CookieJar, response: Response): void {
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(';', 1)[0] ?? '';
    const separator = pair.indexOf('=');
    if (separator > 0) {
      jar.set(pair.slice(0, separator).trim(), pair.slice(separator + 1).trim());
    }
  }
}

// Follows redirects by hand, because Node's fetch does not apply a redirect
// response's Set-Cookie headers, and the bank's login answer is exactly that: a
// 302 that carries the session cookies and points at the overview. Each hop's
// cookies are stored and sent on the next request, and a 301/302/303 turns a POST
// into the GET the bank expects.
async function request(
  jar: CookieJar,
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  let currentUrl = url;
  let method = init.method ?? 'GET';
  let body = init.body;
  const baseHeaders = init.headers;

  for (let hop = 0; hop < 10; hop += 1) {
    const headers = new Headers(baseHeaders);
    const cookie = [...jar].map(([name, value]) => `${name}=${value}`).join('; ');
    if (cookie !== '') {
      headers.set('cookie', cookie);
    }
    const response = await fetchImpl(currentUrl, {
      method,
      body,
      headers,
      redirect: 'manual',
    });
    storeCookies(jar, response);

    if (response.status < 300 || response.status >= 400) {
      return response;
    }
    const location = response.headers.get('location');
    await response.body?.cancel().catch(() => undefined);
    if (location === null) {
      return response;
    }
    currentUrl = new URL(location, currentUrl).toString();
    if (response.status === 301 || response.status === 302 || response.status === 303) {
      method = 'GET';
      body = undefined;
    }
  }

  throw new ImportFailure('the bank redirected too many times');
}

function formOf($: CheerioAPI, name: string): { action: string; fields: Record<string, string> } {
  const form = $(`form[name="${name}"]`);
  if (form.length === 0) {
    throw new ImportFailure('the bank page did not carry the form the sync expected');
  }
  const fields: Record<string, string> = {};
  form.find('input').each((_, input) => {
    const fieldName = $(input).attr('name');
    if (fieldName !== undefined && fieldName !== '') {
      fields[fieldName] = $(input).attr('value') ?? '';
    }
  });
  return { action: form.attr('action') ?? '', fields };
}

async function postForm(
  jar: CookieJar,
  fetchImpl: typeof fetch,
  baseUrl: string,
  action: string,
  fields: Record<string, string>,
): Promise<string> {
  const response = await request(jar, fetchImpl, new URL(action, baseUrl).toString(), {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields).toString(),
  });
  if (!response.ok) {
    throw new ImportFailure(`the bank answered ${response.status} to the sync`);
  }
  return response.text();
}

function giroAccountId($: CheerioAPI): string | null {
  const onclick = $('#PART_GIRO_EUR')
    .find('[onclick*="navigateToDestinationPage"]')
    .first()
    .attr('onclick') ?? '';
  const match = /navigateToDestinationPage\(\s*'transactions'\s*,\s*'(\d+)'\s*\)/.exec(onclick);
  return match === null ? null : match[1]!;
}

// Maps a booking text's lines to the counterparty and the purpose. The rules are
// the hybrid the bank's own export follows: an IBAN names the counterparty and the
// text before it is the purpose; without an IBAN the first line is the name and
// the rest the purpose. Both results are always non-empty.
export function mapBookingText(lines: string[]): { name: string; purpose: string; account: string | null } {
  const whole = lines.join('\n').trim();
  const ibanIndex = lines.findIndex((line) => IBAN.test(line));

  if (ibanIndex >= 0) {
    const line = lines[ibanIndex]!;
    const match = IBAN.exec(line)!;
    const account = match[0];
    const after = line.slice(match.index + account.length).trim();
    const name = [after, ...lines.slice(ibanIndex + 1)].filter((part) => part !== '').join(' ').trim();
    const before = lines.slice(0, ibanIndex).join('\n').trim();
    return {
      name: name !== '' ? name : whole,
      purpose: before !== '' ? before : whole,
      account,
    };
  }

  const name = lines[0] ?? '';
  const purpose = lines.slice(1).join('\n').trim();
  return { name, purpose: purpose !== '' ? purpose : name, account: null };
}

function bookingTextLines($: CheerioAPI, html: string): string[] {
  const withBreaks = html.replace(/<br\s*\/?>/gi, '\n');
  return $('<div>').html(withBreaks).text()
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line !== '');
}

function parseRows($: CheerioAPI, page: number): ImportRow[] {
  const rows: ImportRow[] = [];
  $('#exchange-details tbody tr').each((index, element) => {
    const cells = $(element).find('td');
    if (cells.length < 10) {
      return;
    }
    const lines = bookingTextLines($, $(cells[3]).html() ?? '');
    const mapped = mapBookingText(lines);
    const fields = [
      $(cells[1]).text(),
      $(cells[5]).text(),
      '',
      mapped.name,
      mapped.purpose,
      mapped.account ?? '',
      '',
      $(cells[9]).text(),
      'EUR',
    ];
    const line = (page - 1) * 30 + index + 1;
    const outcome = validateRow(fields, line);
    if ('reason' in outcome) {
      throw new ImportFailure(`the bank's row ${line} could not be read: ${outcome.reason}`);
    }
    rows.push(outcome);
  });
  return rows;
}

// Logs in, opens the Giro account's transaction list, and reads pages until the
// window is covered. Returns only the rows inside the window, oldest last.
export async function retrieveGiroTransactions(options: EasybankClientOptions): Promise<ImportRow[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const jar: CookieJar = new Map();

  const loginResponse = await request(jar, fetchImpl, new URL(LOGIN_PATH, baseUrl).toString());
  if (!loginResponse.ok) {
    throw new ImportFailure(`the bank answered ${loginResponse.status} to the login page`);
  }
  const login = formOf(cheerio.load(await loginResponse.text()), 'loginForm');
  login.fields['dn'] = options.user;
  login.fields['pin'] = options.pin;
  const overviewHtml = await postForm(jar, fetchImpl, baseUrl, login.action, login.fields);
  const overview = cheerio.load(overviewHtml);
  if (overview('#financeoverview').length === 0 && overview('#PART_GIRO_EUR').length === 0) {
    const error = overview('#error_part_text').text().trim();
    throw new ImportFailure(error !== '' ? `the bank refused the login: ${error}` : 'the bank did not answer with the finance overview after login');
  }

  const accountId = giroAccountId(overview);
  if (accountId === null) {
    throw new ImportFailure('the finance overview carried no Giro account');
  }
  const navigation = formOf(overview, 'financeOverviewForm');
  navigation.fields['d'] = 'transactions';
  navigation.fields['activeaccount'] = accountId;

  let html = await postForm(jar, fetchImpl, baseUrl, navigation.action, navigation.fields);
  const rows: ImportRow[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const $page = cheerio.load(html);
    const pageRows = parseRows($page, page);
    if (pageRows.length === 0) {
      break;
    }
    rows.push(...pageRows);

    const oldest = pageRows.reduce(
      (minimum, row) => (row.bookingDate < minimum ? row.bookingDate : minimum),
      pageRows[0]!.bookingDate,
    );
    if (oldest < options.from) {
      break;
    }

    // The last page still carries the next-page control, and asking for a page
    // past the end answers with the last page again. The page number the answer
    // reports is therefore the signal that the list is exhausted: if it did not
    // advance, there is no further page.
    const requested = page + 1;
    const search = formOf($page, 'transactionSearchForm');
    search.fields['pagenumber'] = String(requested);
    const nextHtml = await postForm(jar, fetchImpl, baseUrl, search.action, search.fields);
    const returned = Number(cheerio.load(nextHtml)('input[name="pagenumber"]').attr('value') ?? '0');
    if (returned !== requested) {
      break;
    }
    html = nextHtml;
  }

  return rows.filter((row) => row.bookingDate >= options.from && row.bookingDate <= options.to);
}
