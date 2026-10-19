import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import DiagnosticsPage from '../src/features/diagnostics/DiagnosticsPage';
import { DebugProvider } from '../src/debug/DebugProvider';
import { trackFetchRequest, completeFetchRequest } from '../src/debug/apiDiagnostics';
import { clearAllDebugLogs } from '../src/debug/debugStore';
const auth = vi.hoisted(() => ({ user: { id: 'owner-private-id' }, session: { access_token: 'private-token', expires_at: 1900000000 }, isAdmin: true }));
vi.mock('../src/auth/AuthProvider', () => ({ useAuth: () => auth }));
let root: Root;
let container: HTMLDivElement;
const retry = vi.fn(async () => {});
const state = { monthKey:'2026-10', phase:'early_action', locked:false, completed:false, device:'phone', record:null, error:'', syncStatus:{pendingSync:true,lastError:'password=private-password'}, pendingRecordCount:2, syncToServer:retry };
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  clearAllDebugLogs(); retry.mockClear();
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok:true, json:async () => ({commitSha:'abc123',version:'1'}) })));
  container = document.createElement('div'); document.body.append(container); root=createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
async function render() { await act(async () => root.render(React.createElement(DebugProvider, null, React.createElement(DiagnosticsPage, { onBack:vi.fn(), probation:state as any })))); }
async function click(label:string) { const button=[...container.querySelectorAll('button')].find(b=>b.textContent===label)!; await act(async () => button.click()); }
it('uses the existing sync callback and safely copies request/sync/auth/system evidence', async () => {
  const clipboard=vi.fn(async (_text:string)=>{});
  Object.defineProperty(navigator,'clipboard',{ configurable:true,value:{writeText:clipboard} });
  const id=trackFetchRequest('/api/probation-check-ins?key=private-key','POST',true);
  completeFetchRequest(id,404,25,'text/html');
  await render();
  expect(container.textContent).toContain('text/html');
  await click('Sync'); expect(container.textContent).toContain('pendingRecords2');
  await click('Retry account sync'); expect(retry).toHaveBeenCalledTimes(1);
  await click('Copy Diagnostics');
  const report=clipboard.mock.calls[0][0];
  expect(report).toContain('serverCommit'); expect(report).toContain('text/html');
  expect(report).not.toMatch(/private-|owner-private-id/);
  expect(JSON.parse(report).auth.tokenPresent).toBe(true);
  await click('System'); expect(container.textContent).toContain('abc123');
  await click('Clear Logs'); await click('API'); expect(container.textContent).toContain('No requests recorded');
});
