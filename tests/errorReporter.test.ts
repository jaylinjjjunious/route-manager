import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
    },
  },
}));

import { isErrorReportingEnabled, setErrorReportingEnabled, reportError, initErrorReporting, sendTestError } from '../src/services/errorReporter';

describe('errorReporter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setErrorReportingEnabled(true);
  });

  it('exposes the reporting toggle and respects opt-out', () => {
    setErrorReportingEnabled(false);
    expect(isErrorReportingEnabled()).toBe(false);
    setErrorReportingEnabled(true);
    expect(isErrorReportingEnabled()).toBe(true);
  });

  it('exports the init, report, and test helpers used by the app', () => {
    expect(typeof initErrorReporting).toBe('function');
    expect(typeof reportError).toBe('function');
    expect(typeof sendTestError).toBe('function');
  });

  it('does not throw when invoked outside a full browser context', () => {
    expect(() => reportError({ message: '', category: 'test' })).not.toThrow();
    expect(() => reportError({ message: 'boom', category: 'test' })).not.toThrow();
    expect(() => initErrorReporting()).not.toThrow();
  });
});
