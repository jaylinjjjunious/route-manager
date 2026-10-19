import { beforeEach, expect, it, vi } from 'vitest';
import { trackFetchRequest, completeFetchRequest, failFetchRequest } from '../src/debug/apiDiagnostics';
import { addDebugRequest, addDebugError, getRequestLog, getErrorLog, clearAllDebugLogs, buildDiagnosticReport } from '../src/debug/debugStore';
import { safeDiagnosticText } from '../src/debug/sanitizeDiagnostics';
beforeEach(() => { clearAllDebugLogs(); vi.useRealTimers(); });
it('tracks the correct request after other debug entries, and captures HTML/auth/status', () => {
  addDebugRequest({ path: '/other', method: 'GET', status: null, startTime: 0, duration: null, success: false, errorCategory: '', authRequired: false, retryOccurred: false });
  const id = trackFetchRequest('/api/probation-check-ins?token=secret#private', 'POST', true);
  completeFetchRequest(id, 404, 312, 'text/html; charset=utf-8');
  const r = getRequestLog()[0];
  expect(r).toMatchObject({ id, status: 404, duration: 312, contentType: 'text/html', responseKind: 'html', authRequired: true, errorCategory: 'not-found' });
  expect(r.path).not.toMatch(/secret|private|token/);
  expect(getRequestLog()[1].status).toBeNull();
  expect(buildDiagnosticReport().failedRequests).toEqual(expect.arrayContaining([expect.objectContaining({ authAttached: true, contentType: 'text/html', method: 'POST' })]));
});
it('captures JSON and real elapsed time for a network failure', () => {
  vi.useFakeTimers();
  const id = trackFetchRequest('/api/test', 'GET', false);
  vi.advanceTimersByTime(120);
  failFetchRequest(id, new Error('Failed to fetch'));
  expect(getRequestLog()[0]).toMatchObject({ duration: 120, success: false });
  const next = trackFetchRequest('/api/test', 'GET', false);
  completeFetchRequest(next, 200, 10, 'application/json');
  expect(getRequestLog()[0].responseKind).toBe('json');
});
it('redacts credentials, query strings, proof data and email before storage or export', () => {
  const message = 'Bearer private-token password=private-password access_token=private-access sb_secret_private-secret data:image/png;base64,private-proof https://example.com/api?key=private-key#private-fragment owner@example.com';
  addDebugError({ message, category: 'app', source: 'test', pathname: '/app?secret=private-query', statusCode: null, retryable: false });
  const report = JSON.stringify(buildDiagnosticReport());
  expect(report).not.toMatch(/private-|owner@example/);
  expect(safeDiagnosticText('{"password":"private-password","proofDataUrl":"private-proof"}')).not.toMatch(/private-/);
  expect(safeDiagnosticText('eyJabc.eyJdef.signature')).toBe('[redacted]');
});
it('bounds history and clears only logs, retaining app/auth storage', () => {
  localStorage.setItem('aio_probation_check_ins_v1:owner', 'record');
  localStorage.setItem('sb-auth-token', 'session');
  for (let n=0; n<120; n++) {
    trackFetchRequest('/api/test', 'GET', false);
    addDebugError({ message: 'test', category: 'app', source: 'test', pathname: '/', statusCode: null, retryable: false });
  }
  expect(getRequestLog()).toHaveLength(50);
  expect(getErrorLog()).toHaveLength(100);
  clearAllDebugLogs();
  expect(getRequestLog()).toHaveLength(0);
  expect(getErrorLog()).toHaveLength(0);
  expect(localStorage.getItem('aio_probation_check_ins_v1:owner')).toBe('record');
  expect(localStorage.getItem('sb-auth-token')).toBe('session');
});
