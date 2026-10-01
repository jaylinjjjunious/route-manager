import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { useBlueAiRecords } from '../src/features/jobs/useBlueAiRecords';

const api = vi.hoisted(() => ({ authFetchJson: vi.fn() }));
vi.mock('../src/services/apiClient', () => api);
let root: ReturnType<typeof createRoot>;
let container: HTMLDivElement;
let feed: ReturnType<typeof useBlueAiRecords>;
const received = { enabled: true, assigned: [{ externalId: 'BLUEAI-TEST-001' }], available: [{ externalId: 'BLUEAI-TEST-002' }] };

function Harness({ ownerId }: { ownerId?: string }) {
  feed = useBlueAiRecords(ownerId);
  return React.createElement('div', {}, feed.message, ...feed.assigned.map(r => r.externalId), ...feed.available.map(r => r.externalId));
}
async function mount(ownerId?: string) {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  api.authFetchJson.mockReset();
  container = document.createElement('div');
  root = createRoot(container);
  await act(async () => { root.render(React.createElement(Harness, { ownerId })); });
}
afterEach(() => { act(() => root?.unmount()); vi.useRealTimers(); });

it('retries a disabled feed and displays both categories when enabled', async () => {
  await mount();
  api.authFetchJson.mockResolvedValueOnce({ enabled: false, reason: 'account_mismatch', assigned: [], available: [] }).mockResolvedValue(received);
  await act(async () => { root.render(React.createElement(Harness, { ownerId: 'owner-a' })); });
  expect(feed.message).toContain('different account');
  await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
  expect(container.textContent).toContain('BLUEAI-TEST-001');
  expect(container.textContent).toContain('BLUEAI-TEST-002');
  expect(api.authFetchJson).toHaveBeenCalledTimes(2);
});

it('clears prior account records immediately and ignores its late response', async () => {
  await mount();
  let finish: (value: unknown) => void;
  api.authFetchJson.mockResolvedValueOnce(received).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await act(async () => { root.render(React.createElement(Harness, { ownerId: 'owner-a' })); });
  await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
  api.authFetchJson.mockResolvedValue({ enabled: true, assigned: [], available: [] });
  await act(async () => { root.render(React.createElement(Harness, { ownerId: 'owner-b' })); });
  expect(feed.assigned).toEqual([]);
  await act(async () => { finish!(received); });
  expect(feed.assigned).toEqual([]);
  await act(async () => { root.render(React.createElement(Harness, {})); });
  expect(feed.message).toContain('Sign in');
  expect(feed.available).toEqual([]);
});

it('shows failures without losing same-account records and recovers on focus', async () => {
  await mount();
  api.authFetchJson.mockResolvedValueOnce(received).mockRejectedValueOnce(new Error('offline')).mockResolvedValue(received);
  await act(async () => { root.render(React.createElement(Harness, { ownerId: 'owner-a' })); });
  await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
  expect(feed.message).toContain('Unable to refresh');
  expect(feed.assigned).toHaveLength(1);
  await act(async () => { window.dispatchEvent(new Event('focus')); });
  expect(feed.message).toBe('BlueAI records synced.');
});
