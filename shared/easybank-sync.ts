// The Easybank sync, shared by the command-line command and the nightly task. It
// starts a run record, retrieves the Giro account's transactions, imports them
// through the same path as the manual CSV import, and finishes the record. A
// failure is recorded with a redacted reason; unset credentials record nothing,
// because an unconfigured sync is not a failed one. After the record is
// finished, a run that wrote uncategorised transactions sends a Pushover
// notification; its failure is logged and never changes the run's outcome.
//
// See openspec/changes/add-easybank-sync/specs/easybank-sync/spec.md
// and openspec/changes/add-import-notification/specs/import-notification/spec.md
import {
  ImportFailure,
  finishImportRun,
  importRows,
  redact,
  resolvePerson,
  setImportRunPerson,
  startImportRun,
} from './transactions-import.ts';
import type { Database, ImportPlan, ImportRow, ImportSourceKind, Person } from './transactions-import.ts';
import { notifyImport } from './import-notification.ts';
import type { ImportNotificationConfig } from './import-notification.ts';
import { retrieveGiroTransactions } from './easybank.ts';

// The person a sync imports into when EASYBANK_PERSON is absent or empty. The
// migration seeds this person, so an unconfigured sync has a target.
export const DEFAULT_PERSON = 'Default';

// The configured person's name. An absent or empty variable means `Default`; the
// name is trimmed here and resolved against the stored people by syncEasybank.
export function personFromEnv(env: Record<string, string | undefined>): string {
  const value = env['EASYBANK_PERSON']?.trim() ?? '';
  return value === '' ? DEFAULT_PERSON : value;
}

// The value date below which the sync imports nothing. The history already held
// ends on 2026-09-20, and the CSV export and the HTML mapping describe a transfer
// differently, so importing that history again would duplicate it. The floor is by
// value date, and a row it excludes is skipped rather than reported invalid and is
// not counted in the run.
export const IMPORTED_VALUE_DATE_FLOOR = '2026-09-21';

export function applyValueDateFloor(rows: ImportRow[]): ImportRow[] {
  return rows.filter((row) => row.valueDate >= IMPORTED_VALUE_DATE_FLOOR);
}

export type EasybankSyncOptions = {
  user: string | null;
  pin: string | null;
  person: string;
  from: string;
  to: string;
  dryRun: boolean;
  source: ImportSourceKind;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  notification?: ImportNotificationConfig;
};

export type EasybankSyncResult =
  | { status: 'unconfigured' }
  | { status: 'success'; runId: string; plan: ImportPlan; person: Person }
  | { status: 'failed'; runId: string; error: string };

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// The source a run is recorded under, taken from the task payload. The schedule
// passes no source, so its runs stay scheduled; the imports screen passes 'ui'.
export function syncSourceFromPayload(payload: Record<string, unknown>): ImportSourceKind {
  return payload['source'] === 'ui' ? 'ui' : 'scheduled';
}

// The default window reaches back to the start of the preceding calendar quarter,
// the widest range the bank's own search offers, so a night the server did not run
// is recovered by a later run.
export function defaultWindow(today: Date): { from: string; to: string } {
  const quarter = Math.floor(today.getMonth() / 3);
  const startMonth = quarter === 0 ? 9 : (quarter - 1) * 3;
  const year = quarter === 0 ? today.getFullYear() - 1 : today.getFullYear();
  return {
    from: `${year}-${String(startMonth + 1).padStart(2, '0')}-01`,
    to: toIsoDate(today),
  };
}

export async function syncEasybank(
  database: Database,
  options: EasybankSyncOptions,
): Promise<EasybankSyncResult> {
  if (options.user === null || options.user === '' || options.pin === null || options.pin === '') {
    return { status: 'unconfigured' };
  }

  const runId = await startImportRun(database, { source: options.source, nonWriting: options.dryRun });
  const configuredPerson =
    typeof options.person === 'string' && options.person.trim() !== '' ? options.person : DEFAULT_PERSON;

  try {
    // The person is resolved before the bank is read or any row is written. A run
    // that cannot resolve one is recorded as failed and carries no person.
    const person = await resolvePerson(database, configuredPerson);
    await setImportRunPerson(database, runId, person.id);

    const retrieved = await retrieveGiroTransactions({
      user: options.user,
      pin: options.pin,
      from: options.from,
      to: options.to,
      baseUrl: options.baseUrl,
      fetchImpl: options.fetchImpl,
    });
    const rows = applyValueDateFloor(retrieved);
    const plan = await importRows(database, rows, { dryRun: options.dryRun, person });
    await finishImportRun(database, runId, {
      outcome: 'success',
      rowsRead: plan.rowsRead,
      rowsAlreadyStored: plan.rowsAlreadyStored,
      rowsWritten: plan.rowsWritten,
      rowsCategorised: plan.rowsCategorised,
      error: null,
    });

    // The record is final before the notification is attempted, and the
    // notification's outcome never changes the run's. A non-writing run has
    // nothing written, so the trigger rule skips it without a separate check.
    const notification = await notifyImport(options.notification ?? { token: null, user: null }, plan);
    if (notification.status === 'failed') {
      console.error(`import notification failed: ${notification.reason}`);
    }

    return { status: 'success', runId, plan, person };
  } catch (error) {
    const reason = redact(error instanceof Error ? error.message : String(error));
    const rowsRead = error instanceof ImportFailure ? error.rowsRead : 0;
    await finishImportRun(database, runId, {
      outcome: 'failed',
      rowsRead,
      rowsAlreadyStored: 0,
      rowsWritten: 0,
      rowsCategorised: 0,
      error: reason,
    }).catch(() => undefined);
    return { status: 'failed', runId, error: reason };
  }
}
