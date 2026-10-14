// A tiny fake Pushover messages endpoint for the notification tests. It records
// every form-encoded request it receives and can answer a success, an error, or
// nothing at all, so the sync's trigger, its failure isolation, and its timeout
// can be exercised without the network.
import { createServer } from 'node:http';

export type FakePushoverRequest = {
  method: string;
  path: string;
  body: string;
};

export type FakePushoverMode = 'ok' | 'error' | 'hang';

export type FakePushover = {
  baseUrl: string;
  requests: FakePushoverRequest[];
  mode: FakePushoverMode;
  close: () => Promise<void>;
};

export async function startFakePushover(): Promise<FakePushover> {
  const requests: FakePushoverRequest[] = [];
  const state: { mode: FakePushoverMode } = { mode: 'ok' };

  const server = createServer((request, response) => {
    let body = '';
    request.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });
    request.on('end', () => {
      requests.push({
        method: request.method ?? '',
        path: request.url ?? '',
        body,
      });

      // The hang mode answers nothing, so a caller that does not bound its
      // request waits forever.
      if (state.mode === 'hang') {
        return;
      }

      response.setHeader('content-type', 'application/json');
      if (state.mode === 'error') {
        response.statusCode = 429;
        response.end(JSON.stringify({ status: 0, errors: ['rate limit exceeded'] }));
        return;
      }
      response.end(JSON.stringify({ status: 1 }));
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('the fake Pushover did not bind a port');
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    requests,
    get mode() {
      return state.mode;
    },
    set mode(value: FakePushoverMode) {
      state.mode = value;
    },
    close: () =>
      new Promise((resolve, reject) => {
        server.closeAllConnections();
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}
