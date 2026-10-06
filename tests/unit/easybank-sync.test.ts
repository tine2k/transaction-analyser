// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { syncSourceFromPayload } from '../../shared/easybank-sync';

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
