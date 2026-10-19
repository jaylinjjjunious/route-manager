import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useProbationCheckIn, type ProbationCheckInState } from '../src/features/probation/useProbationCheckIn';
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), open: vi.fn(async () => {}), resize: vi.fn() }));
vi.mock('../src/services/apiClient', () => ({ authFetchJson: mocks.fetch }));
vi.mock('../src/hooks/useExternalBrowser', () => ({ useExternalBrowser: () => ({ open: mocks.open }) }));
vi.mock('../src/features/showerGate/showerGateService', () => ({ resizeProofImage: mocks.resize }));
let state: ProbationCheckInState;
let root: Root;
const now = new Date('2026-10-02T12:00:00');
function Harness({ owner }: { owner: string }) { state = useProbationCheckIn(now, owner); return null; }
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  mocks.fetch.mockReset();
  mocks.fetch.mockResolvedValue({ records: [] });
  mocks.resize.mockReset();
  root = createRoot(document.createElement('div'));
});
afterEach(async () => { await act(async () => root.unmount()); vi.useRealTimers(); vi.restoreAllMocks(); });

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function saved(sent: any, owner = 'a') {
  return { owner_id: owner, month_key: sent.monthKey, started_at: sent.startedAt,
    completed_at: sent.completedAt, device: sent.device, events: sent.events,
    updated_at: new Date().toISOString() };
}

it('automatically saves edits made while an older save is still in flight', async () => {
  vi.useFakeTimers();
  await act(async () => root.render(React.createElement(Harness, { owner: 'a' })));
  await act(async () => state.openCeCheckIn());
  const first = deferred<{ record: ReturnType<typeof saved> }>();
  let firstSent: any;
  let posts = 0;
  mocks.fetch.mockImplementation(async (_url: string, init?: RequestInit) => {
    if (init?.method !== 'POST') return { records: [] };
    const sent = JSON.parse(init.body as string);
    if (++posts === 1) { firstSent = sent; return first.promise; }
    return { record: saved(sent) };
  });
  let sync!: Promise<void>;
  await act(async () => { sync = state.syncToServer(); });
  expect(posts).toBe(1);
  await act(async () => state.confirmCompleted());
  await act(async () => vi.advanceTimersByTimeAsync(800));
  expect(posts).toBe(1);
  await act(async () => { first.resolve({ record: saved(firstSent) }); await sync; });
  await act(async () => vi.advanceTimersByTimeAsync(800));
  expect(posts).toBe(2);
  expect(state.completed).toBe(true);
  expect(state.pendingRecordCount).toBe(0);
  expect(state.syncStatus.pendingSync).toBe(false);
});

it('ignores a late account A load after switching to account B', async () => {
  const first = deferred<{ records: any[] }>();
  mocks.fetch.mockResolvedValue({ records: [] }).mockImplementationOnce(() => first.promise);
  await act(async () => root.render(React.createElement(Harness, { owner: 'a' })));
  await act(async () => root.render(React.createElement(Harness, { owner: 'b' })));
  await act(async () => first.resolve({ records: [saved({ monthKey: '2026-10', device: 'computer', completedAt: '2026-10-01T10:00:00Z', events: [] })] }));
  expect(state.record).toBeNull();
  expect(localStorage.getItem('aio_probation_check_ins_v1:b')).toBe('[]');
});

it('ignores a late save acknowledgment after switching accounts', async () => {
  await act(async () => root.render(React.createElement(Harness, { owner: 'a' })));
  await act(async () => state.openCeCheckIn());
  const first = deferred<{ record: ReturnType<typeof saved> }>();
  let sent: any;
  mocks.fetch.mockImplementation(async (_url: string, init?: RequestInit) => {
    if (init?.method !== 'POST') return { records: [] };
    sent = JSON.parse(init.body as string); return first.promise;
  });
  let sync!: Promise<void>;
  await act(async () => { sync = state.syncToServer(); });
  await act(async () => root.render(React.createElement(Harness, { owner: 'b' })));
  await act(async () => { first.resolve({ record: saved(sent) }); await sync; });
  expect(state.record).toBeNull();
  expect(state.pendingRecordCount).toBe(0);
  expect(localStorage.getItem('aio_probation_check_ins_v1:b')).toBe('[]');
});

it('discards a pending proof when the account leaves and returns before image processing finishes', async () => {
  const image = deferred<string>(); mocks.resize.mockReturnValue(image.promise);
  await act(async () => root.render(React.createElement(Harness, { owner: 'a' })));
  let attach!: Promise<void>;
  await act(async () => { attach = state.attachProof(new File(['test'], 'proof.jpg', { type: 'image/jpeg' })); });
  await act(async () => root.render(React.createElement(Harness, { owner: 'b' })));
  await act(async () => root.render(React.createElement(Harness, { owner: 'a' })));
  await act(async () => { image.resolve('data:image/jpeg;base64,dGVzdA=='); await attach; });
  expect(state.record).toBeNull();
  expect(state.pendingRecordCount).toBe(0);
});

