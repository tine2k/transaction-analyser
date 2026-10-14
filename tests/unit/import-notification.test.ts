// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  notificationConfigFromEnv,
  notifyImport,
  sendTestNotification,
  uncategorisedSummary,
} from '../../shared/import-notification';
import type { ImportPlan } from '../../shared/transactions-import';

function plan(overrides: Partial<ImportPlan> = {}): ImportPlan {
  return {
    rowsRead: 6,
    rowsAlreadyStored: 0,
    rowsWritten: 6,
    rowsCategorised: 4,
    newRows: [],
    ...overrides,
  };
}

function configured(overrides: Record<string, unknown> = {}) {
  return { token: 'app-token', user: 'user-key', ...overrides };
}

type RecordedRequest = { url: string; init: RequestInit | undefined };

function recordingFetch(requests: RecordedRequest[], answer: () => Response): typeof fetch {
  return async (input, init) => {
    requests.push({ url: String(input), init: init ?? undefined });
    return answer();
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('uncategorisedSummary', () => {
  it('states the written, categorised, and uncategorised counts', () => {
    expect(uncategorisedSummary(plan())).toEqual({
      title: '2 new transactions need a category',
      message: '6 new: 4 categorised, 2 without a category.',
    });
  });

  it('uses the singular when one transaction is uncategorised', () => {
    expect(uncategorisedSummary(plan({ rowsWritten: 1, rowsCategorised: 0 }))?.title).toBe(
      '1 new transaction needs a category',
    );
  });

  it('has nothing to say when every written row received a category', () => {
    expect(uncategorisedSummary(plan({ rowsWritten: 6, rowsCategorised: 6 }))).toBeNull();
  });

  it('has nothing to say when the run wrote no row', () => {
    expect(uncategorisedSummary(plan({ rowsWritten: 0, rowsCategorised: 0 }))).toBeNull();
  });

  it('has nothing to say for a non-writing plan that would have written rows', () => {
    expect(
      uncategorisedSummary(plan({ rowsRead: 6, rowsAlreadyStored: 0, rowsWritten: 0, rowsCategorised: 0 })),
    ).toBeNull();
  });
});

describe('notificationConfigFromEnv', () => {
  it('reads the token, the user key, and the base URL override', () => {
    expect(
      notificationConfigFromEnv({
        PUSHOVER_TOKEN: 'app-token',
        PUSHOVER_USER: 'user-key',
        PUSHOVER_BASE_URL: 'http://127.0.0.1:1234',
      }),
    ).toEqual({ token: 'app-token', user: 'user-key', baseUrl: 'http://127.0.0.1:1234' });
  });

  it('treats absent credentials as unset', () => {
    expect(notificationConfigFromEnv({})).toEqual({ token: null, user: null, baseUrl: undefined });
  });

  it('treats an empty base URL override as unset', () => {
    expect(notificationConfigFromEnv({ PUSHOVER_BASE_URL: '' }).baseUrl).toBeUndefined();
  });
});

describe('notifyImport', () => {
  it('posts the credentials and the summary to the messages endpoint', async () => {
    const requests: RecordedRequest[] = [];
    const fetchImpl = recordingFetch(requests, () => jsonResponse({ status: 1 }));

    const outcome = await notifyImport(
      configured({ baseUrl: 'http://pushover.test/', fetchImpl }),
      plan(),
    );

    expect(outcome).toEqual({ status: 'sent' });
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe('http://pushover.test/1/messages.json');
    expect(requests[0]?.init?.method).toBe('POST');
    const body = new URLSearchParams(String(requests[0]?.init?.body));
    expect(body.get('token')).toBe('app-token');
    expect(body.get('user')).toBe('user-key');
    expect(body.get('title')).toBe('2 new transactions need a category');
    expect(body.get('message')).toBe('6 new: 4 categorised, 2 without a category.');
  });

  it('returns failed with the status and the listed errors when Pushover refuses', async () => {
    const requests: RecordedRequest[] = [];
    const fetchImpl = recordingFetch(requests, () =>
      jsonResponse({ status: 0, errors: ['rate limit exceeded'] }, 429),
    );

    const outcome = await notifyImport(configured({ fetchImpl }), plan());

    expect(outcome.status).toBe('failed');
    expect(outcome).toHaveProperty('reason', expect.stringContaining('429'));
    expect(outcome).toHaveProperty('reason', expect.stringContaining('rate limit exceeded'));
  });

  it('returns failed when the request cannot be made', async () => {
    const fetchImpl: typeof fetch = async () => {
      throw new Error('connect ECONNREFUSED');
    };

    const outcome = await notifyImport(configured({ fetchImpl }), plan());

    expect(outcome.status).toBe('failed');
    expect(outcome).toHaveProperty('reason', expect.stringContaining('ECONNREFUSED'));
  });

  it('returns failed within the timeout when the request outlives it', async () => {
    const fetchImpl: typeof fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted due to timeout', 'TimeoutError'));
        });
      });

    const outcome = await notifyImport(configured({ fetchImpl, timeoutMs: 20 }), plan());

    expect(outcome.status).toBe('failed');
    expect(outcome).toHaveProperty('reason', expect.stringContaining('timeout'));
  });

  it('skips without calling fetch when the credentials are absent', async () => {
    const fetchImpl: typeof fetch = async () => {
      throw new Error('fetch must not be called');
    };

    const outcome = await notifyImport({ token: null, user: null, fetchImpl }, plan());

    expect(outcome).toEqual({ status: 'skipped' });
  });

  it('skips without calling fetch when the run has nothing uncategorised', async () => {
    const fetchImpl: typeof fetch = async () => {
      throw new Error('fetch must not be called');
    };

    const outcome = await notifyImport(
      configured({ fetchImpl }),
      plan({ rowsWritten: 2, rowsCategorised: 2 }),
    );

    expect(outcome).toEqual({ status: 'skipped' });
  });
});

