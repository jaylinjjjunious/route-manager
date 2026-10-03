import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useProbationCheckIn, type ProbationCheckInState } from '../src/features/probation/useProbationCheckIn';
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), open: vi.fn(async () => {}) }));
vi.mock('../src/services/apiClient', () => ({ authFetchJson: mocks.fetch }));
vi.mock('../src/hooks/useExternalBrowser', () => ({ useExternalBrowser: () => ({ open: mocks.open }) }));
let state: ProbationCheckInState;
let root: Root;
const now = new Date('2026-10-02T12:00:00');
function Harness({ owner }: { owner: string }) { state = useProbationCheckIn(now, owner); return null; }
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  mocks.fetch.mockReset();
  mocks.fetch.mockResolvedValue({ records: [] });
  root = createRoot(document.createElement('div'));
});
afterEach(async () => { await act(async () => root.unmount()); });
it('loads account history at startup and isolates records when the account changes', async () => {
  mocks.fetch.mockResolvedValueOnce({ records: [{ owner_id: 'a', month_key: '2026-10', device: 'computer', completed_at: '2026-10-01T10:00:00Z', events: [], updated_at: '2026-10-01T10:00:00Z' }] });
  await act(async () => root.render(React.createElement(Harness, { owner: 'a' })));
  expect(state.completed).toBe(true);
  expect(state.record?.serverSynced).toBe(true);
  await act(async () => root.render(React.createElement(Harness, { owner: 'b' })));
  expect(state.record).toBeNull();
  expect(localStorage.getItem('aio_probation_check_ins_v1:b')).not.toContain('completedAt');
});
it('keeps failed saves pending and sends the expected account on retry', async () => {
  await act(async () => root.render(React.createElement(Harness, { owner: 'a' })));
  await act(async () => state.confirmCompleted());
  mocks.fetch.mockImplementation(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'POST') throw new Error('audit unavailable');
    return { records: [] };
  });
  await act(async () => state.syncToServer());
  expect(state.syncStatus.pendingSync).toBe(true);
  expect(state.syncStatus.lastError).toBe('audit unavailable');
  expect(state.record?.serverSynced).toBe(false);
  const post = mocks.fetch.mock.calls.find(call => call[1]?.method === 'POST');
  expect(JSON.parse(post![1].body).expectedOwnerId).toBe('a');
});

it('records an official-site launch and opens the correct provider without confirming completion', async () => {
  mocks.open.mockClear();
  await act(async () => root.render(React.createElement(Harness, { owner: 'a' })));
  await act(async () => state.openCeCheckIn());
  expect(mocks.open).toHaveBeenCalledTimes(1);
  expect(mocks.open).toHaveBeenCalledWith({ url: 'https://checkin.ce-connect.com/' });
  expect(state.record?.events.filter(e => e.type === 'opened_ce')).toHaveLength(1);
  expect(state.completed).toBe(false);
});