it('does not show an old account image-processing error in the next account', async () => {
  const image = deferred<string>(); mocks.resize.mockReturnValue(image.promise);
  await act(async () => root.render(React.createElement(Harness, { owner: 'a' })));
  let attach!: Promise<void>;
  await act(async () => { attach = state.attachProof(new File(['test'], 'proof.jpg')); });
  await act(async () => root.render(React.createElement(Harness, { owner: 'b' })));
  await act(async () => { image.reject(new Error('old account proof failed')); await attach; });
  expect(state.error).toBe('');
});

it('cancels the old account request when switching owners', async () => {
  const first = deferred<{ records: any[] }>();
  let signal: AbortSignal | undefined;
  mocks.fetch.mockImplementationOnce((_url: string, init?: RequestInit) => { signal = init?.signal as AbortSignal; return first.promise; });
  await act(async () => root.render(React.createElement(Harness, { owner: 'a' })));
  await act(async () => root.render(React.createElement(Harness, { owner: 'b' })));
  expect(signal?.aborted).toBe(true);
  await act(async () => first.resolve({ records: [] }));
});

it('cancels pending synchronization when the authenticated app unmounts', async () => {
  const first = deferred<{ records: any[] }>();
  let signal: AbortSignal | undefined;
  mocks.fetch.mockImplementationOnce((_url: string, init?: RequestInit) => { signal = init?.signal as AbortSignal; return first.promise; });
  await act(async () => root.render(React.createElement(Harness, { owner: 'a' })));
  await act(async () => root.unmount());
  expect(signal?.aborted).toBe(true);
  await act(async () => first.resolve({ records: [] }));
});

it('stops screen-sharing tracks when video preparation fails', async () => {
  const stop = vi.fn();
  const original = navigator.mediaDevices.getDisplayMedia;
  Object.defineProperty(navigator.mediaDevices, 'getDisplayMedia', { configurable: true, value: vi.fn(async () => ({ getTracks: () => [{ stop }] })) });
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(new Error('video failed'));
  try {
    await act(async () => root.render(React.createElement(Harness, { owner: 'a' })));
    await act(async () => state.captureComputerProof());
    expect(stop).toHaveBeenCalled();
    expect(state.record).toBeNull();
    expect(state.error).toContain('could not capture');
  } finally { Object.defineProperty(navigator.mediaDevices, 'getDisplayMedia', { configurable: true, value: original }); }
});

it('stops a late screen-sharing stream without using it after an account switch', async () => {
  const capture = deferred<MediaStream>();
  const stop = vi.fn();
  const original = navigator.mediaDevices.getDisplayMedia;
  Object.defineProperty(navigator.mediaDevices, 'getDisplayMedia', { configurable: true, value: vi.fn(() => capture.promise) });
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  try {
    await act(async () => root.render(React.createElement(Harness, { owner: 'a' })));
    let pending!: Promise<void>;
    await act(async () => { pending = state.captureComputerProof(); });
    await act(async () => root.render(React.createElement(Harness, { owner: 'b' })));
    await act(async () => { capture.resolve({ getTracks: () => [{ stop }] } as unknown as MediaStream); await pending; });
    expect(stop).toHaveBeenCalled();
    expect(play).not.toHaveBeenCalled();
    expect(state.record).toBeNull();
    expect(state.error).toBe('');
  } finally { Object.defineProperty(navigator.mediaDevices, 'getDisplayMedia', { configurable: true, value: original }); }
});
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

it('acknowledges a saved launch without leaving a stale pending status', async () => {
  await act(async () => root.render(React.createElement(Harness, { owner: 'a' })));
  await act(async () => state.openCeCheckIn());
  expect(state.pendingRecordCount).toBe(1);
  mocks.fetch.mockImplementation(async (_url: string, init?: RequestInit) => {
    if (init?.method !== 'POST') return { records: [] };
    const sent = JSON.parse(init.body as string);
    return { record: { owner_id: 'a', month_key: sent.monthKey, started_at: sent.startedAt, device: sent.device, events: sent.events, updated_at: new Date().toISOString() } };
  });
  await act(async () => state.syncToServer());
  expect(state.pendingRecordCount).toBe(0);
  expect(state.syncStatus.pendingSync).toBe(false);
  expect(state.syncStatus.lastSyncedAt).toBeTruthy();
  expect(state.completed).toBe(false);
});
