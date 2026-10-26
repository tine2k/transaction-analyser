// The imports endpoint writes UTC instants in a fixed form and stores fixed
// outcome values, so both screens render them without a locale-dependent Date
// parse. Shared by the import log and the manage hub so the two cannot drift.

export function displayImportTime(value: string | null): string {
  if (value === null) {
    return '—';
  }
  return value.replace('T', ' ').replace('Z', ' UTC');
}

export function importOutcomeLabel(outcome: string): string {
  if (outcome === 'in_progress') {
    return 'In progress';
  }
  if (outcome === 'success') {
    return 'Success';
  }
  if (outcome === 'failed') {
    return 'Failed';
  }
  return outcome;
}
