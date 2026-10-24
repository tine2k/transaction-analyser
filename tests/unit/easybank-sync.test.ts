// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { personFromEnv, syncSourceFromPayload } from '../../shared/easybank-sync';

describe('sync source from a task payload', () => {
  it('records a run the imports screen started as the ui source', () => {
    expect(syncSourceFromPayload({ source: 'ui' })).toBe('ui');
  });

  it('records the scheduled run when the schedule passes no source', () => {
    expect(syncSourceFromPayload({})).toBe('scheduled');
  });

  it('records an unknown source as scheduled', () => {
    expect(syncSourceFromPayload({ source: 'something-else' })).toBe('scheduled');
  });
});

describe('the configured sync person', () => {
  it('defaults to Default when the variable is absent', () => {
    expect(personFromEnv({})).toBe('Default');
  });

  it('defaults to Default when the variable is empty or whitespace', () => {
    expect(personFromEnv({ EASYBANK_PERSON: '' })).toBe('Default');
    expect(personFromEnv({ EASYBANK_PERSON: '   ' })).toBe('Default');
  });

  it('uses the configured name with surrounding whitespace removed', () => {
    expect(personFromEnv({ EASYBANK_PERSON: '  Anna  ' })).toBe('Anna');
  });
});