describe('sendTestNotification', () => {
  it('posts the credentials and the test text to the messages endpoint', async () => {
    const requests: RecordedRequest[] = [];
    const fetchImpl = recordingFetch(requests, () => jsonResponse({ status: 1 }));

    const outcome = await sendTestNotification(
      configured({ baseUrl: 'http://pushover.test/', fetchImpl }),
    );

    expect(outcome).toEqual({ status: 'sent' });
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe('http://pushover.test/1/messages.json');
    expect(requests[0]?.init?.method).toBe('POST');
    const body = new URLSearchParams(String(requests[0]?.init?.body));
    expect(body.get('token')).toBe('app-token');
    expect(body.get('user')).toBe('user-key');
    expect(body.get('title')?.toLowerCase()).toContain('test');
    expect(body.get('message')?.toLowerCase()).toContain('test');
    expect(body.get('message')).not.toContain('categorised');
  });

  it('returns failed with the status and the listed errors when Pushover refuses', async () => {
    const fetchImpl = recordingFetch([], () =>
      jsonResponse({ status: 0, errors: ['application token is invalid'] }, 400),
    );

    const outcome = await sendTestNotification(configured({ fetchImpl }));

    expect(outcome.status).toBe('failed');
    expect(outcome).toHaveProperty('reason', expect.stringContaining('400'));
    expect(outcome).toHaveProperty('reason', expect.stringContaining('application token is invalid'));
  });

  it('returns failed when the request cannot be made', async () => {
    const fetchImpl: typeof fetch = async () => {
      throw new Error('connect ECONNREFUSED');
    };

    const outcome = await sendTestNotification(configured({ fetchImpl }));

    expect(outcome.status).toBe('failed');
    expect(outcome).toHaveProperty('reason', expect.stringContaining('ECONNREFUSED'));
  });

  it('returns failed within the timeout when the request outlives it', async () => {
    const fetchImpl: typeof fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted due to timeout', 'TimeoutError'));
        });
      });

    const outcome = await sendTestNotification(configured({ fetchImpl, timeoutMs: 20 }));

    expect(outcome.status).toBe('failed');
    expect(outcome).toHaveProperty('reason', expect.stringContaining('timeout'));
  });

  it('skips without calling fetch when the credentials are absent', async () => {
    const fetchImpl: typeof fetch = async () => {
      throw new Error('fetch must not be called');
    };

    const outcome = await sendTestNotification({ token: null, user: null, fetchImpl });

    expect(outcome).toEqual({ status: 'skipped' });
  });

  it('names no credential in a failure reason', async () => {
    const fetchImpl = recordingFetch([], () =>
      jsonResponse({ status: 0, errors: ['application token is invalid'] }, 400),
    );

    const outcome = await sendTestNotification(configured({ fetchImpl }));

    expect(outcome).toHaveProperty('reason', expect.not.stringContaining('app-token'));
    expect(outcome).toHaveProperty('reason', expect.not.stringContaining('user-key'));
  });
});
