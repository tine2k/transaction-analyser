// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { personFromEnv, requirePersonFromEnv, syncSourceFromPayload } from '../../shared/easybank-sync';

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
  it('is absent when the variable is absent', () => {
    expect(personFromEnv({})).toBeNull();
  });

  it('is absent when the variable is empty or whitespace', () => {
    expect(personFromEnv({ EASYBANK_PERSON: '' })).toBeNull();
    expect(personFromEnv({ EASYBANK_PERSON: '   ' })).toBeNull();
  });

  it('uses the configured name with surrounding whitespace removed', () => {
    expect(personFromEnv({ EASYBANK_PERSON: '  Anna  ' })).toBe('Anna');
  });
});

describe('the required sync person', () => {
  it('returns the configured name', () => {
    expect(requirePersonFromEnv({ EASYBANK_PERSON: '  Anna  ' })).toBe('Anna');
  });

  it('refuses to choose a person when the variable is absent', () => {
    expect(() => requirePersonFromEnv({})).toThrow(/EASYBANK_PERSON is not set/);
  });

  it('refuses to choose a person when the variable is empty or whitespace', () => {
    expect(() => requirePersonFromEnv({ EASYBANK_PERSON: '' })).toThrow(/EASYBANK_PERSON is not set/);
    expect(() => requirePersonFromEnv({ EASYBANK_PERSON: '   ' })).toThrow(/EASYBANK_PERSON is not set/);
  });
});
