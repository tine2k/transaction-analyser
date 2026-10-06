// A tiny fake Easybank web banking server for the client and sync tests. It
// serves the same shapes the real pages do: a login form, the finance overview
// with one Giro account, and transaction list pages with a next-page control. It
// never asks for a confirmation, because the real flow the sync uses does not.
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

export type FakeBankRequest = {
  method: string;
  path: string;
  body: string;
  cookie: string | null;
};

export type FakeBankMode = 'ok' | 'rejected' | 'no-account';

export type FakeBank = {
  baseUrl: string;
  requests: FakeBankRequest[];
  mode: FakeBankMode;
  close: () => Promise<void>;
};

const LOGIN_PAGE = `<!doctype html><html><body>
<form name="loginForm" method="post" action="/login-action">
  <input type="hidden" name="svc" value="EASYBANK">
  <input type="hidden" name="submitflag" value="true">
  <input type="hidden" name="d" value="login">
  <input type="hidden" name="grr" value="grr-token">
  <input type="text" name="dn" value="">
  <input type="password" name="pin" value="">
</form>
</body></html>`;

const OVERVIEW_PAGE = `<!doctype html><html><body>
<div id="financeoverview">
  <div id="PART_GIRO_EUR">
    <a onclick="navigateToDestinationPage('transactions', '12345');return false;">Gehaltskonto</a>
  </div>
  <div id="PART_CREDIT_CARD"></div>
</div>
<form name="financeOverviewForm" method="post" action="/list-action">
  <input type="hidden" name="svc" value="EASYBANK">
  <input type="hidden" name="d" value="">
  <input type="hidden" name="activeaccount" value="">
</form>
</body></html>`;

const NO_ACCOUNT_PAGE = '<!doctype html><html><body><div id="financeoverview"></div></body></html>';

const REJECTED_PAGE = '<!doctype html><html><body><span id="error_part_text">Anmeldung fehlgeschlagen</span></body></html>';

export function listRow(bookingDate: string, valueDate: string, bookingText: string, amount: string): string {
  const amountClass = amount.startsWith('-') ? 'amount-minus' : 'amount-plus';
  return (
    '<tr><td>&nbsp;</td>' +
    `<td>${bookingDate}</td><td>&nbsp;</td><td>${bookingText}</td><td>&nbsp;</td>` +
    `<td>${valueDate}</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>` +
    `<td class="${amountClass}">${amount}</td><td>&nbsp;</td><td class="receipt"></td><td>&nbsp;</td></tr>`
  );
}

export function listPage(rows: string[], next: boolean, page = 1): string {
  return `<!doctype html><html><body>
<table id="exchange-details"><tbody>${rows.join('')}</tbody></table>
<form name="transactionSearchForm" method="post" action="/search-action">
  <input type="hidden" name="svc" value="EASYBANK">
  <input type="hidden" name="d" value="transactions">
  <input type="hidden" name="pagenumber" value="${page}">
</form>
${next ? '<a class="next" href="#" onclick="return false;">weiter</a>' : ''}
</body></html>`;
}

export const DEFAULT_PAGES: string[] = [
  listPage(
    [
      listRow(
        '06.10.2026',
        '05.10.2026',
        'Bezahlung Karte MC/0001<br>POS 56,50 380 D002 05.10. 21:19<br>TRATTORIA DA LIDIA',
        '-56,50',
      ),
      listRow(
        '04.10.2026',
        '04.10.2026',
        'Netflix BG/0002<br>BAWAATWWXXX AT611904300234573201 Mag. Hanna Maier',
        '-9,99',
      ),
    ],
    true,
    1,
  ),
  // The last page still carries the next-page control, as the real one does; the
  // server answers a request beyond it with this same page.
  listPage(
    [
      listRow('30.06.2026', '30.06.2026', 'Alte Buchung<br>AT611904300234573201 Alt GmbH', '-1,00'),
    ],
    true,
    2,
  ),
];

export async function startFakeBank(pages: string[] = DEFAULT_PAGES): Promise<FakeBank> {
  const requests: FakeBankRequest[] = [];
  const state: { mode: FakeBankMode } = { mode: 'ok' };

  const server = createServer((request: IncomingMessage, response: ServerResponse) => {
    let body = '';
    request.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });
    request.on('end', () => {
      const path = request.url ?? '';
      requests.push({
        method: request.method ?? '',
        path,
        body,
        cookie: request.headers.cookie ?? null,
      });
      response.setHeader('content-type', 'text/html; charset=utf-8');

      if (request.method === 'GET' && path.includes('d=login')) {
        response.end(LOGIN_PAGE);
        return;
      }
      if (request.method === 'POST' && path === '/login-action') {
        if (state.mode === 'rejected') {
          response.end(REJECTED_PAGE);
          return;
        }
        // The real bank answers the login with a 302 that carries the session
        // cookies and points at the overview, which is why the client follows
        // redirects by hand.
        response.statusCode = 302;
        response.setHeader('set-cookie', 'session=abc; Path=/');
        response.setHeader('location', '/overview');
        response.end('');
        return;
      }
      if (request.method === 'GET' && path === '/overview') {
        response.end(state.mode === 'no-account' ? NO_ACCOUNT_PAGE : OVERVIEW_PAGE);
        return;
      }
      if (request.method === 'POST' && path === '/list-action') {
        response.end(pages[0]);
        return;
      }
      if (request.method === 'POST' && path === '/search-action') {
        const match = /pagenumber=(\d+)/.exec(body);
        const page = match === null ? 1 : Number(match[1]);
        response.end(pages[Math.min(Math.max(page - 1, 0), pages.length - 1)]);
        return;
      }

      response.statusCode = 404;
      response.end('not found');
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('the fake bank did not bind a port');
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    requests,
    get mode() {
      return state.mode;
    },
    set mode(value: FakeBankMode) {
      state.mode = value;
    },
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}
