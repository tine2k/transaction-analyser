// The import notification: after a sync run writes new transactions of which at
// least one received no category, it tells the operator through Pushover, so an
// unattended sync's uncategorised rows do not sit unnoticed. It is deliberately
// framework-free: it takes an import plan and a config, imports nothing from Nuxt
// or the application, and never throws, so a notification failure can never
// change the import that triggered it.
//
// The trigger and the counts come from the plan `importRows` already returns, so
// no extra query is needed: written minus categorised is the number of new
// transactions without a category. The credentials are read from the environment
// the caller passes, travel in the request body only, and never appear in a
// returned reason.
//
// See openspec/changes/add-import-notification/specs/import-notification/spec.md
import type { ImportPlan } from './transactions-import.ts';

export type ImportNotificationConfig = {
  token: string | null;
  user: string | null;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

export type ImportNotificationOutcome =
  | { status: 'sent' }
  | { status: 'skipped' }
  | { status: 'failed'; reason: string };

export type ImportNotificationSummary = { title: string; message: string };

const DEFAULT_BASE_URL = 'https://api.pushover.net';
const DEFAULT_TIMEOUT_MS = 10_000;

// Reads the Pushover credentials from the environment map the caller passes, so
// a command and the server read the same names and a test can supply its own
// map. The base URL override points the request at a test server, as
// EASYBANK_BASE_URL does for the bank; an empty value is treated as unset.
export function notificationConfigFromEnv(
  env: Record<string, string | undefined>,
): ImportNotificationConfig {
  const baseUrl = env['PUSHOVER_BASE_URL'];
  return {
    token: env['PUSHOVER_TOKEN'] ?? null,
    user: env['PUSHOVER_USER'] ?? null,
    baseUrl: baseUrl === undefined || baseUrl === '' ? undefined : baseUrl,
  };
}

// The summary a notification would carry, or null when there is nothing to say:
// a run that wrote no row, or one whose every written row received a category.
// Pure, so the trigger is testable without a network or a database.
export function uncategorisedSummary(plan: ImportPlan): ImportNotificationSummary | null {
  if (plan.rowsWritten === 0 || plan.rowsWritten === plan.rowsCategorised) {
    return null;
  }
  const uncategorised = plan.rowsWritten - plan.rowsCategorised;
  return {
    title:
      uncategorised === 1
        ? '1 new transaction needs a category'
        : `${uncategorised} new transactions need a category`,
    message: `${plan.rowsWritten} new: ${plan.rowsCategorised} categorised, ${uncategorised} without a category.`,
  };
}

function isConfigured(config: ImportNotificationConfig): boolean {
  return config.token !== null && config.token !== '' && config.user !== null && config.user !== '';
}

// The errors Pushover lists in a refused answer, when the answer carries them;
// an answer that is not its JSON shape contributes nothing. The text names no
// credential, so it is safe to return as the failure's reason.
function listedErrors(answer: unknown): string {
  const errors = (answer as { errors?: unknown } | null | undefined)?.errors;
  if (!Array.isArray(errors) || errors.length === 0) {
    return '';
  }
  return `: ${errors.map((entry) => String(entry)).join('; ')}`;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

// The reason a send failed, built from the error alone. A fetch failure's
// message names the URL, which carries no credential; the request body, which
// does, is never part of it.
function notificationFailure(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }
  const cause = (error as { cause?: unknown }).cause;
  if (cause instanceof Error && cause.message !== '') {
    return `${error.message} (${cause.message})`;
  }
  return error.message === '' ? error.name : error.message;
}

// Sends the run's summary when there is one and the credentials are configured,
// and reports what it did. Every failure is returned, never thrown, so the
// caller can log it and leave the import untouched. The request is bounded by
// its timeout so a Pushover that never answers cannot hold a screen-started
// sync's answer open.
export async function notifyImport(
  config: ImportNotificationConfig,
  plan: ImportPlan,
): Promise<ImportNotificationOutcome> {
  const summary = uncategorisedSummary(plan);
  if (summary === null || !isConfigured(config)) {
    return { status: 'skipped' };
  }

  const fetchImpl = config.fetchImpl ?? fetch;
  const baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
  const body = new URLSearchParams({
    token: config.token ?? '',
    user: config.user ?? '',
    title: summary.title,
    message: summary.message,
  });

  try {
    const response = await fetchImpl(`${baseUrl}/1/messages.json`, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(config.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });

    if (!response.ok) {
      return {
        status: 'failed',
        reason: `Pushover answered ${response.status}${listedErrors(await readJson(response))}`,
      };
    }

    const answer = await readJson(response);
    if ((answer as { status?: unknown } | null | undefined)?.status !== 1) {
      return { status: 'failed', reason: `Pushover answered no success${listedErrors(answer)}` };
    }

    return { status: 'sent' };
  } catch (error) {
    return { status: 'failed', reason: notificationFailure(error) };
  }
}
